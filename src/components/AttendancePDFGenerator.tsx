"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatHoursToHM, getCurrentTime } from "@/lib/utils";
import { User } from "next-auth";

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
  user: User | null;
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

export const generateAttendancePDF = ({
  data,
  month,
  year,
  companyName = "Company",
}: AttendancePDFGeneratorProps) => {
  const doc = new jsPDF();

  // Colors
  const primaryColor = [41, 128, 185]; // Blue
  const secondaryColor = [52, 73, 94]; // Dark Gray
  const accentColor = [46, 204, 113]; // Green

  // Header
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${companyName || "PayRollBook"} - Attendance Report`, 20, 20);

  // Employee Info - Compact SaaS style
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

  // Create a compact info box
  doc.setFillColor(248, 249, 250);
  doc.rect(20, 25, 170, 15, "F");
  doc.setDrawColor(222, 226, 230);
  doc.setLineWidth(0.5);
  doc.rect(20, 25, 170, 15);

  doc.text(
    `Employee: ${data?.user?.firstName} ${data?.user?.lastName}`,
    25,
    32,
  );
  doc.text(`Phone: ${data?.user?.phone}`, 25, 38);
  doc.text(
    `Period: ${new Date(year, month - 1).toLocaleString("default", { month: "long" })} ${year}`,
    25,
    44,
  );

  // Summary Section
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Attendance Summary", 20, 50);

  // Summary boxes - Better layout with 2 columns
  const summaryData = [
    { label: "Total Days", value: data.summary.totalDays },
    { label: "Present Days", value: data.summary.presentDays },
    { label: "Absent Days", value: data.summary.absentDays },
    { label: "Late Days", value: data.summary.lateDays },
    {
      label: "Total Hours",
      value: data.summary.totalHours
        ? formatHoursToHM(data.summary.totalHours)
        : "0:00",
    },
  ];

  let yPos = 60;
  summaryData.forEach((item, index) => {
    const xPos = 20 + (index % 2) * 85;
    if (index % 2 === 0 && index > 0) yPos += 18;

    // Background box
    doc.setFillColor(248, 249, 250);
    doc.rect(xPos, yPos - 2, 75, 14, "F");

    // Border
    doc.setDrawColor(222, 226, 230);
    doc.setLineWidth(0.5);
    doc.rect(xPos, yPos - 2, 75, 14);

    // Text
    doc.setFontSize(6);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(item.label, xPos + 2, yPos + 3);

    doc.setFontSize(8);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(item.value.toString(), xPos + 2, yPos + 9);
  });

  // Attendance Records Table
  const tableData = data.records.map((record) => [
    `${data?.user?.firstName} ${data?.user?.lastName}`,
    new Date(record.attendanceDate).toLocaleDateString(),
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
      [
        "Staff Name",
        "Date",
        "Day",
        "Punch In",
        "Punch Out",
        "Hours",
        "Late",
        "OT Hours",
        "Status",
      ],
    ],
    body: tableData,
    startY: yPos + 25,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },
    margin: { top: 20 },
  });

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generated on ${getCurrentTime().toLocaleString()}`,
    20,
    pageHeight - 20,
  );
  doc.text("PayRollBook - Attendance Management System", 20, pageHeight - 10);

  // Save the PDF
  const fileName = `${data?.user?.firstName}_${data?.user?.lastName}_attendance_${month}_${year}.pdf`;
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
