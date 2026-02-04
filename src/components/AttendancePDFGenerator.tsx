"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatHoursToHM, getCurrentTime } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  attendanceDate: string;
  punchIn: string | null;
  punchOut: string | null;
  status: string;
  workingHours: number;
  isLate: boolean;
  isLateMinutes?: number;
  overtimeHours: number;
  shiftDurationHours?: number;
}

interface AttendanceData {
  user: {
    firstName: string | null;
    lastName: string | null;
    phone?: string | null;
  } | null;
  records: AttendanceRecord[];
  summary: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalHours: number;
  };
}

interface AttendancePDFGeneratorProps {
  data: AttendanceData;
  month: number;
  year: number;
  companyName?: string;
}

type Color = [number, number, number];

const COLORS: Record<string, Color> = {
  primary: [30, 58, 138], // Deep Blue
  primaryLight: [59, 130, 246], // Bright Blue
  success: [22, 163, 74], // Green
  danger: [220, 38, 38], // Red
  warning: [217, 119, 6], // Amber
  secondary: [31, 41, 55], // Dark Gray
  light: [249, 250, 251], // Very Light Gray
  border: [229, 231, 235], // Light Border
  white: [255, 255, 255],
  accent: [99, 102, 241], // Indigo
};

export const generateAttendancePDF = ({
  data,
  month,
  year,
  companyName = "Rozgarpay",
}: AttendancePDFGeneratorProps) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Helper Functions
  const addHeader = (title: string, subtitle: string) => {
    // Header Background
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 45, "F");

    // Company Name
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(companyName || "Rozgarpay", margin, 20);

    // Title
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(title, margin, 30);

    // Subtitle
    doc.setFontSize(10);
    doc.text(subtitle, margin, 38);

    // Decorative line
    doc.setFillColor(...COLORS.primaryLight);
    doc.rect(0, 43, pageWidth, 2, "F");
  };

  const addEmployeeCard = (yPos: number): number => {
    // Card Background
    doc.setFillColor(...COLORS.light);
    doc.roundedRect(margin, yPos, contentWidth, 28, 3, 3, "F");

    // Left border accent
    doc.setFillColor(...COLORS.accent);
    doc.rect(margin, yPos, 4, 28, "F");

    // Employee Name
    const employeeName =
      `${data?.user?.firstName || ""} ${data?.user?.lastName || ""}`.trim() ||
      "N/A";
    doc.setTextColor(...COLORS.secondary);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(employeeName, margin + 12, yPos + 10);

    // Phone
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.secondary);
    doc.text(`📱 ${data?.user?.phone || "N/A"}`, margin + 12, yPos + 18);

    // Period
    const monthName = new Date(year, month - 1).toLocaleString("default", {
      month: "long",
    });
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${monthName} ${year}`, pageWidth - margin, yPos + 12, {
      align: "right",
    });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.secondary);
    doc.text("Attendance Period", pageWidth - margin, yPos + 20, {
      align: "right",
    });

    return yPos + 38;
  };

  const addSummaryCards = (yPos: number): number => {
    // Section Title
    doc.setTextColor(...COLORS.secondary);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Attendance Summary", margin, yPos);

    const summaryItems = [
      {
        label: "Total Days",
        value: data.summary.totalDays,
        color: COLORS.primary,
      },
      {
        label: "Present Days",
        value: data.summary.presentDays,
        color: COLORS.success,
      },
      {
        label: "Absent Days",
        value: data.summary.absentDays,
        color: COLORS.danger,
      },
      {
        label: "Late Days",
        value: data.summary.lateDays,
        color: COLORS.warning,
      },
      {
        label: "Total Hours",
        value: formatHoursToHM(data.summary.totalHours),
        color: COLORS.primaryLight,
      },
    ];

    const cardWidth = (contentWidth - 10) / 3;
    const cardHeight = 20;

    summaryItems.forEach((item, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const xPos = margin + col * (cardWidth + 5);
      const cardY = yPos + 8 + row * (cardHeight + 4);

      // Card background
      doc.setFillColor(...COLORS.white);
      doc.roundedRect(xPos, cardY, cardWidth, cardHeight, 2, 2, "F");

      // Card border
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.5);
      doc.roundedRect(xPos, cardY, cardWidth, cardHeight, 2, 2, "S");

      // Colored top border
      doc.setFillColor(...item.color);
      doc.rect(xPos, cardY, cardWidth, 2, "F");

      // Label
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.secondary);
      doc.text(item.label, xPos + 4, cardY + 8);

      // Value
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...item.color);
      doc.text(String(item.value), xPos + 4, cardY + 16);
    });

    return yPos + 8 + Math.ceil(summaryItems.length / 3) * (cardHeight + 4) + 5;
  };

  const addFooter = () => {
    const footerY = pageHeight - 20;

    // Footer background
    doc.setFillColor(...COLORS.light);
    doc.rect(0, footerY - 5, pageWidth, 25, "F");

    // Footer line
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.secondary);
    doc.setFont("helvetica", "normal");

    doc.text(
      `${companyName || "Rozgarpay"} - Attendance Management System`,
      margin,
      footerY + 5,
    );
    doc.text("Generated by Rozgarpay", pageWidth / 2, footerY + 5, {
      align: "center",
    });
    doc.text(
      new Date().toLocaleDateString("en-IN"),
      pageWidth - margin,
      footerY + 5,
      { align: "right" },
    );

    // Confidentiality
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.danger);
    doc.text(
      "CONFIDENTIAL - For authorized personnel only",
      pageWidth / 2,
      footerY + 13,
      { align: "center" },
    );
  };

  // Build PDF
  addHeader("ATTENDANCE REPORT", "Monthly Attendance Details");

  let yPos = 55;
  yPos = addEmployeeCard(yPos);
  yPos = addSummaryCards(yPos);

  // Attendance Table
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("📋 Daily Attendance Records", margin, yPos);

  const tableData = data.records.map((record) => [
    new Date(record.attendanceDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    new Date(record.attendanceDate).toLocaleDateString("en-US", {
      weekday: "short",
    }),
    record.punchIn
      ? new Date(record.punchIn).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-",
    record.punchOut
      ? new Date(record.punchOut).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-",
    record.workingHours ? formatHoursToHM(record.workingHours) : "-",
    record.isLate ? `${record.isLateMinutes || 0}m` : "-",
    formatHoursToHM(record.overtimeHours),
    record.status,
  ]);

  autoTable(doc, {
    head: [
      ["Date", "Day", "Punch In", "Punch Out", "Hours", "Late", "OT", "Status"],
    ],
    body: tableData,
    startY: yPos + 5,
    theme: "striped",
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: COLORS.border,
      lineWidth: 0.3,
      valign: "middle",
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: COLORS.light,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 18 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 18 },
      5: { cellWidth: 15 },
      6: { cellWidth: 15 },
      7: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });

  // Add footer
  addFooter();

  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, {
      align: "center",
    });
  }

  // Save the PDF
  const fileName = `${data?.user?.firstName || "staff"}_attendance_${month}_${year}.pdf`;
  doc.save(fileName);
};

interface AttendancePDFGeneratorComponentProps extends AttendancePDFGeneratorProps {
  children: React.ReactNode;
  className?: string;
}

export default function AttendancePDFGenerator({
  data,
  month,
  year,
  companyName,
  children,
  className = "",
}: AttendancePDFGeneratorComponentProps) {
  const handleGeneratePDF = () => {
    if (!data.user) {
      return {
        message: "User data is missing",
        success: false,
      };
    }
    generateAttendancePDF({ data, month, year, companyName });
    return;
  };

  return (
    <button onClick={handleGeneratePDF} className={className}>
      {children}
    </button>
  );
}
