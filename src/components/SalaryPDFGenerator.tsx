"use client";

import { getCurrentTime } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { User } from "next-auth";

interface SalaryTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  date: string;
}

interface SalaryReportData {
  user: User | null;
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

export const generateSalaryPDF = ({
  data,
  companyName = "Company",
}: SalaryPDFGeneratorProps) => {
  const doc = new jsPDF();

  // Colors
  const primaryColor = [41, 128, 185]; // Blue
  const secondaryColor = [52, 73, 94]; // Dark Gray
  const successColor = [46, 204, 113]; // Green
  const dangerColor = [231, 76, 60]; // Red

  // Header
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${companyName || "PayRollBook"} - Salary Report`, 20, 20);

  // Employee Info - Compact SaaS style
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

  // Create a compact info box
  doc.setFillColor(288, 289, 280);
  doc.rect(20, 25, 170, 15, "F");
  doc.setDrawColor(222, 226, 230);
  doc.setLineWidth(0.5);
  doc.rect(20, 25, 170, 22);

  doc.text(
    `Employee: ${data?.user?.firstName} ${data?.user?.lastName}`,
    25,
    32,
  );
  doc.text(`Phone: ${data?.user?.phone}`, 25, 38);
  doc.text(
    `Period: ${new Date(data.year, data.month - 1).toLocaleString("default", { month: "long" })} ${data.year}`,
    25,
    44,
  );

  // Summary Section
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Salary Summary", 20, 52);

  // Summary boxes - Better layout with 2 columns
  const summaryData = [
    {
      label: "Gross Amount",
      value: data.grossAmount,
      color: primaryColor,
    },
    {
      label: "Net Amount",
      value: data.netAmount,
      color: successColor,
    },
    {
      label: "Total Paid",
      value: data.totalPaid,
      color: successColor,
    },
    {
      label: "Total Recovered",
      value: data.totalRecovered,
      color: dangerColor,
    },
    {
      label: "Balance Amount",
      value: data.balanceAmount,
      color: primaryColor,
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
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(
      `Rs. ${Number(item.value.toString().replace(/[^\d.-]/g, "")).toFixed(2)}`,
      xPos + 2,
      yPos + 9,
    );
  });

  // Payments Section
  if (data.payments.length > 0) {
    const paymentsTableData = data.payments.map((payment) => [
      `${data?.user?.firstName} ${data?.user?.lastName}`,
      new Date(payment.date).toLocaleDateString(),
      payment.description,
      payment.type,
      `Rs. ${Math.abs(Number(payment.amount.toString().replace(/[^\d.-]/g, ""))).toFixed(2)}`,
    ]);

    autoTable(doc, {
      head: [["Staff Name", "Date", "Description", "Type", "Amount"]],
      body: paymentsTableData,
      startY: yPos + 25,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [successColor[0], successColor[1], successColor[2]],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      margin: { top: 20 },
      didDrawPage: function (data) {
        // Add section title
        doc.setFontSize(12);
        doc.setTextColor(successColor[0], successColor[1], successColor[2]);
        doc.text("Payments Made to Employee", 20, data.settings.startY - 5);
      },
    });
  }

  // Deductions & Recoveries Section
  const combinedDeductions = [
    ...data.deductions.map((d) => ({ ...d, category: "Deduction" })),
    ...data.recoveries.map((r) => ({ ...r, category: "Recovery" })),
  ];

  if (combinedDeductions.length > 0) {
    const deductionsTableData = combinedDeductions.map((item) => [
      `${data?.user?.firstName} ${data?.user?.lastName}`,
      new Date(item.date).toLocaleDateString(),
      item.description,
      item.category,
      item.type,
      `Rs. ${Math.abs(Number(item.amount.toString().replace(/[^\d.-]/g, ""))).toFixed(2)}`,
    ]);

    // Calculate start position based on whether payments table exists
    const startY =
      data.payments.length > 0
        ? (doc as any).lastAutoTable.finalY + 15
        : yPos + 25;

    autoTable(doc, {
      head: [
        ["Staff Name", "Date", "Description", "Category", "Type", "Amount"],
      ],
      body: deductionsTableData,
      startY: startY,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [dangerColor[0], dangerColor[1], dangerColor[2]],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      margin: { top: 20 },
      didDrawPage: function (data) {
        // Add section title
        doc.setFontSize(12);
        doc.setTextColor(dangerColor[0], dangerColor[1], dangerColor[2]);
        doc.text("Deductions & Recoveries", 20, data.settings.startY - 5);
      },
    });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generated on ${getCurrentTime().toLocaleString()}`,
    20,
    pageHeight - 20,
  );
  doc.text("PayRollBook - Salary Management System", 20, pageHeight - 10);

  // Save the PDF
  const fileName = `${data?.user?.firstName}_${data?.user?.lastName}_salary_${data.month}_${data.year}.pdf`;
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
