import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session.user.companyId) {
      return NextResponse.json(
        {
          error:
            "company id deso not exits in session me login again and try...",
        },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("logo") as File;

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

    // Get current company
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { id: true, logo: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Delete old logo if exists
    if (company.logo) {
      const publicId = extractPublicId(company.logo);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    // Upload new logo
    const logoUrl = await uploadToCloudinary(
      file,
      `Rozgarpay/companies/${company.id}`,
    );

    // Update company with new logo
    await prisma.company.update({
      where: { id: company.id },
      data: { logo: logoUrl },
    });

    return NextResponse.json({ logoUrl });
  } catch (error) {
    console.error("Logo upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!session.user.companyId) {
      return NextResponse.json(
        {
          error:
            "company id deso not exits in session me login again and try...",
        },
        { status: 404 },
      );
    }
    // Get current company
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { id: true, logo: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Delete logo from Cloudinary if exists
    if (company.logo) {
      const publicId = extractPublicId(company.logo);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    // Remove logo from database
    await prisma.company.update({
      where: { id: company.id },
      data: { logo: null },
    });

    return NextResponse.json({ message: "Logo deleted successfully" });
  } catch (error) {
    console.error("Logo delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
