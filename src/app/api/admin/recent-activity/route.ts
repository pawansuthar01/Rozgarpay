import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// Enable caching with stale-while-revalidate
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    /* ───────────────────────
       1️⃣ AUTH CHECK
    ─────────────────────── */
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ───────────────────────
       2️⃣ GET COMPANY
    ─────────────────────── */
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        companyId: true,
      },
    });

    if (!admin?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    const companyId = admin.companyId;

    /* ───────────────────────
       3️⃣ FETCH RECENT ACTIVITY (Top 10)
    ─────────────────────── */
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        user: { companyId },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    /* ───────────────────────
       4️⃣ TRANSFORM RESPONSE
    ─────────────────────── */
    const logs = recentActivity.map((log) => ({
      id: log.id,
      action: log.action,
      user:
        `${log.user.firstName || ""} ${log.user.lastName || ""}`.trim() ||
        log.user.email,
      timestamp: log.createdAt.toISOString(),
      entity: log.entity,
    }));

    /* ───────────────────────
       5️⃣ RESPONSE with Caching Headers
    ─────────────────────── */
    const response = NextResponse.json({
      logs,
    });

    // Cache for 30 seconds, stale-while-revalidate for 2 minutes
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=120",
    );

    return response;
  } catch (error) {
    console.error("Recent activity API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
