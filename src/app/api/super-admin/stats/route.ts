import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";

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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
