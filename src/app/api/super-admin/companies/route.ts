import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

import { notificationManager } from "@/lib/notifications/manager";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} from "@/lib/cloudinary";
import { getDate } from "@/lib/attendanceUtils";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Check if it's a bulk operation
    if (body.bulk && Array.isArray(body.operations)) {
      const results = [];
      for (const operation of body.operations) {
        if (
          operation.type === "status_update" &&
          operation.ids &&
          operation.status
        ) {
          const updatedCompanies = await prisma.company.updateMany({
            where: { id: { in: operation.ids } },
            data: { status: operation.status },
          });
          results.push({
            type: "status_update",
            count: updatedCompanies.count,
          });

          // Audit log for bulk operations
          try {
            await prisma.auditLog.create({
              data: {
                userId: session.user.id,
                action: "UPDATED",
                entity: "COMPANY",
                entityId: operation.ids.join(","),
                meta: {
                  bulk: true,
                  status: operation.status,
                  count: updatedCompanies.count,
                },
              },
            });
          } catch (auditError) {
            console.error(
              "Failed to create audit log for bulk update:",
              auditError,
            );
            // Don't fail the request if audit log fails
          }
        } else if (operation.type === "delete" && operation.ids) {
          // Check if companies have data
          const companiesWithData = await prisma.company.findMany({
            where: { id: { in: operation.ids } },
            include: {
              _count: {
                select: {
                  users: true,
                  attendances: true,
                  salaries: true,
                  reports: true,
                },
              },
            },
          });

          const companiesToDelete = companiesWithData.filter(
            (company) =>
              company._count.users === 0 &&
              company._count.attendances === 0 &&
              company._count.salaries === 0 &&
              company._count.reports === 0,
          );

          if (companiesToDelete.length > 0) {
            const deletedCompanies = await prisma.company.deleteMany({
              where: { id: { in: companiesToDelete.map((c) => c.id) } },
            });
            results.push({ type: "delete", count: deletedCompanies.count });

            // Audit log for bulk delete
            try {
              await prisma.auditLog.create({
                data: {
                  userId: session.user.id,
                  action: "DELETED",
                  entity: "COMPANY",
                  entityId: companiesToDelete.map((c) => c.id).join(","),
                  meta: {
                    bulk: true,
                    count: deletedCompanies.count,
                  },
                },
              });
            } catch (auditError) {
              console.error(
                "Failed to create audit log for bulk delete:",
                auditError,
              );
              // Don't fail the request if audit log fails
            }
          }
        }
      }
      return NextResponse.json({ results });
    }

    // Single company creation with invitation
    const { name, description, adminEmail, adminPhone, role, logo } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 },
      );
    }

    if (!adminEmail || !adminPhone) {
      return NextResponse.json(
        { error: "Admin email and phone are required" },
        { status: 400 },
      );
    }

    // Check if email or phone already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: adminEmail }, { phone: adminPhone }],
      },
    });
    const invitationExits = await prisma.companyInvitation.findFirst({
      where: {
        OR: [{ email: adminEmail }, { phone: adminPhone }],
      },
    });

    if (existingUser || invitationExits) {
      return NextResponse.json(
        { error: "Admin email or phone already exists" },
        { status: 400 },
      );
    }

    const company = await prisma.company.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        logo: logo || null,
      },
    });

    // Generate unique token for invitation
    const token = crypto.randomUUID();
    const expiresAt = getDate(new Date());
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await prisma.companyInvitation.create({
      data: {
        role,
        companyId: company.id,
        email: adminEmail,
        phone: adminPhone,
        token,
        expiresAt,
      },
    });

    const joinLink = `${process.env.NEXT_PUBLIC_NEXTAUTH_URL}/join/${token}`;

    // Send notifications using the notification service
    const message = `Your company "${company.name}" has been registered successfully. Create your account as company owner and let's start managing your staff. Join now: ${joinLink}`;

    await notificationManager.sendExternalInvitation(
      adminEmail,
      adminPhone,
      ["email", "whatsapp"],
      {
        type: "company_join_link",
        role: "admin",
        companyName: name,
        token: token,
        expiresAt: invitation.expiresAt.toISOString(),
        message,
      },
    );

    // ✅ Audit log
    try {
      prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATED",
          entity: "COMPANY",
          entityId: company.id,
          meta: {
            name: company.name,
            adminEmail,
            adminPhone,
            invitationId: invitation.id,
          },
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
      // Don't fail the request if audit log fails
    }

    return NextResponse.json({
      company,
      invitation: {
        id: invitation.id,
        joinLink,
        expiresAt: invitation.expiresAt,
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              attendances: true,
              salaries: true,
              reports: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      prisma.company.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      companies,
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
