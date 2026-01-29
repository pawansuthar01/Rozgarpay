import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            auditLogs: true,
          },
        },
      },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get activity stats
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [thisMonthActivity, lastMonthActivity, totalCompanies, totalUsers] =
      await Promise.all([
        prisma.auditLog.count({
          where: {
            userId: session.user.id,
            createdAt: { gte: thisMonth },
          },
        }),
        prisma.auditLog.count({
          where: {
            userId: session.user.id,
            createdAt: { gte: lastMonth, lt: thisMonth },
          },
        }),
        prisma.company.count(),
        prisma.user.count(),
      ]);

    return NextResponse.json({
      user,
      stats: {
        thisMonthActivity,
        lastMonthActivity,
        totalCompanies,
        totalUsers,
        activityGrowth:
          lastMonthActivity > 0
            ? Math.round(
                ((thisMonthActivity - lastMonthActivity) / lastMonthActivity) *
                  100,
              )
            : thisMonthActivity > 0
              ? 100
              : 0,
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

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, phone } = body;
    // Validate input
    if (
      firstName !== undefined &&
      (typeof firstName !== "string" || firstName.trim().length === 0)
    ) {
      return NextResponse.json(
        { error: "First name cannot be empty" },
        { status: 400 },
      );
    }

    if (
      lastName !== undefined &&
      (typeof lastName !== "string" || lastName.trim().length === 0)
    ) {
      return NextResponse.json(
        { error: "Last name cannot be empty" },
        { status: 400 },
      );
    }

    if (
      phone !== undefined &&
      (typeof phone !== "string" || phone.trim().length === 0)
    ) {
      return NextResponse.json(
        { error: "Phone cannot be empty" },
        { status: 400 },
      );
    }

    // Check if phone is already taken by another user
    if (phone) {
      const existingUser = await prisma.user.findFirst({
        where: {
          phone,
          id: { not: session.user.id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Phone number already in use" },
          { status: 400 },
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(firstName !== undefined && { firstName: firstName.trim() }),
        ...(lastName !== undefined && { lastName: lastName.trim() }),
        ...(phone !== undefined && { phone: phone.trim() }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATED",
          entity: "USER",
          entityId: session.user.id,
          meta: {
            updatedFields: Object.keys({ firstName, lastName, phone }).filter(
              (key) => body[key] !== undefined,
            ),
          },
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Password change endpoint
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long" },
        { status: 400 },
      );
    }

    // Get current user with password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedNewPassword },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATED",
          entity: "USER",
          entityId: session.user.id,
          meta: {
            passwordChanged: true,
          },
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
