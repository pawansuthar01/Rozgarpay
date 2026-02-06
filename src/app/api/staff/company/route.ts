import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get staff's company with selective fields
    const staff = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        company: {
          select: {
            name: true,
            shiftEndTime: true,
            shiftStartTime: true,
            minWorkingHours: true,
            maxDailyHours: true,
          },
        },
      },
    });

    if (!staff?.company) {
      return NextResponse.json(
        { error: "Staff company not found" },
        { status: 400 },
      );
    }

    const response = NextResponse.json({
      company: staff.company,
    });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=30",
    );
    return response;
  } catch (error) {
    console.error("Company fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
