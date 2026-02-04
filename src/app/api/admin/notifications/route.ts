import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Cache for 2 minutes
const CACHE_CONTROL = "public, s-maxage=120, stale-while-revalidate=600";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["ADMIN", "MANAGER"].includes(session.user.role) ||
      !session.user.companyId
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        title: true,
        message: true,
        channel: true,
        status: true,
        createdAt: true,
        meta: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    const records = notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.channel === "EMAIL" ? "info" : "success",
      read: notification.status === "SENT",
      createdAt: notification.createdAt.toISOString(),
      meta: notification.meta,
    }));

    const response = NextResponse.json(records);
    response.headers.set("Cache-Control", CACHE_CONTROL);
    return response;
  } catch (error) {
    console.error("Admin notifications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["ADMIN", "MANAGER"].includes(session.user.role) ||
      !session.user.companyId
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, action } = body;

    if (!notificationId || !action) {
      return NextResponse.json(
        { error: "notificationId and action are required" },
        { status: 400 },
      );
    }

    const userId = session.user.id;

    if (action === "mark_read") {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          status: "SENT",
        },
      });

      return NextResponse.json({ message: "Notification marked as read" });
    } else if (action === "mark_all_read") {
      await prisma.notification.updateMany({
        where: {
          userId,
          status: "PENDING",
        },
        data: {
          status: "SENT",
        },
      });

      return NextResponse.json({ message: "All notifications marked as read" });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Admin notifications PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
