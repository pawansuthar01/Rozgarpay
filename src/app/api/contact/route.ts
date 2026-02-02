import { NextRequest, NextResponse } from "next/server";
import { notificationManager } from "@/lib/notifications/manager";
import { validatePhoneNumber } from "@/lib/utils";

// Super admin contact info
const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE;
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, message } = body;

    // Validate required fields
    if (!name || !phone || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // Validate phone format (basic validation)
    if (!validatePhoneNumber(phone.replace(/[\s-]/g, ""))) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 },
      );
    }

    // Send notification to super admin via WhatsApp and Email
    const notificationResult =
      await notificationManager.sendExternalNotification({
        email: SUPER_ADMIN_EMAIL,
        phone: SUPER_ADMIN_PHONE,
        channels: ["whatsapp", "email"],
        title: "New Contact Form Submission - RozgarPay",
        message: `New contact form submission:\n\nName: ${name}\nPhone: ${phone}\nMessage: ${message}`,
        type: "customer_support",
      });

    // Log the notification result
    console.log("[CONTACT] Notification result:", notificationResult);

    return NextResponse.json({
      success: true,
      message:
        "Thank you! Your message has been sent successfully. We'll get back to you soon.",
      notificationId: notificationResult.notificationId,
    });
  } catch (error) {
    console.error("[CONTACT] Error:", error);
    return NextResponse.json(
      { error: "Failed to process your request. Please try again later." },
      { status: 500 },
    );
  }
}
