import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { notificationManager } from "@/lib/notifications/manager";

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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    // Get staff count for pagination
    const totalCount = await prisma.user.count({
      where: {
        companyId,
        role: { in: ["STAFF", "ACCOUNTANT", "MANAGER"] },
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
        role: { in: ["STAFF", "ACCOUNTANT", "MANAGER"] },
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

    for (const update of staffUpdates) {
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

      /* ========= FETCH USER (BEFORE) ========= */
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
          phone: true,
          company: { select: { name: true } },
        },
      });

      if (!userBefore) {
        throw new Error(`User ${userId} not found or unauthorized`);
      }

      const isFirstTimeSetup = userBefore.salarySetupDone !== true;

      /* ========= UPDATE USER ========= */
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

      /* ========= 🔔 SEND NOTIFICATION (NO WAIT) ========= */
      if (isFirstTimeSetup) {
        const staffName =
          `${userBefore.firstName ?? ""} ${userBefore.lastName ?? ""}`.trim();

        // 🔥 fire-and-forget
        notificationManager.sendNotification({
          userId,
          type: "salary_setup_done",
          data: {
            staffName,
            companyName: userBefore.company?.name || "Company",
            phone: userBefore.phone,
            effectiveDate: new Date().toDateString(),
          },
          channels: ["whatsapp", "in_app"],
          priority: "medium",
        });
      }
    }

    return NextResponse.json({
      message: "Salary configurations updated successfully",
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
