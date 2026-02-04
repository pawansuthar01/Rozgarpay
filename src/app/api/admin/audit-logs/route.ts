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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const skip = (page - 1) * limit;

    // Get audit logs for the current admin's company
    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          user: {
            companyId: session.user.companyId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({
        where: {
          user: {
            companyId: session.user.companyId,
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Transform the data to match the expected format
    const logs = auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      user:
        `${log.user.firstName || ""} ${log.user.lastName || ""}`.trim() ||
        log.user.email,
      timestamp: log.createdAt.toISOString(),
      entity: log.entity,
      entityId: log.entityId,
      details: log.meta,
    }));

    const response = NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });

    // Cache for 2 minutes, stale-while-revalidate for 10 minutes
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=600",
    );

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
