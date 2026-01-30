import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";

import { notificationManager } from "@/lib/notificationService";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, phone, role, sendWelcome } = await request.json();

    // Validation
    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "Name, email, and role are required" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, phone ? { phone } : {}],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email or phone" },
        { status: 400 },
      );
    }

    // Check if invitation already exists and is not used
    const existingInvitation = await prisma.companyInvitation.findFirst({
      where: {
        email,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: "An active invitation already exists for this email" },
        { status: 400 },
      );
    }

    // Get admin's company
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!admin?.company) {
      return NextResponse.json(
        { error: "Admin company not found" },
        { status: 400 },
      );
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.companyInvitation.create({
      data: {
        companyId: admin.company.id,
        email,
        phone: phone || "",
        role: role,
        token,
        expiresAt,
      },
    });

    // Generate invitation link
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const inviteLink = `${baseUrl}/join/${token}`;

    const message = `You are invited to join ${
      admin.company.name
    } as a ${role}. Please use the following link to complete your registration: ${inviteLink}. This link will expire on ${invitation.expiresAt.toDateString()}.`;

    await notificationManager.sendExternalInvitation(
      email,
      phone,
      ["email", "whatsapp"],
      {
        type: "invitation_staff",
        role: "staff",

        companyName: admin.company.name,
        staffName: name,
        invitationUrl: inviteLink,
        expiresAt: invitation.expiresAt.toISOString(),
        message,
      },
    );

    // Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: "CREATED",
          entity: "INVITATION",
          entityId: invitation.id,
          meta: {
            email,
            role,
            inviteLink,
          },
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({
      message: "Invitation sent successfully",
      inviteLink,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("Invitation creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
