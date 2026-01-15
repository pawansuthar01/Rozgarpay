import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = params.id;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (company.status === "DEACTIVATED") {
      return NextResponse.json(
        { error: "Deactivated company cannot be modified" },
        { status: 400 }
      );
    }

    const newStatus = company.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: { status: newStatus },
    });

    // ✅ Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATED",
        entity: "COMPANY",
        entityId: companyId,
        meta: {
          from: company.status,
          to: newStatus,
        },
      },
    });

    return NextResponse.json({ company: updatedCompany });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
