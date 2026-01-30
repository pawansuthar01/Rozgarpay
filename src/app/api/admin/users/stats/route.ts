import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    // Get user statistics
    const totalUsers = await prisma.user.count({
      where: { companyId: admin.company.id },
    });

    const activeUsers = await prisma.user.count({
      where: {
        companyId: admin.company.id,
        status: "ACTIVE",
      },
    });

    const suspendedUsers = await prisma.user.count({
      where: {
        companyId: admin.company.id,
        status: "SUSPENDED",
      },
    });

    const deactivatedUsers = await prisma.user.count({
      where: {
        companyId: admin.company.id,
        status: "DEACTIVATED",
      },
    });

    // Get role distribution
    const roleStats = await prisma.user.groupBy({
      by: ["role"],
      where: { companyId: admin.company.id },
      _count: true,
    });

    const roleDistribution = roleStats.reduce(
      (acc, stat) => {
        acc[stat.role] = stat._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Ensure all roles are present
    const allRoles = ["ADMIN", "MANAGER", "ACCOUNTANT", "STAFF"];
    allRoles.forEach((role) => {
      if (!(role in roleDistribution)) {
        roleDistribution[role] = 0;
      }
    });

    return NextResponse.json({
      totalUsers,
      activeUsers,
      suspendedUsers,
      deactivatedUsers,
      roleDistribution,
    });
  } catch (error) {
    console.error("Users stats fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
