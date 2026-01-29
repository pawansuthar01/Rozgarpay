import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, params: any) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "id is required " }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: id },
      select: {
        phone: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message: "User profile fetched successfully",
      data: user,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch user profile" + error },
      { status: 500 },
    );
  }
}
