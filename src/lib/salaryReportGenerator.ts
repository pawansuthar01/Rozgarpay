import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SalaryReportData {
  company: {
    id: string;
    name: string;
    address?: string;
  };
  totalPayout: number;
  staffCount: number;
  monthlyBreakdown: Array<{
    month: string;
    amount: number;
  }>;
  staffBreakdown: Array<{
    userId: string;
    user: {
      firstName: string | null;
      lastName: string | null;
      phone: string;
    };
    totalAmount: number;
  }>;
  statusDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  generatedBy: {
    firstName?: string | null;
    lastName?: string | null;
    phone: string | null;
  };
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
}
export type RGB = readonly [number, number, number];
export const toColor = (rgb: RGB): [number, number, number] => [
  rgb[0],
  rgb[1],
  rgb[2],
];
export const generateSalaryReportPDFBuffer = (
  data: SalaryReportData,
): Buffer => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Add PDF metadata for security
    doc.setProperties({
      title: `Salary Report - ${data.company.name}`,
      subject: "Company-Wide Salary Report",
      author:
        data.generatedBy.firstName ||
        data.generatedBy.phone ||
        "PayRollBook System",
      creator: "PayRollBook System",
      keywords: "salary, payroll, report, staff, confidential, analytics",
    });

    // Professional Color Palette
    const colors: Record<string, RGB> = {
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
      accent: [103, 58, 183], // Purple accent
    };

    // Helper function to add rounded rectangle
    const addRoundedRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      style: string = "S",
    ) => {
      doc.roundedRect(x, y, w, h, r, r, style);
    };

    // Add sophisticated diagonal watermark
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
    doc.setFontSize(60);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("CONFIDENTIAL", pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45,
    });
    doc.restoreGraphicsState();

    // ==================== HEADER SECTION ====================
    let yPos = 15;

    // Premium header background with gradient effect
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    addRoundedRect(10, yPos, pageWidth - 20, 45, 4, "F");

    // Accent stripe
    doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
    doc.rect(10, yPos, pageWidth - 20, 3, "F");

    // Company logo placeholder (using icon)
    doc.setFontSize(28);
    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
    doc.text("🏢", 18, yPos + 20);

    // Company name
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(data.company.name, 35, yPos + 18);

    // Report title
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("COMPREHENSIVE SALARY REPORT", 35, yPos + 26);

    // Company details
    if (data.company.address) {
      doc.setFontSize(8);
      let detailsY = yPos + 32;
      if (data.company.address) {
        doc.text(`📍 ${data.company.address}`, 35, detailsY);
        detailsY += 5;
      }
    }

    // Report metadata on right
    doc.setFontSize(8);
    const reportId = `CR-${Date.now().toString().slice(-8)}`;
    const generatedDate = new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    doc.setFont("helvetica", "bold");
    doc.text("Report ID:", pageWidth - 15, yPos + 12, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(reportId, pageWidth - 15, yPos + 17, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text("Generated:", pageWidth - 15, yPos + 23, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(generatedDate, pageWidth - 15, yPos + 28, { align: "right" });

    yPos += 55;

    // ==================== PERIOD INFORMATION CARD ====================
    doc.setFillColor(colors.info[0], colors.info[1], colors.info[2]);
    addRoundedRect(10, yPos, pageWidth - 20, 12, 2, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);

    const startDate = data.dateRange.startDate
      ? new Date(data.dateRange.startDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "All Time";
    const endDate = data.dateRange.endDate
      ? new Date(data.dateRange.endDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "Present";

    doc.text("📅 REPORTING PERIOD:", 15, yPos + 8);
    doc.setFont("helvetica", "normal");
    doc.text(`${startDate} → ${endDate}`, 60, yPos + 8);

    yPos += 20;

    // ==================== EXECUTIVE SUMMARY SECTION ====================
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(
      colors.secondary[0],
      colors.secondary[1],
      colors.secondary[2],
    );
    doc.text("Executive Summary", 10, yPos);

    // Decorative line
    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(1.5);
    doc.line(10, yPos + 2, 50, yPos + 2);

    yPos += 10;

    // Key Metrics Cards
    const avgPerStaff =
      data.staffCount > 0 ? data.totalPayout / data.staffCount : 0;

    const summaryCards = [
      {
        label: "Total Payout",
        value: data.totalPayout,
        color: colors.success,
        icon: "💰",
        format: "currency",
        description: "Aggregate disbursement",
      },
      {
        label: "Staff Count",
        value: data.staffCount,
        color: colors.primary,
        icon: "👥",
        format: "number",
        description: "Active employees",
      },
      {
        label: "Average Per Staff",
        value: avgPerStaff,
        color: colors.warning,
        icon: "📊",
        format: "currency",
        description: "Mean compensation",
      },
      {
        label: "Transactions",
        value: data.staffBreakdown.length,
        color: colors.info,
        icon: "📝",
        format: "number",
        description: "Total records",
      },
    ];

    // Calculate high/low earners
    if (data.staffBreakdown.length > 0) {
      const amounts = data.staffBreakdown
        .map((s) => s.totalAmount)
        .sort((a, b) => b - a);
      const highest = amounts[0];
      const lowest = amounts[amounts.length - 1];

      summaryCards.push({
        label: "Highest Payout",
        value: highest,
        color: colors.accent,
        icon: "⭐",
        format: "currency",
        description: "Maximum single payout",
      });

      summaryCards.push({
        label: "Lowest Payout",
        value: lowest,
        color: colors.danger,
        icon: "📉",
        format: "currency",
        description: "Minimum single payout",
      });
    }

    // Draw summary cards in grid (3 per row)
    const cardWidth = (pageWidth - 30) / 3;
    const cardHeight = 28;
    const cardSpacing = 5;

    summaryCards.forEach((card, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const xPos = 10 + col * (cardWidth + cardSpacing);
      const cardY = yPos + row * (cardHeight + cardSpacing);

      // Card background with shadow effect
      doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
      addRoundedRect(xPos + 0.5, cardY + 0.5, cardWidth, cardHeight, 3, "F");
      doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
      addRoundedRect(xPos, cardY, cardWidth, cardHeight, 3, "F");

      // Colored top accent
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      const cornerRadius = 3;
      doc.rect(xPos, cardY, cardWidth, 3, "F");

      // Card border
      doc.setDrawColor(
        colors.mediumGray[0],
        colors.mediumGray[1],
        colors.mediumGray[2],
      );
      doc.setLineWidth(0.3);
      addRoundedRect(xPos, cardY, cardWidth, cardHeight, 3, "S");

      // Icon
      doc.setFontSize(16);
      doc.text(card.icon, xPos + 4, cardY + 12);

      // Label
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(
        colors.darkGray[0],
        colors.darkGray[1],
        colors.darkGray[2],
      );
      doc.text(card.label, xPos + 15, cardY + 9);

      // Value
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(card.color[0], card.color[1], card.color[2]);
      let displayValue = "";
      if (card.format === "currency") {
        displayValue = `₹${Number(card.value).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      } else {
        displayValue = card.value.toString();
      }
      doc.text(displayValue, xPos + 15, cardY + 17);

      // Description
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(
        colors.darkGray[0],
        colors.darkGray[1],
        colors.darkGray[2],
      );
      doc.text(card.description, xPos + 15, cardY + 23);
    });

    yPos +=
      Math.ceil(summaryCards.length / 3) * (cardHeight + cardSpacing) + 12;

    // ==================== MONTHLY BREAKDOWN SECTION ====================
    if (data.monthlyBreakdown && data.monthlyBreakdown.length > 0) {
      // Section header
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("📈 Monthly Payout Breakdown", 10, yPos);

      yPos += 5;

      const monthlyTableData = data.monthlyBreakdown.map((item) => {
        const percentage =
          data.totalPayout > 0
            ? ((item.amount / data.totalPayout) * 100).toFixed(1) + "%"
            : "0%";

        return [
          item.month,
          `₹${item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          percentage,
        ];
      });

      autoTable(doc, {
        head: [["Month", "Amount", "% of Total"]],
        body: monthlyTableData,
        startY: yPos,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 5,
          lineColor: [230, 230, 230],
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [colors.primary[0], colors.primary[1], colors.primary[2]],
          textColor: toColor(colors.white),
          fontStyle: "bold",
          fontSize: 9,
          halign: "center",
        },
        bodyStyles: {
          halign: "left",
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        columnStyles: {
          0: { cellWidth: 50, halign: "left" },
          1: { cellWidth: 60, halign: "right", fontStyle: "bold" },
          2: {
            cellWidth: 30,
            halign: "center",
            textColor: [
              colors.success[0],
              colors.success[1],
              colors.success[2],
            ],
          },
        },
        margin: { left: 10, right: 10 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 12;
    }

    // ==================== STAFF BREAKDOWN SECTION ====================
    if (data.staffBreakdown && data.staffBreakdown.length > 0) {
      // Check if we need a new page
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = 20;
      }

      // Section header
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text("👥 Staff Compensation Breakdown", 10, yPos);

      yPos += 5;

      const staffTableData = data.staffBreakdown.map((staff, index) => {
        const staffName =
          `${staff.user.firstName || ""} ${staff.user.lastName || ""}`.trim() ||
          "N/A";
        const percentage =
          data.totalPayout > 0
            ? ((staff.totalAmount / data.totalPayout) * 100).toFixed(1) + "%"
            : "0%";

        return [
          (index + 1).toString(),
          staffName,
          staff.user.phone,
          `₹${staff.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          percentage,
        ];
      });

      autoTable(doc, {
        head: [["#", "Staff Member", "Phone", "Total Amount", "% Share"]],
        body: staffTableData,
        startY: yPos,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 4,
          lineColor: [230, 230, 230],
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [colors.primary[0], colors.primary[1], colors.primary[2]],
          textColor: toColor(colors.white),
          fontStyle: "bold",
          fontSize: 9,
          halign: "center",
        },
        bodyStyles: {
          halign: "left",
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 45, fontStyle: "bold" },
          2: { cellWidth: 55, fontSize: 7 },
          3: {
            cellWidth: 40,
            halign: "right",
            fontStyle: "bold",
            textColor: [
              colors.success[0],
              colors.success[1],
              colors.success[2],
            ],
          },
          4: { cellWidth: 20, halign: "center" },
        },
        margin: { left: 10, right: 10 },
        didDrawPage: (data) => {
          // If table spans multiple pages, add page numbers
          if (data.pageNumber > 1) {
            doc.setFontSize(8);
            doc.setTextColor(
              colors.darkGray[0],
              colors.darkGray[1],
              colors.darkGray[2],
            );
            doc.text(`Page ${data.pageNumber}`, pageWidth - 20, 10, {
              align: "right",
            });
          }
        },
      });
    }

    // ==================== FOOTER SECTION ====================
    const addFooter = (pageNum: number) => {
      const footerY = pageHeight - 25;

      // Footer background
      doc.setFillColor(
        colors.lightGray[0],
        colors.lightGray[1],
        colors.lightGray[2],
      );
      doc.rect(0, footerY, pageWidth, 25, "F");

      // Accent line
      doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setLineWidth(1);
      doc.line(10, footerY + 2, pageWidth - 10, footerY + 2);

      // Footer content
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(
        colors.darkGray[0],
        colors.darkGray[1],
        colors.darkGray[2],
      );

      const generatedBy =
        `${data.generatedBy.firstName || ""} ${data.generatedBy.lastName || ""}`.trim() ||
        data.generatedBy?.phone ||
        "System";

      doc.text(
        "PayRollBook - Advanced Payroll Management System",
        10,
        footerY + 8,
      );
      doc.text(`Generated by: ${generatedBy}`, 10, footerY + 13);
      doc.text(
        "This document contains confidential information.",
        10,
        footerY + 18,
      );

      doc.setFont("helvetica", "italic");
      doc.text(
        `Generated: ${new Date().toLocaleString("en-IN")}`,
        pageWidth - 10,
        footerY + 8,
        { align: "right" },
      );
      doc.text(`Page ${pageNum}`, pageWidth - 10, footerY + 13, {
        align: "right",
      });

      // Confidentiality notice
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.danger[0], colors.danger[1], colors.danger[2]);
      doc.text("⚠ CONFIDENTIAL DOCUMENT", pageWidth / 2, footerY + 21, {
        align: "center",
      });
    };

    // Add footer to all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      addFooter(i);
    }

    // Return PDF as buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return pdfBuffer;
  } catch (error) {
    console.error("Error generating salary report PDF:", error);
    throw new Error(
      `PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
