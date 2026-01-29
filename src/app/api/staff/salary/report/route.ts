import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const companyId = session.user.companyId;
    const { format = "pdf" } = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { error: "No company assigned" },
        { status: 400 },
      );
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get salary overview data
    const salaries = await prisma.salary.findMany({
      where: {
        userId,
        companyId,
      },
      include: {
        breakdowns: true,
      },
      orderBy: {
        year: "desc",
      },
    });

    // Generate simple PDF-like text report (in a real app, you'd use a PDF library)
    const reportData = {
      user: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
      },
      generatedAt: new Date().toISOString(),
      salaries: salaries.map((salary) => ({
        month: salary.month,
        year: salary.year,
        grossAmount: salary.grossAmount,
        netAmount: salary.netAmount,
        status: salary.status,
        breakdowns: salary.breakdowns.map((b) => ({
          type: b.type,
          description: b.description,
          amount: b.amount,
        })),
      })),
    };

    // For now, return JSON. In production, generate actual PDF
    const reportContent = JSON.stringify(reportData, null, 2);

    // Create response with appropriate headers for download
    const response = new NextResponse(reportContent, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="salary-report-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });

    return response;
  } catch (error) {
    console.error("Staff salary report POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
