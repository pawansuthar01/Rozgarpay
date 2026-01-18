import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../../auth/[...nextauth]/route";

export async function GET(
  request: Request,
  { params }: { params: { staffId: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json(
        { error: "No company assigned" },
        { status: 400 },
      );
    }

    const staffId = params.staffId;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Verify staff belongs to manager's company
    const staff = await prisma.user.findFirst({
      where: {
        id: staffId,
        companyId,
        role: { in: ["STAFF", "ACCOUNTANT"] },
      },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId: staffId,
      },
      include: {
        approvedByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        attendanceDate: "desc",
      },
      skip,
      take: limit,
    });

    const records = attendanceRecords.map((record) => ({
      id: record.id,
      date: record.attendanceDate.toISOString(),
      punchIn: record.punchIn.toISOString(),
      punchOut: record.punchOut?.toISOString() || null,
      status: record.status,
      approvedBy: record.approvedByUser
        ? `${record.approvedByUser.firstName || ""} ${record.approvedByUser.lastName || ""}`.trim()
        : null,
    }));

    return NextResponse.json({
      records,
      page,
      limit,
    });
  } catch (error) {
    console.error("Manager staff attendance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
