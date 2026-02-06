import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Cache for 2 minutes
const CACHE_CONTROL = "public, s-maxage=120, stale-while-revalidate=300";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json(
        { error: "No company assigned" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    let limit = Math.max(
      1,
      Math.min(parseInt(searchParams.get("limit") || "10") || 10, 100),
    );
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      companyId,
      role: { in: ["STAFF", "ACCOUNTANT", "MANAGER"] },
      status: "ACTIVE",
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // PARALLEL QUERIES: Run count and data queries concurrently
    const [totalCount, staff] = await Promise.all([
      // Total count
      prisma.user.count({ where }),

      // Get paginated staff with selective fields
      prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          baseSalary: true,
          hourlyRate: true,
          dailyRate: true,
          salaryType: true,
          workingDays: true,
          overtimeRate: true,
          pfEsiApplicable: true,
          joiningDate: true,
          createdAt: true,
        },
        orderBy: [{ role: "asc" }, { firstName: "asc" }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const response = NextResponse.json({
      staff,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });

    response.headers.set("Cache-Control", CACHE_CONTROL);
    return response;
  } catch (error) {
    console.error("Admin salary setup GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json(
        { error: "No company assigned" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { staffUpdates } = body;

    if (!Array.isArray(staffUpdates) || staffUpdates.length === 0) {
      return NextResponse.json(
        { error: "staffUpdates must be a non-empty array" },
        { status: 400 },
      );
    }

    const userIds = staffUpdates.map((u) => u.userId);

    // BATCH QUERY: Get all user info in a single query instead of N+1 queries
    const usersBefore = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        companyId,
        role: { in: ["STAFF", "MANAGER"] },
      },
      select: {
        id: true,
        salarySetupDone: true,
        firstName: true,
        lastName: true,
      },
    });

    const userMap = new Map(usersBefore.map((u) => [u.id, u]));

    // Validate all users exist
    const invalidUsers = userIds.filter((id) => !userMap.has(id));
    if (invalidUsers.length > 0) {
      return NextResponse.json(
        { error: `Users not found: ${invalidUsers.join(", ")}` },
        { status: 400 },
      );
    }

    // Prepare update operations
    const updateOperations = staffUpdates.map((update) => {
      const {
        userId,
        baseSalary,
        hourlyRate,
        dailyRate,
        salaryType,
        workingDays,
        overtimeRate,
        pfEsiApplicable,
        joiningDate,
      } = update;

      const userBefore = userMap.get(userId);
      if (!userBefore) {
        throw new Error(`User ${userId} not found`);
      }

      return {
        where: { id: userId },
        data: {
          salarySetupDone: true,
          baseSalary: baseSalary ? parseFloat(baseSalary) : null,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
          dailyRate: dailyRate ? parseFloat(dailyRate) : null,
          salaryType: salaryType || "MONTHLY",
          workingDays: workingDays ? parseInt(workingDays) : 26,
          overtimeRate: overtimeRate ? parseFloat(overtimeRate) : null,
          pfEsiApplicable:
            pfEsiApplicable !== undefined ? Boolean(pfEsiApplicable) : true,
          joiningDate: joiningDate ? new Date(joiningDate) : undefined,
        },
      };
    });

    // BATCH UPDATE: Use transaction for atomic operations
    await prisma.$transaction(
      updateOperations.map((op) => prisma.user.update(op)),
    );

    // BATCH CREATE: Create all notifications in one query
    const notificationCreates = usersBefore
      .filter((u) => u.salarySetupDone !== true)
      .map((user) => ({
        userId: user.id,
        companyId,
        title: "Salary Setup Complete",
        message: "Your salary configuration has been set up by the admin.",
        channel: "IN_APP" as const,
        status: "PENDING" as const,
      }));

    if (notificationCreates.length > 0) {
      await prisma.notification.createMany({ data: notificationCreates });
    }

    return NextResponse.json({
      message: "Salary configurations updated successfully",
      updated: staffUpdates.length,
    });
  } catch (error) {
    console.error("Admin salary setup POST error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
