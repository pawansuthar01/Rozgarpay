"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SalaryTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  date: string;
}

interface SalaryReportData {
  user: {
    firstName: string | null;
    lastName: string | null;
    phone?: string | null;
  } | null;
  month: number;
  year: number;
  grossAmount: number;
  netAmount: number;
  totalPaid: number;
  totalRecovered: number;
  balanceAmount: number;
  payments: SalaryTransaction[];
  deductions: SalaryTransaction[];
  recoveries: SalaryTransaction[];
}

interface SalaryPDFGeneratorProps {
  data: SalaryReportData;
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

const formatCurrency = (amount: number): string => {
  return `₹${Number(amount.toString().replace(/[^\d.-]/g, "")).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const generateSalaryPDF = ({
  data,
  companyName = "Rozgarpay",
}: SalaryPDFGeneratorProps) => {
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
    const monthName = new Date(data.year, data.month - 1).toLocaleString(
      "default",
      { month: "long" },
    );
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${monthName} ${data.year}`, pageWidth - margin, yPos + 12, {
      align: "right",
    });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.secondary);
    doc.text("Pay Period", pageWidth - margin, yPos + 20, { align: "right" });

    return yPos + 38;
  };

  const addSummaryCards = (yPos: number): number => {
    // Section Title
    doc.setTextColor(...COLORS.secondary);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Salary Summary", margin, yPos);

    const summaryItems = [
      {
        label: "Gross Salary",
        value: data.grossAmount,
        color: COLORS.primary,
        icon: "💰",
      },
      {
        label: "Net Salary",
        value: data.netAmount,
        color: COLORS.success,
        icon: "✅",
      },
      {
        label: "Total Paid",
        value: data.totalPaid,
        color: COLORS.primaryLight,
        icon: "💵",
      },
      {
        label: "Deductions",
        value: data.totalRecovered,
        color: COLORS.danger,
        icon: "📉",
      },
      {
        label: "Balance",
        value: data.balanceAmount,
        color: COLORS.warning,
        icon: "⚖️",
      },
    ];

    const cardWidth = (contentWidth - 10) / 3;
    const cardHeight = 22;

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
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...item.color);
      doc.text(formatCurrency(item.value), xPos + 4, cardY + 16);
    });

    return yPos + 8 + Math.ceil(summaryItems.length / 3) * (cardHeight + 4) + 5;
  };

  const addTable = (
    title: string,
    tableData: any[],
    columns: { header: string; key: string }[],
    startY: number,
    color: Color,
  ): number => {
    if (tableData.length === 0) return startY;

    // Section title
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color);
    doc.text(title, margin, startY);

    const formattedData = tableData.map((item) =>
      columns.map((col) => {
        if (col.key === "amount" || col.key === "value") {
          return formatCurrency(item[col.key] || 0);
        }
        if (col.key === "date") {
          return new Date(item[col.key]).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        }
        return item[col.key] || "N/A";
      }),
    );

    autoTable(doc, {
      head: [columns.map((col) => col.header)],
      body: formattedData,
      startY: startY + 3,
      theme: "striped",
      styles: {
        fontSize: 8,
        cellPadding: 3,
        lineColor: COLORS.border,
        lineWidth: 0.3,
      },
      headStyles: {
        fillColor: color,
        textColor: COLORS.white,
        fontStyle: "bold",
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: COLORS.light,
      },
      margin: { left: margin, right: margin },
    });

    return (doc as any).lastAutoTable?.finalY || startY + 20;
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
      `${companyName || "Rozgarpay"} - Payroll Management System`,
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
  addHeader("SALARY SLIP", "Detailed Salary Report");

  let yPos = 55;
  yPos = addEmployeeCard(yPos);
  yPos = addSummaryCards(yPos);

  // Payments Table
  yPos = addTable(
    "💵 Payments Received",
    data.payments,
    [
      { header: "Date", key: "date" },
      { header: "Description", key: "description" },
      { header: "Type", key: "type" },
      { header: "Amount", key: "amount" },
    ],
    yPos + 10,
    COLORS.success,
  );

  // Deductions Table
  const allDeductions = [
    ...data.deductions.map((d) => ({ ...d, category: "Deduction" })),
    ...data.recoveries.map((r) => ({ ...r, category: "Recovery" })),
  ];

  if (allDeductions.length > 0) {
    yPos = addTable(
      "📉 Deductions & Recoveries",
      allDeductions,
      [
        { header: "Date", key: "date" },
        { header: "Description", key: "description" },
        { header: "Category", key: "category" },
        { header: "Type", key: "type" },
        { header: "Amount", key: "amount" },
      ],
      yPos + 10,
      COLORS.danger,
    );
  }

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
  const fileName = `${data?.user?.firstName || "staff"}_salary_${data.month}_${data.year}.pdf`;
  doc.save(fileName);
};

interface SalaryPDFGeneratorComponentProps extends SalaryPDFGeneratorProps {
  children: React.ReactNode;
  className?: string;
}

export default function SalaryPDFGenerator({
  data,
  companyName,
  children,
  className = "",
}: SalaryPDFGeneratorComponentProps) {
  const handleGeneratePDF = () => {
    if (!data.user) {
      return {
        message: "User data is missing",
        success: false,
      };
    }
    generateSalaryPDF({ data, companyName });
    return;
  };

  return (
    <button onClick={handleGeneratePDF} className={className}>
      {children}
    </button>
  );
}
