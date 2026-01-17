import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../../auth/[...nextauth]/route";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const { status } = await request.json();

    if (!["ACTIVE", "SUSPENDED", "DEACTIVATED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 }
      );
    }

    // Update user status
    const updatedUser = await prisma.user.updateMany({
      where: {
        id: userId,
        companyId: admin.company.id,
      },
      data: { status: status as any },
    });

    if (updatedUser.count === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: "UPDATED",
          entity: "USER",
          entityId: userId,
          meta: {
            status,
            previousStatus: "unknown", // Could be enhanced to track previous status
          },
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({
      message: "User status updated successfully",
    });
  } catch (error) {
    console.error("User status update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
