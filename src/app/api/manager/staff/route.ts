import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

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
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status") || "";

    const skip = (page - 1) * limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get staff with their today's attendance
    const staffWithAttendance = await prisma.user.findMany({
      where: {
        companyId,
        role: { in: ["STAFF", "ACCOUNTANT"] },
        status: "ACTIVE",
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        attendances: {
          where: {
            attendanceDate: {
              gte: today,
              lt: tomorrow,
            },
          },
          orderBy: {
            punchIn: "desc",
          },
          take: 1,
        },
      },
      skip,
      take: limit,
      orderBy: {
        firstName: "asc",
      },
    });

    // Get total count for pagination
    const totalCount = await prisma.user.count({
      where: {
        companyId,
        role: { in: ["STAFF", "ACCOUNTANT"] },
        status: "ACTIVE",
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
    });

    // Process staff data
    const staff = staffWithAttendance
      .map((user) => {
        const todayAttendance = user.attendances[0];
        let todayStatus: "PRESENT" | "ABSENT" | "PENDING" | "NOT_PUNCHED" =
          "NOT_PUNCHED";
        let lastPunchTime: string | null = null;

        if (todayAttendance) {
          if (todayAttendance.status === "APPROVED") {
            todayStatus = "PRESENT";
          } else if (todayAttendance.status === "PENDING") {
            todayStatus = "PENDING";
          } else {
            todayStatus = "ABSENT";
          }
          lastPunchTime = todayAttendance?.punchIn?.toISOString() ?? null;
        }

        return {
          id: user.id,
          name:
            `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
            "Unnamed",
          email: user.email,
          todayStatus,
          lastPunchTime,
        };
      })
      .filter((member) => !statusFilter || member.todayStatus === statusFilter);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      staff,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error("Manager staff error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
