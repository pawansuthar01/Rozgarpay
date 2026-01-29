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
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: "Date range required" },
        { status: 400 },
      );
    }

    // Get staff salary details
    const [salaries, totalCount] = await Promise.all([
      prisma.salary.findMany({
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
        skip,
        take: limit,
      }),
      prisma.salary.count({
        where: {
          companyId,
          createdAt: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo),
          },
        },
      }),
    ]);

    const salaryDetails = salaries.map((salary) => ({
      id: salary.id,
      name:
        `${salary.user.firstName || ""} ${salary.user.lastName || ""}`.trim() ||
        salary.user.email,
      month: salary.month,
      year: salary.year,
      grossAmount: salary.grossAmount,
      netAmount: salary.netAmount,
      status: salary.status,
      paidAt: salary.paidAt?.toISOString() || null,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      salaries: salaryDetails,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Manager staff salary report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
