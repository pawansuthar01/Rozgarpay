import { OTPService } from "@/lib/OtpService";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: any) {
  try {
    const { phoneNumber, otp } = await request.json(); // "phone" or "email"

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: "Missing phone number or OTP" },
        { status: 404 },
      );
    }

    // Send OTP
    const isVerified = await OTPService.verifyOTP(phoneNumber, otp);

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
