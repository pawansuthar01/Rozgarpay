import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

import { notificationManager } from "@/lib/notifications/manager";
import { getDate } from "@/lib/attendanceUtils";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: companyId } = params;
    const { email, phone } = await request.json();

    if (!email || !phone) {
      return NextResponse.json(
        { error: "Email and phone are required" },
        { status: 400 },
      );
    }

    // Check if company exists and is active
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company || company.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Company not found or not active" },
        { status: 404 },
      );
    }

    // Check if email or phone already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email or phone already exists" },
        { status: 400 },
      );
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.companyInvitation.findFirst({
      where: {
        companyId,
        OR: [{ email }, { phone }],
        isUsed: false,
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: "Invitation already sent to this email or phone" },
        { status: 400 },
      );
    }

    // Generate unique token for invitation
    const token = crypto.randomUUID();
    const expiresAt = getDate(new Date());
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await prisma.companyInvitation.create({
      data: {
        companyId,
        email,
        phone,
        token,
        expiresAt,
      },
    });

    const joinLink = `${process.env.NEXTAUTH_URL}/join/${token}`;

    // Send notifications using the notification service
    try {
      const message = `You have been invited to join "${company.name}" as an admin. Create your account and start managing your company's staff. Join now: ${joinLink}`;

      const notificationResults =
        await notificationManager.sendExternalInvitation(
          email,
          phone,
          ["email", "whatsapp"],
          {
            type: "invitation_company",
            role: "admin",
            companyName: company.name,
            token: token,
            expiresAt: invitation.expiresAt.toISOString(),
            message,
          },
        );

      console.log("Notifications sent:", notificationResults);
    } catch (notificationError) {
      console.error("Failed to send notifications:", notificationError);
      // Don't fail the request if notifications fail
    }

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATED",
          entity: "COMPANY_INVITATION",
          entityId: invitation.id,
          meta: {
            companyId,
            companyName: company.name,
            email,
            phone,
            invitationId: invitation.id,
          },
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
      // Don't fail the request if audit log fails
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        joinLink,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
