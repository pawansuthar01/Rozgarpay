import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";
import { uploadImage } from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    if (
      !file.type.startsWith("image/") ||
      !["image/jpeg", "image/png"].includes(file.type)
    ) {
      return NextResponse.json(
        { error: "Only JPG and PNG images are allowed" },
        { status: 400 }
      );
    }

    const imageUrl = await uploadImage(file, "attendance");

    const userId = session.user.id;
    const companyId = session.user.companyId;

    if (!companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }

    // Normalize today date (important for @db.Date + unique constraint)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for open attendance (same day, not punched out)
    const openAttendance = await prisma.attendance.findFirst({
      where: {
        userId,
        companyId,
        attendanceDate: today,
        punchOut: null,
      },
    });

    let attendance;

    if (openAttendance) {
      // ❌ Block update if already approved
      if (openAttendance.status === "APPROVED") {
        return NextResponse.json(
          { error: "Approved attendance cannot be updated" },
          { status: 400 }
        );
      }

      // ✅ Punch out
      attendance = await prisma.attendance.update({
        where: { id: openAttendance.id },
        data: {
          punchOut: new Date(),
        },
      });

      // ✅ Audit log (generic)
      await prisma.auditLog.create({
        data: {
          userId,
          action: "UPDATED",
          entity: "ATTENDANCE",
          entityId: attendance.id,
          meta: {
            type: "PUNCH_OUT",
          },
        },
      });
    } else {
      // ✅ Punch in
      attendance = await prisma.attendance.create({
        data: {
          userId,
          companyId,
          attendanceDate: today,
          punchIn: new Date(),
          imageUrl,
        },
      });

      // ✅ Audit log (generic)
      await prisma.auditLog.create({
        data: {
          userId,
          action: "CREATED",
          entity: "ATTENDANCE",
          entityId: attendance.id,
          meta: {
            type: "PUNCH_IN",
          },
        },
      });
    }

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
