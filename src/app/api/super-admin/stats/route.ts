import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { PrismaClientInitializationError } from "@prisma/client/runtime/library";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalAdmins,
      activeAdmins,
      suspendedAdmins,
      deactivatedAdmins,
      totalUsers,
      totalAttendance,
      totalSalaries,
      totalReports,
      recentCompanies,
      recentUsers,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { status: "ACTIVE" } }),
      prisma.company.count({ where: { status: "SUSPENDED" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } }),
      prisma.user.count({ where: { role: "ADMIN", status: "SUSPENDED" } }),
      prisma.user.count({ where: { role: "ADMIN", status: "DEACTIVATED" } }),
      prisma.user.count(),
      prisma.attendance.count(),
      prisma.salary.count(),
      prisma.report.count(),
      prisma.company.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, createdAt: true, status: true },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          status: true,
        },
      }),
    ]);

    return NextResponse.json({
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalAdmins,
      activeAdmins,
      suspendedAdmins,
      deactivatedAdmins,
      totalUsers,
      totalAttendance,
      totalSalaries,
      totalReports,
      systemHealth: "OK",
      recentCompanies,
      recentUsers,
    });
  } catch (error) {
    console.error(error);

    // Handle database connection errors gracefully
    if (error instanceof PrismaClientInitializationError) {
      return NextResponse.json(
        {
          totalCompanies: 0,
          activeCompanies: 0,
          suspendedCompanies: 0,
          totalAdmins: 0,
          activeAdmins: 0,
          suspendedAdmins: 0,
          deactivatedAdmins: 0,
          totalUsers: 0,
          totalAttendance: 0,
          totalSalaries: 0,
          totalReports: 0,
          systemHealth: "DB_UNAVAILABLE",
          recentCompanies: [],
          recentUsers: [],
          error: "Database connection failed",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
