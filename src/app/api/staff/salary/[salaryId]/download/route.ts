import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import PDFDocument from "pdfkit";

export async function GET(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const salary = await prisma.salary.findFirst({
      where: {
        id: params.salaryId,
        userId: session.user.id,
        status: "PAID", // Only allow download for paid salaries
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            joiningDate: true,
          },
        },
        company: {
          select: {
            name: true,
            description: true,
          },
        },
        breakdowns: true,
        approvedByUser: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!salary) {
      return NextResponse.json(
        { error: "Salary not found or not paid" },
        { status: 404 },
      );
    }

    // Create PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    // Set response headers
    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {});

    // Company Header
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(salary.company.name, { align: "center" })
      .moveDown(0.5);

    if (salary.company.description) {
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(salary.company.description, { align: "center" })
        .moveDown(1);
    }

    // Title
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("SALARY SLIP", { align: "center" })
      .moveDown(0.5);

    doc
      .fontSize(14)
      .text(
        `${new Date(salary.year, salary.month - 1).toLocaleString("default", {
          month: "long",
          year: "numeric",
        })}`,
        { align: "center" },
      )
      .moveDown(1);

    // Employee Details
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Employee Details")
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Name: ${salary.user.firstName} ${salary.user.lastName}`)
      .text(`Email: ${salary.user.email}`);

    if (salary.user.joiningDate) {
      doc.text(
        `Joining Date: ${new Date(salary.user.joiningDate).toLocaleDateString()}`,
      );
    }

    doc.moveDown(1);

    // Salary Period
    doc.fontSize(14).font("Helvetica-Bold").text("Salary Period").moveDown(0.5);

    doc
      .fontSize(12)
      .font("Helvetica")
      .text(
        `Month: ${new Date(salary.year, salary.month - 1).toLocaleString("default", { month: "long" })}`,
      )
      .text(`Year: ${salary.year}`)
      .text(`Status: ${salary.status}`)
      .moveDown(1);

    // Attendance Summary
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Attendance Summary")
      .moveDown(0.5);

    const attendanceData = [
      {
        label: "Full Days",
        value: salary.totalWorkingDays - salary.halfDays - salary.absentDays,
      },
      { label: "Half Days", value: salary.halfDays },
      { label: "Absent Days", value: salary.absentDays },
      { label: "Late Minutes", value: salary.lateMinutes },
    ];

    attendanceData.forEach((item) => {
      doc.fontSize(12).font("Helvetica").text(`${item.label}: ${item.value}`);
    });

    doc.moveDown(1);

    // Earnings
    doc.fontSize(14).font("Helvetica-Bold").text("Earnings").moveDown(0.5);

    const earnings = salary.breakdowns.filter((b) =>
      ["BASE_SALARY", "OVERTIME"].includes(b.type),
    );

    earnings.forEach((breakdown) => {
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(
          `${breakdown.description}: ₹${breakdown.amount.toLocaleString()}`,
        );
    });

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`Total Earnings: ₹${salary.grossAmount.toLocaleString()}`)
      .moveDown(1);

    // Deductions
    doc.fontSize(14).font("Helvetica-Bold").text("Deductions").moveDown(0.5);

    const deductions = salary.breakdowns.filter((b) =>
      [
        "PF_DEDUCTION",
        "ESI_DEDUCTION",
        "LATE_PENALTY",
        "ABSENCE_DEDUCTION",
      ].includes(b.type),
    );

    deductions.forEach((breakdown) => {
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(
          `${breakdown.description}: ₹${Math.abs(breakdown.amount).toLocaleString()}`,
        );
    });

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`Total Deductions: ₹${salary.deductions.toLocaleString()}`)
      .moveDown(1);

    // Net Pay
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text(`Net Pay: ₹${salary.netAmount.toLocaleString()}`, {
        align: "center",
      })
      .moveDown(1);

    // Footer
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Generated on: ${new Date().toLocaleDateString()}`, {
        align: "left",
      })
      .text("This is a system-generated payslip", { align: "right" });

    if (salary.approvedByUser) {
      doc
        .fontSize(10)
        .text(
          `Approved by: ${salary.approvedByUser.firstName} ${salary.approvedByUser.lastName}`,
          { align: "left" },
        );
    }

    doc.end();

    // Wait for PDF to be generated
    await new Promise((resolve) => {
      doc.on("end", resolve);
    });

    const pdfBuffer = Buffer.concat(buffers);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SalarySlip_${salary.month}_${salary.year}_${salary.user.firstName}_${salary.user.lastName}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
