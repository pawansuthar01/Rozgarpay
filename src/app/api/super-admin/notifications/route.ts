import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { notificationId, notificationData } = await request.json();
    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 },
      );
    }
    if (!notificationData) {
      // Get the failed notification
      notificationData = await prisma.notificationLog.findUnique({
        where: { id: notificationId },
      });
    }
    if (!notificationData) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 },
      );
    }
    const { metadata, status, recipient, channel, type } = notificationData;

    if (status !== "failed") {
      return NextResponse.json(
        { error: "Only failed notifications can be retried" },
        { status: 400 },
      );
    }

    // Try to resend the notification using the notification service
    try {
      // Import the notification service
      const { notificationManager } = await import("@/lib/notificationService");

      // Determine the channel and send
      let result;

      if (channel === "email") {
        // For email, we'd need the original message content
        // This is a simplified version - in real implementation, you'd store the full message
        result = await notificationManager.sendExternalInvitation(
          recipient,
          "", // phone not needed for email
          ["email"],
          {
            role: metadata.role,
            companyName: metadata.companyName,
            invitationUrl: metadata.invitationUrl, // placeholder
            expiresAt: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            message: `Retrying notification: ${type}`,
          },
        );
      } else if (channel === "whatsapp") {
        result = await notificationManager.sendExternalInvitation(
          "", // email not needed
          recipient,
          ["whatsapp"],
          {
            role: metadata.role,
            companyName: metadata.companyName,
            invitationUrl: metadata.invitationUrl, // placeholder
            expiresAt: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            message: `Retrying notification: ${type}`,
          },
        );
      }

      // Update the notification status
      const updatedNotification = await prisma.notificationLog.update({
        where: { id: notificationId },
        data: {
          status: "sent",
          sentAt: new Date(),
          errorMessage: null,
        },
      });

      // Audit log
      try {
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: "UPDATED",
            entity: "NOTIFICATION_LOG",
            entityId: notificationId,
            meta: {
              retried: true,
              previousStatus: "failed",
              newStatus: "sent",
            },
          },
        });
      } catch (auditError) {
        console.error("Failed to create audit log:", auditError);
      }

      return NextResponse.json({
        success: true,
        notification: updatedNotification,
        message: "Notification resent successfully",
      });
    } catch (resendError) {
      console.error("Failed to resend notification:", resendError);

      // Update with error
      const errorMessage =
        resendError instanceof Error ? resendError.message : "Unknown error";
      await prisma.notificationLog.update({
        where: { id: notificationId },
        data: {
          errorMessage: `Retry failed: ${errorMessage}`,
        },
      });

      return NextResponse.json(
        {
          error: "Failed to resend notification",
          details: errorMessage,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error(error);
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type");
    const channel = searchParams.get("channel");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { type: { contains: search, mode: "insensitive" } },
        { recipient: { contains: search, mode: "insensitive" } },
        { provider: { contains: search, mode: "insensitive" } },
      ];
    }

    if (type && type !== "ALL") {
      where.type = type;
    }

    if (channel && channel !== "ALL") {
      where.channel = channel;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    const [notifications, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.notificationLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
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
