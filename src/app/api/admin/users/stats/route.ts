import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Cache for 5 minutes (user stats don't change frequently)
const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get admin's company with minimal fields
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!admin?.companyId) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    const companyId = admin.companyId;

    // PARALLEL QUERIES: Run all count queries concurrently
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      deactivatedUsers,
      roleStats,
    ] = await Promise.all([
      // Total users
      prisma.user.count({
        where: { companyId },
      }),

      // Active users
      prisma.user.count({
        where: {
          companyId,
          status: "ACTIVE",
        },
      }),

      // Suspended users
      prisma.user.count({
        where: {
          companyId,
          status: "SUSPENDED",
        },
      }),

      // Deactivated users
      prisma.user.count({
        where: {
          companyId,
          status: "DEACTIVATED",
        },
      }),

      // Role distribution
      prisma.user.groupBy({
        by: ["role"],
        where: { companyId },
        _count: true,
      }),
    ]);

    // Process role distribution
    const roleDistribution = {
      ADMIN: 0,
      MANAGER: 0,
      ACCOUNTANT: 0,
      STAFF: 0,
    };

    for (const stat of roleStats) {
      if (stat.role in roleDistribution) {
        roleDistribution[stat.role as keyof typeof roleDistribution] =
          stat._count;
      }
    }

    const response = NextResponse.json({
      totalUsers,
      activeUsers,
      suspendedUsers,
      deactivatedUsers,
      roleDistribution,
    });

    response.headers.set("Cache-Control", CACHE_CONTROL);
    return response;
  } catch (error) {
    console.error("Users stats fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
