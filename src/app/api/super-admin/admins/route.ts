import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

import { notificationManager } from "@/lib/notifications/manager";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const companyId = searchParams.get("companyId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    const where: any = {
      role: "ADMIN",
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { company: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (companyId && companyId !== "ALL") {
      where.companyId = companyId;
    }

    const [admins, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          _count: {
            select: {
              attendances: true,
              salaries: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      admins,
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, phone, password, companyId } = await request.json();

    if (!email || !phone || !password || !companyId) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // Check if company exists and is active
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company || company.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Invalid or inactive company" },
        { status: 400 },
      );
    }

    // Check unique email and phone
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email or phone already exists" },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        role: "ADMIN",
        companyId,
      },
    });

    // Subscribe user to notifications (fire and forget)
    notificationManager
      .subscribeUser({
        userId: user.id,
        userType: "admin",
        types: ["admin_manual", "system_alert"],
        channels: ["in_app", "push", "email"],
        preferences: {
          soundEnabled: true,
          vibrationEnabled: true,
          showPreview: true,
        },
      })
      .catch(console.error);

    // Send notification
    notificationManager
      .sendNotification({
        userId: user.id,
        type: "admin_manual",
        data: {
          title: "Admin Account Created",
          message: "Your admin account has been created successfully.",
          sentBy: session.user.email,
        },
        channels: ["whatsapp", "email"],
      })
      .catch(console.error);

    return NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
