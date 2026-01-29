import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OTPService } from "@/lib/OtpService";

export async function GET(request: NextRequest, { params }: any) {
  try {
    const { token } = params;

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
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: any) {
  try {
    const { token } = params;
    const { type } = await request.json(); // "phone" or "email"

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

    // Send OTP
    const result = await OTPService.sendOTP(
      type === "phone" ? invitation.phone : "",
      type === "email" ? invitation.email : null,
      "REGISTER",
    );

    if (result.success) {
      return NextResponse.json({
        message: `OTP sent to your ${type}`,
        channels: result.channels,
      });
    } else {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
  } catch (error) {
    console.error("OTP send error:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
