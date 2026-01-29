import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { salaryService } from "@/lib/salaryService";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["ADMIN", "MANAGER"].includes(session.user.role) ||
      !session.user.companyId
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { month, year, action } = body;

    if (!month || !year || !action) {
      return NextResponse.json(
        { error: "Month, year, and action are required" },
        { status: 400 },
      );
    }

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company?.id) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    const companyId = admin.company.id;

    if (action === "preview") {
      // Get all staff for preview
      const staff = await prisma.user.findMany({
        where: {
          companyId,
          role: "STAFF",
          status: "ACTIVE",
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      // Generate preview salaries
      const previews = await Promise.all(
        staff.map(async (user) => {
          const result = await salaryService.generateSalary({
            userId: user.id,
            companyId,
            month,
            year,
          });

          if (result.success && result.salary) {
            return {
              user,
              salary: result.salary,
              breakdowns: result.breakdowns,
            };
          } else {
            return {
              user,
              error: result.error,
            };
          }
        }),
      );

      return NextResponse.json({
        previews,
        month,
        year,
      });
    } else if (action === "generate") {
      // Auto-generate salaries for all staff
      const result = await salaryService.autoGenerateSalaries(
        companyId,
        month,
        year,
      );

      if (result.success) {
        return NextResponse.json({
          message: "Salaries generated successfully",
          processed: result.processed,
          errors: result.errors,
        });
      } else {
        return NextResponse.json(
          {
            error: "Failed to generate salaries",
            errors: result.errors,
          },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Salary generate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
