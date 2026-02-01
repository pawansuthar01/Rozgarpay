import { OTPService } from "@/lib/OtpService";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: any) {
  try {
    const { phoneNumber, email, otp, type } = await request.json(); // "phone" or "email"

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: "Missing phone number or OTP" },
        { status: 404 },
      );
    }

    // Send OTP
    if (type == "email" && !email && !otp) {
      return NextResponse.json(
        { error: "Missing email or OTP" },
        { status: 404 },
      );
    }
    const isVerified =
      type != "email"
        ? await OTPService.verifyOTP(phoneNumber, otp)
        : await OTPService.verifyEmailOTP(email, otp);

    if (isVerified) {
      return NextResponse.json({
        success: true,
        message: "OTP verified successfully",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid OTP or expired" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 },
    );
  }
}
