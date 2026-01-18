import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import jsPDF from "jspdf";

/* ================= HELPERS ================= */

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const monthRange = (year: number, month: number) => ({
  start: new Date(year, month - 1, 1),
  end: new Date(year, month, 1),
  daysInMonth: new Date(year, month, 0).getDate(),
});

const attendanceStatus = (a: any) => {
  if (!a?.punchIn) return "A";
  if (a.workingHours !== null && a.workingHours < 4) return "HD";
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
    attendances.forEach((a) =>
      attendanceMap.set(a.attendanceDate.getDate(), attendanceStatus(a)),
    );

    /* ---------- PDF ---------- */
    const pdf = new jsPDF("p", "mm", "a4");
    let y = 14;

    const box = (x: number, y: number, w: number, h: number) =>
      pdf.rect(x, y, w, h);

    const text = (
      t: string,
      x: number,
      y: number,
      size = 9,
      bold = false,
      align: "left" | "center" | "right" = "left",
    ) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      pdf.text(t, x, y, { align });
    };

    /* HEADER */
    text(salary.company.name, 105, y, 14, true, "center");
    text(
      `Salary Slip (${start.toLocaleDateString("en-GB")} - ${new Date(
        year,
        month,
        0,
      ).toLocaleDateString("en-GB")})`,
      105,
      (y += 7),
      10,
      false,
      "center",
    );
    y += 8;

    /* PAYMENT */
    box(10, y, 190, 18);
    text("Net Payable", 12, y + 11, 10);
    text(
      `₹ ${salary.netAmount.toLocaleString()}`,
      198,
      y + 11,
      11,
      true,
      "right",
    );
    y += 26;

    /* ATTENDANCE SUMMARY */
    text("Attendance Summary", 10, y, 11, true);
    y += 4;

    const present =
      salary.totalWorkingDays - salary.absentDays - salary.halfDays;

    const summary = [
      ["Present", present],
      ["Absent", salary.absentDays],
      ["Half Day", salary.halfDays],
      ["Overtime (Hrs)", salary.overtimeHours],
    ];

    summary.forEach(([l, v]) => {
      box(10, y, 95, 8);
      box(105, y, 95, 8);
      text(String(l), 12, y + 5);
      text(String(v), 198, y + 5, 10, true, "right");
      y += 8;
    });

    /* FULL → Calendar */
    if (type === "full") {
      y += 6;
      text("Attendance Calendar", 10, y, 11, true);
      y += 4;

      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const cellW = 27;
      const cellH = 9;

      days.forEach((d, i) => {
        box(10 + i * cellW, y, cellW, cellH);
        text(d, 10 + i * cellW + cellW / 2, y + 6, 9, true, "center");
      });

      y += cellH;

      let date = 1;
      while (date <= daysInMonth) {
        for (let i = 0; i < 7 && date <= daysInMonth; i++) {
          box(10 + i * cellW, y, cellW, cellH);
          text(
            `${date} ${attendanceMap.get(date) || "-"}`,
            12 + i * cellW,
            y + 6,
            9,
          );
          date++;
        }
        y += cellH;
      }

      y += 4;
      text(
        "P = Present | A = Absent | HD = Half Day",
        105,
        y,
        8,
        false,
        "center",
      );
    }

    text("Generated by PagarBook", 105, 290, 8, false, "center");

    return new NextResponse(Buffer.from(pdf.output("arraybuffer")), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${type}-salary-slip-${month}-${year}.pdf"`,
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
