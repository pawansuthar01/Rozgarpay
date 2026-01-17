import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN" || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { month, year, action } = body;

    if (!month || !year || !action) {
      return NextResponse.json(
        { error: "Month, year, and action are required" },
        { status: 400 }
      );
    }

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (admin?.company?.id == null) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 }
      );
    }

    // Get all staff
    const staff = await prisma.user.findMany({
      where: {
        companyId: admin.company.id,
        role: "STAFF",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const startDate = new Date(year, month - 1, 1); // month is 1-based
    const endDate = new Date(year, month, 1); // next month start

    // Calculate salaries
    const salaries = await Promise.all(
      staff.map(async (user) => {
        // Count approved attendances for the month

        const approvedCount = await prisma.attendance.count({
          where: {
            userId: user.id,
            status: "APPROVED",
            attendanceDate: {
              gte: startDate,
              lt: endDate,
            },
          },
        });

        // Simple calculation: approved days * 1000 (daily rate)
        const dailyRate = 1000; // This could be configurable, but for now fixed
        const grossAmount = approvedCount * dailyRate;
        const netAmount = grossAmount; // No deductions for simplicity

        return {
          userId: user.id,
          user,
          approvedDays: approvedCount,
          grossAmount,
          netAmount,
        };
      })
    );

    if (action === "preview") {
      return NextResponse.json({
        salaries,
        month,
        year,
      });
    } else if (action === "generate") {
      // Check if salaries already exist for this month/year
      const existing = await prisma.salary.count({
        where: {
          user: {
            companyId: admin.company.id,
            role: "STAFF",
          },
          month,
          year,
        },
      });

      if (existing > 0) {
        return NextResponse.json(
          { error: "Salaries already generated for this month" },
          { status: 400 }
        );
      }
      if (!admin.company) {
        return NextResponse.json(
          { error: "Admin company not found" },
          { status: 400 }
        );
      }

      const companyId = admin.company.id;

      const createdSalaries = await Promise.all(
        salaries.map((salary) =>
          prisma.salary.create({
            data: {
              userId: salary.userId,
              companyId,
              month,
              year,
              totalDays: new Date(year, month, 0).getDate(),
              approvedDays: salary.approvedDays,
              grossAmount: salary.grossAmount,
              netAmount: salary.netAmount,
              type: "MONTHLY",
              status: "GENERATED",
            },
          })
        )
      );

      return NextResponse.json({
        message: "Salaries generated successfully",
        count: createdSalaries.length,
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Salary generate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
