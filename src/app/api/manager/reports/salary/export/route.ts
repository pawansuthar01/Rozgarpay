import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../../auth/[...nextauth]/route";

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
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const format = searchParams.get("format") || "pdf";

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "Date range required" },
        { status: 400 },
      );
    }

    // Get salary data for export
    const salaryData = await prisma.salary.findMany({
      where: {
        companyId,
        createdAt: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo),
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
        { user: { firstName: "asc" } },
      ],
    });

    // For now, return JSON data
    // In a real implementation, you would generate PDF/Excel here
    const exportData = salaryData.map((record) => ({
      staffName:
        `${record.user.firstName || ""} ${record.user.lastName || ""}`.trim() ||
        record.user.email,
      month: record.month,
      year: record.year,
      grossAmount: record.grossAmount,
      netAmount: record.netAmount,
      status: record.status,
      paidAt: record.paidAt?.toISOString() || null,
    }));

    // Return as JSON for now - in production, generate actual file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="salary-report-${dateFrom}-to-${dateTo}.json"`,
      },
    });
  } catch (error) {
    console.error("Manager salary export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
