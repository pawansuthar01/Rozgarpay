import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function GET(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: companyId } = await params;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            users: true,
            attendances: true,
            salaries: true,
            reports: true,
          },
        },
        users: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
          take: 5, // Recent users
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ company });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: companyId } = await params;
    const { name, status } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 },
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (company.status === "DEACTIVATED") {
      return NextResponse.json(
        { error: "Deactivated company cannot be modified" },
        { status: 400 },
      );
    }

    const updateData: any = { name: name.trim() };
    if (status && ["ACTIVE", "SUSPENDED", "DEACTIVATED"].includes(status)) {
      updateData.status = status;
    }

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: updateData,
    });

    // ✅ Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATED",
          entity: "COMPANY",
          entityId: companyId,
          meta: {
            changes: updateData,
          },
        },
      });
    } catch (auditError) {
      console.error(
        "Failed to create audit log for company update:",
        auditError,
      );
      // Don't fail the request if audit log fails
    }

    return NextResponse.json({ company: updatedCompany });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: companyId } = await params;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            users: true,
            attendances: true,
            salaries: true,
            reports: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check if company has active data
    if (
      company._count.users > 0 ||
      company._count.attendances > 0 ||
      company._count.salaries > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot delete company with existing data. Deactivate instead.",
        },
        { status: 400 },
      );
    }

    await prisma.company.delete({
      where: { id: companyId },
    });

    // ✅ Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETED",
          entity: "COMPANY",
          entityId: companyId,
          meta: {
            companyName: company.name,
          },
        },
      });
    } catch (auditError) {
      console.error(
        "Failed to create audit log for company delete:",
        auditError,
      );
      // Don't fail the request if audit log fails
    }

    return NextResponse.json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: companyId } = await params;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (company.status === "DEACTIVATED") {
      return NextResponse.json(
        { error: "Deactivated company cannot be modified" },
        { status: 400 },
      );
    }

    const newStatus = company.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: { status: newStatus },
    });

    // ✅ Audit log
    try {
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
    } catch (auditError) {
      console.error(
        "Failed to create audit log for company status toggle:",
        auditError,
      );
      // Don't fail the request if audit log fails
    }

    return NextResponse.json({ company: updatedCompany });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
