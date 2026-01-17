import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function GET(
  request: NextRequest,
  { params }: { params: { salaryId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { salaryId } = params;

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 }
      );
    }

    // Fetch the salary record
    const salary = await prisma.salary.findFirst({
      where: {
        id: salaryId,
        companyId: admin.company.id,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!salary) {
      return NextResponse.json(
        { error: "Salary record not found" },
        { status: 404 }
      );
    }
    const startDate = new Date(salary.year, salary.month - 1, 1); // month is 1-based
    const endDate = new Date(salary.year, salary.month, 1); // next month start

    // Get attendance data for the month for chart
    const attendances = await prisma.attendance.findMany({
      where: {
        userId: salary.userId,
        attendanceDate: {
          gte: startDate,
          lt: endDate,
        },
      },

      select: {
        attendanceDate: true,
        status: true,
      },
      orderBy: {
        attendanceDate: "asc",
      },
    });

    // Prepare chart data: daily attendance status
    const chartData = attendances.map((att) => ({
      date: att.attendanceDate.toISOString().split("T")[0],
      status: att.status,
    }));

    return NextResponse.json({
      salary,
      chartData,
    });
  } catch (error) {
    console.error("Salary detail fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { salaryId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { salaryId } = params;
    const body = await request.json();
    const { status } = body;

    if (status !== "PAID") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 }
      );
    }

    // Update salary status
    const updatedSalary = await prisma.salary.updateMany({
      where: {
        id: salaryId,
        companyId: admin.company.id,
        status: "PENDING",
      },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    if (updatedSalary.count === 0) {
      return NextResponse.json(
        { error: "Salary not found or already paid" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Salary marked as paid" });
  } catch (error) {
    console.error("Salary update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
