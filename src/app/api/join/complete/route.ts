import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { OTPService } from "@/lib/OtpService";
import { notificationManager } from "@/lib/notifications/manager";
import { getDate } from "@/lib/attendanceUtils";

export async function POST(request: NextRequest) {
  try {
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Basic rate limiting: check recent registrations from this IP
    const recentRegistrations = await prisma.auditLog.count({
      where: {
        action: "CREATED",
        entity: "USER",
        createdAt: {
          gt: getDate(new Date(Date.now() - 60 * 1000)), // Last minute
        },
        meta: {
          path: ["clientIP"],
          equals: clientIP,
        },
      },
    });

    if (recentRegistrations >= 3) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 },
      );
    }

    const { firstName, lastName, password, invitation, email } =
      await request.json();
    // Enhanced input validation
    if (
      !firstName ||
      !lastName ||
      !password ||
      !invitation.phone ||
      !invitation.company.id ||
      !invitation.id
    ) {
      return NextResponse.json(
        { error: "All required fields are required" },
        { status: 400 },
      );
    }

    // Use email from request body or invitation
    const userEmail = email || invitation.email || null;

    if (
      typeof firstName !== "string" ||
      firstName.trim().length < 2 ||
      firstName.length > 50
    ) {
      return NextResponse.json(
        { error: "First name must be between 2 and 50 characters" },
        { status: 400 },
      );
    }

    if (
      typeof lastName !== "string" ||
      lastName.trim().length < 2 ||
      lastName.length > 50
    ) {
      return NextResponse.json(
        { error: "Last name must be between 2 and 50 characters" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 },
      );
    }

    // Check if user already exists (only if email or phone provided)
    const existingWhere: any = { phone: invitation.phone };
    if (userEmail) {
      existingWhere.OR = [{ email: userEmail }, { phone: invitation.phone }];
    }

    const existingUser = await prisma.user.findFirst({
      where: existingWhere,
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email or phone" },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: userEmail,
        phone: invitation.phone,
        password: hashedPassword,
        role: invitation.role,
        companyId: invitation.company.id,
        status: "ACTIVE",
        onboardingCompleted: false, // Will be completed after first login onboarding
      },
    });

    // Mark invitation as used
    await prisma.companyInvitation.update({
      where: { id: invitation.id },
      data: { isUsed: true },
    });

    // Create audit log
    try {
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATED",
          entity: "USER",
          entityId: user.id,
          meta: {
            role: "ADMIN",
            companyId: invitation.company.id,
            invitationId: invitation.id,
            phone: invitation.phone,
            isVerified: true,
            email: userEmail,

            clientIP,
          },
        },
      });
    } catch (auditError) {
      console.error(
        "Failed to create audit log for user registration:",
        auditError,
      );
      // Don't fail the request if audit log fails
    }
    if (invitation.role === "STAFF") {
      try {
        notificationManager.sendAdminNotification(
          invitation.company.id,
          "salary_setup_pending",
          {
            subject: "New Staff Registration",
            companyName: invitation.company.name,
            message: `${user.firstName} ${user.lastName} has successfully accepted the invitation and set up their account. They are now ready for salary management.`,
            staffName: `${user.firstName} ${user.lastName}`,
          },
        );
      } catch (_) {}
    }

    return NextResponse.json({
      message: "Registration successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
