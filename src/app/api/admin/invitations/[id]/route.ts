import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

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

    // Find the invitation and ensure it belongs to admin's company
    const invitation = await prisma.companyInvitation.findFirst({
      where: {
        id,
        companyId: admin.company.id,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Only allow deletion of pending invitations
    if (invitation.isUsed) {
      return NextResponse.json(
        { error: "Cannot delete completed invitations" },
        { status: 400 }
      );
    }

    if (new Date() <= invitation.expiresAt) {
      // It's still pending, allow deletion
      await prisma.companyInvitation.delete({
        where: { id },
      });

      // Create audit log
      try {
        await prisma.auditLog.create({
          data: {
            userId: admin.id,
            action: "DELETED",
            entity: "INVITATION",
            entityId: id,
            meta: {
              email: invitation.email,
              role: invitation.role,
            },
          },
        });
      } catch (auditError) {
        console.error("Failed to create audit log:", auditError);
      }

      return NextResponse.json({
        message: "Invitation deleted successfully",
      });
    } else {
      return NextResponse.json(
        { error: "Cannot delete expired invitations" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Invitation deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
