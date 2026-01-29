import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "MANAGER") {
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    // Get staff count for pagination
    const totalCount = await prisma.user.count({
      where: {
        companyId,
        role: { in: ["STAFF", "ACCOUNTANT"] },
        status: "ACTIVE",
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
    });

    // Get paginated staff with their salary configurations
    const staff = await prisma.user.findMany({
      where: {
        companyId,
        role: { in: ["STAFF", "ACCOUNTANT"] },
        status: "ACTIVE",
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
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
      orderBy: {
        firstName: "asc",
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      staff,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Manager salary setup GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "MANAGER") {
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

    // Validate and update salary configurations
    const updatePromises = staffUpdates.map(async (update: any) => {
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
        throw new Error("userId is required for each update");
      }

      // Verify the user belongs to the manager's company
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          companyId,
          role: { in: ["STAFF", "ACCOUNTANT"] },
        },
      });

      if (!user) {
        throw new Error(`User ${userId} not found or not authorized`);
      }

      return prisma.user.update({
        where: { id: userId },
        data: {
          baseSalary: baseSalary ? parseFloat(baseSalary) : null,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
          dailyRate: dailyRate ? parseFloat(dailyRate) : null,
          salaryType: salaryType || "MONTHLY",
          workingDays: workingDays ? parseInt(workingDays) : 26,
          overtimeRate: overtimeRate ? parseFloat(overtimeRate) : null,
          pfEsiApplicable:
            pfEsiApplicable !== undefined ? Boolean(pfEsiApplicable) : true,
          joiningDate: joiningDate
            ? new Date(joiningDate)
            : user.joiningDate || user.createdAt,
        },
      });
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      message: "Salary configurations updated successfully",
    });
  } catch (error) {
    console.error("Manager salary setup POST error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
