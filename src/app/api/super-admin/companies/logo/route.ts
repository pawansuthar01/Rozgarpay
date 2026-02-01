import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

import {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "@/lib/cloudinary";

// Helper function to generate a temporary company ID for logo upload
function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("logo") as File;
    const companyId = formData.get("companyId") as string | null;

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

    // If companyId is provided, check if company exists
    let existingCompany = null;
    if (companyId) {
      existingCompany = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, logo: true },
      });

      if (!existingCompany) {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 },
        );
      }
    }

    // Delete old logo if exists and we're updating an existing company
    if (existingCompany?.logo) {
      const publicId = extractPublicId(existingCompany.logo);
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }
    }

    // Upload new logo
    const folder = existingCompany
      ? `Rozgarpay/companies/${existingCompany.id}`
      : `Rozgarpay/companies/temp`;
    const logoUrl = await uploadToCloudinary(file, folder);

    // If we have a companyId, update the company with the new logo
    if (companyId) {
      await prisma.company.update({
        where: { id: companyId },
        data: { logo: logoUrl },
      });
    }

    return NextResponse.json({ logoUrl, companyId: companyId || null });
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

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 },
      );
    }

    // Get current company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
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
      where: { id: companyId },
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
