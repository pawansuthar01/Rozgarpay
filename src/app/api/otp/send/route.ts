import { OTPService } from "@/lib/OtpService";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, { params }: any) {
  try {
    const { phone, purpose = "LOGIN" } = await request.json(); // "phone" or "email"

    if (!phone) {
      return NextResponse.json(
        { error: "Missing phone number or OTP" },
        { status: 404 },
      );
    }

    // Send OTP
    const res = await OTPService.sendOTP(phone, null, purpose);

    if (res.success) {
      return NextResponse.json({
        success: true,
        message: "OTP verified successfully",
      });
    } else {
      return NextResponse.json(
        { success: false, message: res.message },
        { status: 400 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 },
    );
  }
}
