import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        {
          error: "userId is requite to fetching data ",
        },
        { status: 404 },
      );
    }
    const user = await prisma.user.findUnique({
      where: { id: userId, status: "ACTIVE" },
      select: {
        lastName: true,
        firstName: true,
        email: true,
        phone: true,
      },
    });
    if (!userId) {
      return NextResponse.json(
        {
          error: "user data  not  found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        message: "successfully data fetched",
        data: user,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
