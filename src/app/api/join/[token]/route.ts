import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OTPService } from "@/lib/OtpService";
import { validateEmail, validatePhoneNumber } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    const { token } = params;

    const invitation = await prisma.companyInvitation.findUnique({
      where: { token },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });
    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation" },
        { status: 404 },
      );
    }

    if (invitation.isUsed) {
      return NextResponse.json(
        { error: "Invitation already used" },
        { status: 400 },
      );
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "Invitation expired" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        phone: invitation.phone,
        role: invitation.role,
        company: {
          id: invitation.company.id,
          name: invitation.company.name,
          description: invitation.company.description,
        },
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: any) {
  try {
    const { token } = params;
    const { type, email } = await request.json(); // "phone" or "email"

    // Verify invitation exists and is valid
    const invitation = await prisma.companyInvitation.findUnique({
      where: { token },
      include: {
        company: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation" },
        { status: 404 },
      );
    }

    if (invitation.isUsed) {
      return NextResponse.json(
        { error: "Invitation already used" },
        { status: 400 },
      );
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "Invitation expired" },
        { status: 400 },
      );
    }

    // Determine email to use - from request body if provided, otherwise from invitation
    const emailToUse = type === "email" ? email || invitation.email : null;

    if (type == "email" && !emailToUse) {
      return NextResponse.json(
        { error: "email is requited to send otp..." },
        { status: 400 },
      );
    }
    if (type == "email" && !validateEmail(emailToUse || "")) {
      return NextResponse.json(
        { error: "Enter valid email..." },
        { status: 400 },
      );
    }
    if (type == "email" && email) {
      const isExitsEmail = await prisma.user.findUnique({
        where: { email: email },
      });
      const isUsedInInvitation = await prisma.companyInvitation.findFirst({
        where: { email, id: { not: invitation.id } },
      });
      if (isExitsEmail || isUsedInInvitation) {
        return NextResponse.json(
          { error: "This email cannot be used. Please try another." },
          { status: 400 },
        );
      }
    }
    if (type == "phone" && !invitation.phone) {
      return NextResponse.json(
        { error: "phone is requited to send otp..." },
        { status: 400 },
      );
    }
    if (type == "phone" && !validatePhoneNumber(invitation.phone)) {
      return NextResponse.json(
        { error: "Enter valid phone number..." },
        { status: 400 },
      );
    }
    // Send OTP
    const result =
      type == "email"
        ? await OTPService.sendOTP("", emailToUse, "REGISTER")
        : await OTPService.sendOTP(invitation.phone, "", "REGISTER");

    if (result.success) {
      return NextResponse.json({
        message: `OTP sent to your ${type}`,
        channels: result.channels,
      });
    } else {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
