import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { salaryService } from "@/lib/salaryService";

export async function POST(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);
    const { salaryId } = params;

    if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        user: {
          companyId: admin.company.id,
        },
      },
    });

    if (!salary) {
      return NextResponse.json(
        { error: "Salary not found or access denied" },
        { status: 404 },
      );
    }

    // Recalculate salary
    const result = await salaryService.recalculateSalary(salaryId);

    if (result.success) {
      return NextResponse.json({
        message: "Salary recalculated successfully",
        salary: result.salary,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to recalculate salary" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Admin salary recalculate error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
