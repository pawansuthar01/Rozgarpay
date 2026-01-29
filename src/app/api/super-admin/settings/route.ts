import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const skip = (page - 1) * limit;

    const where: any = {};

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { key: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    const [settings, total] = await Promise.all([
      prisma.systemSetting.findMany({
        where,
        orderBy: [{ category: "asc" }, { key: "asc" }],
        skip,
        take: limit,
      }),
      prisma.systemSetting.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      settings,
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

    const { category, key, value, description, isPublic } =
      await request.json();

    if (!category || !key || value === undefined) {
      return NextResponse.json(
        { error: "Category, key, and value are required" },
        { status: 400 },
      );
    }

    // Check if setting already exists
    const existingSetting = await prisma.systemSetting.findUnique({
      where: {
        category_key: {
          category,
          key,
        },
      },
    });

    let setting;
    if (existingSetting) {
      // Update existing setting
      setting = await prisma.systemSetting.update({
        where: {
          category_key: {
            category,
            key,
          },
        },
        data: {
          value: JSON.stringify(value),
          description,
          isPublic: isPublic || false,
        },
      });
    } else {
      // Create new setting
      setting = await prisma.systemSetting.create({
        data: {
          category,
          key,
          value: JSON.stringify(value),
          description,
          isPublic: isPublic || false,
        },
      });
    }

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: existingSetting ? "UPDATED" : "CREATED",
          entity: "SYSTEM_SETTING",
          entityId: setting.id,
          meta: {
            category,
            key,
            oldValue: existingSetting ? existingSetting.value : null,
            newValue: setting.value,
          },
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({ setting });
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

    const { id, category, key, value, description, isPublic } =
      await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Setting ID is required" },
        { status: 400 },
      );
    }

    const existingSetting = await prisma.systemSetting.findUnique({
      where: { id },
    });

    if (!existingSetting) {
      return NextResponse.json({ error: "Setting not found" }, { status: 404 });
    }

    const setting = await prisma.systemSetting.update({
      where: { id },
      data: {
        category: category || existingSetting.category,
        key: key || existingSetting.key,
        value:
          value !== undefined ? JSON.stringify(value) : existingSetting.value,
        description:
          description !== undefined ? description : existingSetting.description,
        isPublic: isPublic !== undefined ? isPublic : existingSetting.isPublic,
      },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATED",
          entity: "SYSTEM_SETTING",
          entityId: setting.id,
          meta: {
            category: setting.category,
            key: setting.key,
            oldValue: existingSetting.value,
            newValue: setting.value,
          },
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({ setting });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Setting ID is required" },
        { status: 400 },
      );
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { id },
    });

    if (!setting) {
      return NextResponse.json({ error: "Setting not found" }, { status: 404 });
    }

    await prisma.systemSetting.delete({
      where: { id },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DELETED",
          entity: "SYSTEM_SETTING",
          entityId: id,
          meta: {
            category: setting.category,
            key: setting.key,
            value: setting.value,
          },
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
