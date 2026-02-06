import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getDate } from "@/lib/attendanceUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const companyId = session.user.companyId;

    if (!companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    // Get user info with company - single fast query
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        company: {
          select: {
            name: true,
          },
        },
        salarySetupDone: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const dashboardData = {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.company?.name,
      },
      salarySetup: {
        isConfigured: user.salarySetupDone,
      },
      notifications: [], // Notifications loaded separately for faster initial load
    };

    const response = NextResponse.json(dashboardData);

    // Cache for 10 seconds
    response.headers.set("Cache-Control", "public, s-maxage=10");

    return response;
  } catch (error) {
    console.error("Staff dashboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
