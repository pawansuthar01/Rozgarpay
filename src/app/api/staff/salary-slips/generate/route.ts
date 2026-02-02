import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
export const dynamic = "force-dynamic";
import jsPDF from "jspdf";
import { getDate } from "@/lib/attendanceUtils";
import { toZonedTime } from "date-fns-tz";

/* ================= HELPERS ================= */

const nowLocal = toZonedTime(new Date(), "Asia/Kolkata");
const currentYear = nowLocal.getFullYear();
const currentMonth = nowLocal.getMonth() + 1;

const monthRange = (year: number, month: number) => ({
  start: new Date(year, month - 1, 1),
  end: new Date(year, month, 1),
  daysInMonth: new Date(year, month, 0).getDate(),
});

const attendanceStatus = (a: any, halfDayThreshold: number) => {
  if (!a?.punchIn) return "A";
  if (a.workingHours !== null && a.workingHours < halfDayThreshold) return "HD";
  return "P";
};

/* ================= API ================= */

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    const type = searchParams.get("type"); // summary | full

    // ⛔ Prevent future slips
    if (
      !year ||
      !month ||
      !["summary", "full"].includes(type || "") ||
      year > currentYear ||
      (year === currentYear && month > currentMonth)
    ) {
      return NextResponse.json(
        { error: "Invalid or future period selected" },
        { status: 400 },
      );
    }

    const { start, end, daysInMonth } = monthRange(year, month);

    /* ---------- FETCH SALARY ---------- */
    const salary = await prisma.salary.findUnique({
      where: {
        userId_month_year: {
          userId: session.user.id,
          year,
          month,
        },
      },
      include: {
        user: true,
        company: true,
      },
    });

    /* ---------- FETCH COMPANY SETTINGS ---------- */
    const companySettings = await prisma.company.findUnique({
      where: { id: salary?.companyId },
      select: { halfDayThresholdHours: true },
    });

    if (!salary) {
      return NextResponse.json(
        { error: "Salary not generated for this month" },
        { status: 404 },
      );
    }

    /* ---------- FETCH ATTENDANCE ---------- */
    const attendances = await prisma.attendance.findMany({
      where: {
        userId: session.user.id,
        attendanceDate: { gte: start, lt: end },
      },
    });

    const attendanceMap = new Map<number, string>();
    const halfDayThreshold = companySettings?.halfDayThresholdHours ?? 4;
    attendances.forEach((a) =>
      attendanceMap.set(
        a.attendanceDate.getDate(),
        attendanceStatus(a, halfDayThreshold),
      ),
    );

    /* ================= PROFESSIONAL PDF GENERATION ================= */
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;

    // Professional Color Palette
    const colors = {
      primary: [26, 115, 232], // Modern Blue
      primaryLight: [66, 133, 244],
      secondary: [52, 73, 94], // Professional Dark
      success: [52, 168, 83], // Professional Green
      danger: [234, 67, 53], // Professional Red
      warning: [251, 188, 5], // Amber
      info: [23, 162, 184], // Cyan
      lightGray: [245, 245, 245],
      mediumGray: [189, 189, 189],
      darkGray: [97, 97, 97],
      white: [255, 255, 255],
      accent: [103, 58, 183], // Purple
    };

    // Helper functions
    const roundedRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      style: string = "S",
    ) => {
      pdf.roundedRect(x, y, w, h, r, r, style);
    };

    const text = (
      t: string,
      x: number,
      y: number,
      size = 9,
      bold = false,
      align: "left" | "center" | "right" = "left",
      color: number[] = colors.secondary,
    ) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      pdf.setTextColor(color[0], color[1], color[2]);
      pdf.text(t, x, y, { align });
    };

    let y = 15;

    /* ==================== HEADER SECTION ==================== */
    // Premium header background
    pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    roundedRect(10, y, pageWidth - 20, 40, 4, "F");

    // Accent stripe
    pdf.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
    pdf.rect(10, y, pageWidth - 20, 3, "F");

    // Company icon
    pdf.setFontSize(24);
    pdf.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
    pdf.text("🏢", 15, y + 15);

    // Company name
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text(salary.company.name, 28, y + 14);

    // Salary Slip title
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text("SALARY SLIP", 28, y + 22);

    // Period on right
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("PERIOD:", pageWidth - 15, y + 10, { align: "right" });
    pdf.setFont("helvetica", "normal");
    const monthName = new Date(year, month - 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    pdf.text(monthName, pageWidth - 15, y + 16, { align: "right" });

    // Slip ID
    const slipId = `SLP-${year}${String(month).padStart(2, "0")}-${salary.userId.slice(-6).toUpperCase()}`;
    pdf.setFont("helvetica", "bold");
    pdf.text("SLIP ID:", pageWidth - 15, y + 23, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.text(slipId, pageWidth - 15, y + 29, { align: "right" });

    y += 48;

    /* ==================== EMPLOYEE INFORMATION ==================== */
    pdf.setFillColor(
      colors.lightGray[0],
      colors.lightGray[1],
      colors.lightGray[2],
    );
    roundedRect(10, y, pageWidth - 20, 22, 2, "F");

    // Left accent border
    pdf.setFillColor(colors.info[0], colors.info[1], colors.info[2]);
    pdf.rect(10, y, 3, 22, "F");

    // Employee icon
    pdf.setFontSize(14);
    pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.text("👤", 17, y + 10);

    // Employee details
    const employeeName =
      `${salary.user.firstName || ""} ${salary.user.lastName || ""}`.trim() ||
      "N/A";
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(
      colors.secondary[0],
      colors.secondary[1],
      colors.secondary[2],
    );
    pdf.text(employeeName, 28, y + 7);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(
      colors.darkGray[0],
      colors.darkGray[1],
      colors.darkGray[2],
    );
    pdf.text(`📧 ${salary.user.email}`, 28, y + 13);

    if (salary.user.phone) {
      pdf.text(`📱 ${salary.user.phone}`, 28, y + 18);
    }

    // Employee ID on right
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("EMPLOYEE ID:", pageWidth - 15, y + 7, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.text(salary.userId.slice(-8).toUpperCase(), pageWidth - 15, y + 13, {
      align: "right",
    });

    y += 30;

    /* ==================== NET PAYABLE CARD ==================== */
    // Large prominent card for net amount
    pdf.setFillColor(colors.success[0], colors.success[1], colors.success[2]);
    roundedRect(10, y, pageWidth - 20, 28, 3, "F");

    // Icon
    pdf.setFontSize(28);
    pdf.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
    pdf.text("💰", 18, y + 18);

    // Label
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("NET PAYABLE AMOUNT", 40, y + 12);

    // Amount
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text(`₹${salary.netAmount.toLocaleString("en-IN")}`, 40, y + 22);

    // In words
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text("(Amount payable after all deductions)", 40, y + 27);

    y += 36;

    /* ==================== ATTENDANCE SUMMARY SECTION ==================== */
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.text("📊 Attendance Summary", 10, y);

    // Decorative line
    pdf.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.setLineWidth(1);
    pdf.line(10, y + 2, 65, y + 2);

    y += 8;

    const present = salary.totalWorkingDays - salary.absentDays;

    const attendanceSummary = [
      {
        label: "Total Working Days",
        value: salary.totalWorkingDays,
        color: colors.info,
        icon: "📅",
      },
      {
        label: "Days Present",
        value: present,
        color: colors.success,
        icon: "✓",
      },
      {
        label: "Days Absent",
        value: salary.absentDays,
        color: colors.danger,
        icon: "✗",
      },
      {
        label: "Half Days",
        value: salary.halfDays,
        color: colors.warning,
        icon: "◐",
      },
      {
        label: "Overtime Hours",
        value: salary.overtimeHours,
        color: colors.accent,
        icon: "⏰",
      },
    ];

    // Create attendance cards in 2 columns
    const cardWidth = (pageWidth - 25) / 2;
    const cardHeight = 16;

    attendanceSummary.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const xPos = 10 + col * (cardWidth + 5);
      const cardY = y + row * (cardHeight + 3);

      // Card background
      pdf.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
      roundedRect(xPos, cardY, cardWidth, cardHeight, 2, "F");

      // Border
      pdf.setDrawColor(
        colors.mediumGray[0],
        colors.mediumGray[1],
        colors.mediumGray[2],
      );
      pdf.setLineWidth(0.3);
      roundedRect(xPos, cardY, cardWidth, cardHeight, 2, "S");

      // Colored left border
      pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
      pdf.rect(xPos, cardY, 2, cardHeight, "F");

      // Icon
      pdf.setFontSize(12);
      pdf.setTextColor(item.color[0], item.color[1], item.color[2]);
      pdf.text(item.icon, xPos + 5, cardY + 10);

      // Label
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(
        colors.darkGray[0],
        colors.darkGray[1],
        colors.darkGray[2],
      );
      pdf.text(item.label, xPos + 14, cardY + 7);

      // Value
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(item.color[0], item.color[1], item.color[2]);
      pdf.text(String(item.value), xPos + cardWidth - 8, cardY + 11, {
        align: "right",
      });
    });

    y += Math.ceil(attendanceSummary.length / 2) * (cardHeight + 3) + 8;

    /* ==================== ATTENDANCE CALENDAR (Full Type) ==================== */
    if (type === "full") {
      // Check if we need a new page
      if (y > pageHeight - 100) {
        pdf.addPage();
        y = 20;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      pdf.text("📅 Attendance Calendar", 10, y);

      pdf.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      pdf.setLineWidth(1);
      pdf.line(10, y + 2, 65, y + 2);

      y += 8;

      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const cellW = (pageWidth - 20) / 7;
      const cellH = 10;

      // Calendar header
      days.forEach((d, i) => {
        pdf.setFillColor(
          colors.primary[0],
          colors.primary[1],
          colors.primary[2],
        );
        pdf.rect(10 + i * cellW, y, cellW, cellH, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
        pdf.text(d, 10 + i * cellW + cellW / 2, y + 7, { align: "center" });
      });

      y += cellH;

      // Calendar dates
      let date = 1;
      const firstDay = new Date(year, month - 1, 1).getDay();
      const startCol = firstDay === 0 ? 6 : firstDay - 1; // Adjust for Monday start

      let currentRow = 0;
      let currentCol = startCol;

      while (date <= daysInMonth) {
        const status = attendanceMap.get(date) || "-";
        const xPos = 10 + currentCol * cellW;
        const yPos = y + currentRow * cellH;

        // Cell background based on status
        let bgColor = colors.white;
        if (status === "P")
          bgColor = [220, 252, 231]; // Light green
        else if (status === "A")
          bgColor = [254, 226, 226]; // Light red
        else if (status === "HD") bgColor = [254, 243, 199]; // Light yellow

        pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        pdf.rect(xPos, yPos, cellW, cellH, "F");

        // Cell border
        pdf.setDrawColor(
          colors.mediumGray[0],
          colors.mediumGray[1],
          colors.mediumGray[2],
        );
        pdf.setLineWidth(0.2);
        pdf.rect(xPos, yPos, cellW, cellH, "S");

        // Date number
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(
          colors.secondary[0],
          colors.secondary[1],
          colors.secondary[2],
        );
        pdf.text(String(date), xPos + 2, yPos + 5);

        // Status badge
        if (status !== "-") {
          let statusColor = colors.secondary;
          if (status === "P") statusColor = colors.success;
          else if (status === "A") statusColor = colors.danger;
          else if (status === "HD") statusColor = colors.warning;

          pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
          pdf.circle(xPos + cellW - 4, yPos + 7, 2.5, "F");

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(6);
          pdf.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
          pdf.text(status, xPos + cellW - 4, yPos + 8, { align: "center" });
        }

        date++;
        currentCol++;

        if (currentCol === 7) {
          currentCol = 0;
          currentRow++;
        }
      }

      y += (currentRow + 1) * cellH + 6;

      // Legend
      pdf.setFillColor(
        colors.lightGray[0],
        colors.lightGray[1],
        colors.lightGray[2],
      );
      roundedRect(10, y, pageWidth - 20, 10, 2, "F");

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(
        colors.darkGray[0],
        colors.darkGray[1],
        colors.darkGray[2],
      );

      const legendX = pageWidth / 2;
      pdf.text("P = Present  |  A = Absent  |  HD = Half Day", legendX, y + 6, {
        align: "center",
      });
    }

    /* ==================== FOOTER ==================== */
    const footerY = pageHeight - 20;

    // Footer background
    pdf.setFillColor(
      colors.lightGray[0],
      colors.lightGray[1],
      colors.lightGray[2],
    );
    pdf.rect(0, footerY, pageWidth, 20, "F");

    // Accent line
    pdf.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    pdf.setLineWidth(0.8);
    pdf.line(10, footerY + 2, pageWidth - 10, footerY + 2);

    // Footer text
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(
      colors.darkGray[0],
      colors.darkGray[1],
      colors.darkGray[2],
    );
    pdf.text("PayRollBook - Payroll Management System", 10, footerY + 7);
    pdf.text(
      "This is a computer-generated document. No signature required.",
      10,
      footerY + 12,
    );

    pdf.setFont("helvetica", "italic");
    pdf.text(
      `Generated: ${getDate(new Date()).toLocaleString("en-IN")}`,
      pageWidth - 10,
      footerY + 7,
      { align: "right" },
    );

    // Confidentiality notice
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(colors.danger[0], colors.danger[1], colors.danger[2]);
    pdf.text(
      "CONFIDENTIAL - For employee use only",
      pageWidth / 2,
      footerY + 16,
      { align: "center" },
    );

    /* ================= RETURN PDF ================= */
    return new NextResponse(Buffer.from(pdf.output("arraybuffer")), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${type}-salary-slip-${monthName.replace(" ", "-")}.pdf"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
