import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";
import { sendNotification } from "@/lib/notificationService";

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
        { status: 400 }
      );
    }

    // Check if company exists and is active
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company || company.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Invalid or inactive company" },
        { status: 400 }
      );
    }

    // Check unique email and phone
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email or phone already exists" },
        { status: 400 }
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

    // Send notification
    await sendNotification({
      userId: user.id,
      companyId,
      channels: ["INAPP"],
      title: "Admin Account Created",
      message: "Your admin account has been created successfully.",
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
