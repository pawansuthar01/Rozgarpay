import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "@/lib/cloudinary";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("profileImg") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 },
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 },
      );
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, profileImg: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete old profile image if exists
    if (user.profileImg) {
      const publicId = extractPublicId(user.profileImg);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    // Upload new profile image
    const profileImgUrl = await uploadToCloudinary(
      file,
      `Rozgarpay/users/${user.id}`,
    );

    // Update user with new profile image
    await prisma.user.update({
      where: { id: user.id },
      data: { profileImg: profileImgUrl },
    });

    return NextResponse.json({ profileImgUrl });
  } catch (error) {
    console.error("Profile image upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, profileImg: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete profile image from Cloudinary if exists
    if (user.profileImg) {
      const publicId = extractPublicId(user.profileImg);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    // Remove profile image from database
    await prisma.user.update({
      where: { id: user.id },
      data: { profileImg: null },
    });

    return NextResponse.json({ message: "Profile image deleted successfully" });
  } catch (error) {
    console.error("Profile image delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
