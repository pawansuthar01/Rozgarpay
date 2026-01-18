import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { salaryService } from "@/lib/salaryService";

export async function GET(
  request: NextRequest,
  { params }: { params: { salaryId: string } },
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
        { status: 400 },
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
        breakdowns: true,
        approvedByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        rejectedByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!salary) {
      return NextResponse.json(
        { error: "Salary record not found" },
        { status: 404 },
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
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { salaryId: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { salaryId } = params;
    const body = await request.json();
    const { action, paidAt, rejectionReason } = body;

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    // Verify salary belongs to admin's company
    const salary = await prisma.salary.findFirst({
      where: {
        id: salaryId,
        companyId: admin.company.id,
      },
      select: { id: true, status: true },
    });

    if (!salary) {
      return NextResponse.json({ error: "Salary not found" }, { status: 404 });
    }

    if (action === "approve") {
      const result = await salaryService.approveSalary(
        salaryId,
        session.user.id,
      );
      if (result.success) {
        return NextResponse.json({ message: "Salary approved successfully" });
      } else {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    } else if (action === "pay") {
      const result = await salaryService.markAsPaid(
        salaryId,
        paidAt ? new Date(paidAt) : undefined,
      );
      if (result.success) {
        return NextResponse.json({ message: "Salary marked as paid" });
      } else {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    } else if (action === "reject") {
      // For rejection, we need to implement it in the service
      // For now, update directly
      await prisma.salary.update({
        where: { id: salaryId },
        data: {
          status: "REJECTED",
          rejectedBy: session.user.id,
          rejectedAt: new Date(),
          rejectionReason,
        },
      });
      return NextResponse.json({ message: "Salary rejected" });
    } else if (action === "recalculate") {
      const result = await salaryService.recalculateSalary(salaryId);
      if (result.success) {
        return NextResponse.json({
          message: "Salary recalculated successfully",
          salary: result.salary,
        });
      } else {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Salary update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
