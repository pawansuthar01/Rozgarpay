import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const salary = await prisma.salary.findFirst({
      where: {
        id: params.salaryId,
        userId: session.user.id, // Ensure staff can only access their own salary
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            joiningDate: true,
          },
        },
        company: {
          select: {
            name: true,
            description: true,
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
      return NextResponse.json({ error: "Salary not found" }, { status: 404 });
    }

    return NextResponse.json({ salary });
  } catch (error) {
    console.error("Staff salary detail fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
