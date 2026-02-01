import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { notificationManager } from "@/lib/notifications/manager";
import { validatePhoneNumber } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, phone, role, sendWelcome } = await request.json();

    // Validation - name and role are required, email is optional
    if (!name || !role) {
      return NextResponse.json(
        { error: "Name and role are required" },
        { status: 400 },
      );
    }

    // Email is optional but if provided, validate format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address or leave it empty" },
        { status: 400 },
      );
    }
    if (!validatePhoneNumber(phone)) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid phone number or number most starting with +91",
        },
        { status: 400 },
      );
    }

    // Check if user already exists (only if email or phone provided)
    let existingUser = null;
    if (email || phone) {
      const whereClause: any = {};
      if (email) whereClause.email = email;
      if (phone) whereClause.phone = phone;

      existingUser = await prisma.user.findFirst({
        where: whereClause,
      });
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email or phone" },
        { status: 400 },
      );
    }

    // Check if invitation already exists and is not used (only if email provided)
    const existingInvitationWhere: any = {
      isUsed: false,
      expiresAt: {
        gt: new Date(),
      },
    };

    if (email) {
      existingInvitationWhere.OR = [{ email }, phone ? { phone } : null].filter(
        Boolean,
      );
    } else if (phone) {
      existingInvitationWhere.phone = phone;
    }

    if (email || phone) {
      const existingInvitation = await prisma.companyInvitation.findFirst({
        where: existingInvitationWhere,
      });

      if (existingInvitation) {
        return NextResponse.json(
          {
            error:
              "An active invitation already exists for this email or phone",
          },
          { status: 400 },
        );
      }
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

    // Send notification only if email or phone is provided
    if (email || phone) {
      await notificationManager.sendExternalInvitation(
        email,
        phone,
        email ? ["email", "whatsapp"] : ["whatsapp"],
        {
          type: "company_staff_join",
          role: "staff",

          companyName: admin.company.name,
          staffName: name,
          token: token,
          expiresAt: invitation.expiresAt.toISOString(),
          message,
        },
      );
    }

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
