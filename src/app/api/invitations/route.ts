import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    // 1️⃣ Auth check
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !session.user ||
      !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ Query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.max(parseInt(searchParams.get("limit") || "10"), 1);
    const status = searchParams.get("status"); // pending | completed | expired
    const role = searchParams.get("role");
    const search = searchParams.get("search");
    const isAdmin = session.user.role == "ADMIN" ? true : false;
    // 3️⃣ Get admin with company
    let admin: any;
    if (isAdmin) {
      admin = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          companyId: true,
          company: { select: { id: true } },
        },
      });

      if (!admin?.companyId) {
        return NextResponse.json(
          { error: "Admin company not found" },
          { status: 400 },
        );
      }
    }
    // 4️⃣ Build WHERE clause (IMPORTANT PART)
    let where: Prisma.CompanyInvitationWhereInput = {};
    if (isAdmin) {
      where.companyId = admin?.companyId;
    } else {
      where.role = "ADMIN";
    }

    // Status filter
    if (status === "pending") {
      where.isUsed = false;
      where.expiresAt = { gt: getDate(new Date()) };
    }

    if (status === "completed") {
      where.isUsed = true;
    }

    if (status === "expired") {
      where.isUsed = false;
      where.expiresAt = { lt: getDate(new Date()) };
    }

    // Role filter
    if (role) {
      where.role = role as any;
    }

    // Search filter (email + phone)
    if (search) {
      where.OR = [
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          phone: {
            contains: search,
          },
        },
      ];
    }

    // 5️⃣ Pagination data
    const [total, invitations] = await Promise.all([
      prisma.companyInvitation.count({ where }),
      prisma.companyInvitation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // 6️⃣ Stats (company scoped)
    const [
      totalInvitations,
      pendingInvitations,
      completedInvitations,
      expiredInvitations,
      roleStats,
    ] = await Promise.all([
      prisma.companyInvitation.count({
        where: { companyId: admin.companyId },
      }),
      prisma.companyInvitation.count({
        where: {
          companyId: admin.companyId,
          isUsed: false,
          expiresAt: { gt: getDate(new Date()) },
        },
      }),
      prisma.companyInvitation.count({
        where: {
          companyId: admin.companyId,
          isUsed: true,
        },
      }),
      prisma.companyInvitation.count({
        where: {
          companyId: admin.companyId,
          isUsed: false,
          expiresAt: { lt: getDate(new Date()) },
        },
      }),
      prisma.companyInvitation.groupBy({
        by: ["role"],
        where: { companyId: admin.companyId },
        _count: { _all: true },
      }),
    ]);

    // 7️⃣ Response
    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        phone: inv.phone,
        token: inv.token,
        role: inv.role,
        isUsed: inv.isUsed,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        status: inv.isUsed
          ? "completed"
          : getDate(new Date()) > inv.expiresAt
            ? "expired"
            : "pending",
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: totalInvitations,
        pending: pendingInvitations,
        completed: completedInvitations,
        expired: expiredInvitations,
        roleDistribution: roleStats.reduce(
          (acc, stat) => {
            acc[stat.role] = stat._count._all;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
    });
  } catch (error) {
    console.error("Invitations fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
