import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { notificationManager } from "@/lib/notifications/manager";
import { NotificationChannel } from "@/lib/notifications/types";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, phone, channels, title, message, type } = body;

    // Validate required fields
    if (!email && !phone) {
      return NextResponse.json(
        { error: "Email or phone is required" },
        { status: 400 },
      );
    }

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 },
      );
    }

    // Validate channels
    const validChannels: NotificationChannel[] = [
      "email",
      "whatsapp",
      "in_app",
      "push",
    ];
    const requestedChannels = (channels || ["email", "whatsapp"]) as string[];
    const filteredChannels = requestedChannels.filter((c) =>
      validChannels.includes(c as NotificationChannel),
    ) as NotificationChannel[];

    if (filteredChannels.length === 0) {
      return NextResponse.json(
        {
          error:
            "At least one valid channel is required (email, whatsapp, in_app, push)",
        },
        { status: 400 },
      );
    }

    // Send notification to external user
    const result = await notificationManager.sendExternalNotification({
      email,
      phone,
      channels: filteredChannels,
      title,
      message,
      type: type || "system_alert",
    });
    console.log(result);

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATED",
          entity: "EXTERNAL_NOTIFICATION",
          entityId: result.notificationId || "unknown",
          meta: {
            email,
            phone,
            channels: filteredChannels,
            title,
            message,
            type,
            success: result.success,
            errors: result.errors,
          },
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        notificationId: result.notificationId,
        message: "Notification sent successfully",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          notificationId: result.notificationId,
          errors: result.errors,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error sending external notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return available notification types and channels
    return NextResponse.json({
      channels: [
        { value: "email", label: "Email" },
        { value: "whatsapp", label: "WhatsApp" },
        { value: "in_app", label: "In-App" },
        { value: "push", label: "Push Notification" },
      ],
      types: [
        { value: "system_alert", label: "System Alert" },
        { value: "promotional", label: "Promotional" },
        { value: "admin_manual", label: "Admin Manual" },
        { value: "staff_manual", label: "Staff Manual" },
        { value: "protection", label: "Security Alert" },
        { value: "customer_support", label: "Customer Support" },
      ],
    });
  } catch (error) {
    console.error("Error fetching notification options:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
