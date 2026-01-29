import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request, { params }: any) {
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

    const salaryRecords = await prisma.salary.findMany({
      where: {
        userId: staffId,
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      skip,
      take: limit,
    });

    const records = salaryRecords.map((record) => ({
      id: record.id,
      month: record.month,
      year: record.year,
      grossAmount: record.grossAmount,
      netAmount: record.netAmount,
      status: record.status,
      paidAt: record.paidAt?.toISOString() || null,
    }));

    return NextResponse.json({
      records,
      page,
      limit,
    });
  } catch (error) {
    console.error("Manager staff salary error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
