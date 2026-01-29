import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get staff's company
    const staff = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
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

    return NextResponse.json({
      company: staff.company,
    });
  } catch (error) {
    console.error("Company fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
