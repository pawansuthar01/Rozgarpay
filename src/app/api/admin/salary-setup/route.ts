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

    if (!Array.isArray(staffUpdates)) {
      return NextResponse.json(
        { error: "staffUpdates must be an array" },
        { status: 400 },
      );
    }

    // Process updates
    const results = await Promise.all(
      staffUpdates.map(async (update) => {
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

        if (!userId) {
          throw new Error("userId is required");
        }

        // Get user info before update
        const userBefore = await prisma.user.findFirst({
          where: {
            id: userId,
            companyId,
            role: { in: ["STAFF", "MANAGER"] },
          },
          select: {
            salarySetupDone: true,
            firstName: true,
            lastName: true,
          },
        });

        if (!userBefore) {
          throw new Error(`User ${userId} not found or unauthorized`);
        }

        const isFirstTimeSetup = userBefore.salarySetupDone !== true;

        // Update user
        await prisma.user.update({
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
        });

        return { userId, isFirstTimeSetup };
      }),
    );

    // Fire-and-forget notifications
    for (const result of results) {
      if (result.isFirstTimeSetup) {
        // Send notification asynchronously
        prisma.notification
          .create({
            data: {
              userId: result.userId,
              companyId,
              title: "Salary Setup Complete",
              message:
                "Your salary configuration has been set up by the admin.",
              channel: "IN_APP",
              status: "PENDING",
            },
          })
          .catch(console.error);
      }
    }

    return NextResponse.json({
      message: "Salary configurations updated successfully",
      updated: results.length,
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
