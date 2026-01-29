import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const dateFilter = searchParams.get("date");
    const statusFilter = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const whereClause: any = {
      companyId,
    };

    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);

      whereClause.attendanceDate = {
        gte: filterDate,
        lt: nextDay,
      };
    }

    if (statusFilter) {
      whereClause.status = statusFilter;
    }

    if (search) {
      whereClause.user = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [attendanceRecords, totalCount] = await Promise.all([
      prisma.attendance.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: [{ attendanceDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.attendance.count({
        where: whereClause,
      }),
    ]);

    const records = attendanceRecords.map((record) => ({
      id: record.id,
      userId: record.userId,
      userName:
        `${record.user.firstName || ""} ${record.user.lastName || ""}`.trim() ||
        "Unnamed",
      userEmail: record.user.email,
      attendanceDate: record.attendanceDate.toISOString(),
      punchIn: record?.punchIn?.toISOString(),
      punchOut: record.punchOut?.toISOString() || null,
      status: record.status,
      imageUrl: record.punchInImageUrl,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      records,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error("Manager attendance list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
