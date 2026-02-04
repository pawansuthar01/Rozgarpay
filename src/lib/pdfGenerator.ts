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
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
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
  recentTransactions?: SalaryTransaction[];
}

interface PDFGeneratorProps {
  data: SalaryReportData;
  companyName?: string;
}
type RGB = readonly [number, number, number];

export const generateSalaryPDFBuffer = ({
  data,
  companyName = "PayRollBook",
}: PDFGeneratorProps): Buffer => {
  try {
    // Validate input data
    if (!data) {
      throw new Error("PDF data is required");
    }
    const toColor = (rgb: RGB): [number, number, number] => [
      rgb[0],
      rgb[1],
      rgb[2],
    ];
    // Ensure arrays exist
    data.payments = data.payments || [];
    data.deductions = data.deductions || [];
    data.recoveries = data.recoveries || [];
    data.recentTransactions = data.recentTransactions || [];

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Professional Color Palette
    const colors: Record<string, RGB> = {
      primary: [26, 115, 232], // Modern Blue
      primaryLight: [66, 133, 244],
      secondary: [52, 73, 94], // Professional Dark
      success: [52, 168, 83], // Professional Green
      danger: [234, 67, 53], // Professional Red
      warning: [251, 188, 5], // Amber
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

    // ==================== HEADER SECTION ====================
    let yPos = 15;

    // Header background with gradient effect (simulated with two rectangles)
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    addRoundedRect(15, yPos, pageWidth - 30, 35, 3, "F");

    // Company name
    doc.setFontSize(22);
    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, 20, yPos + 12);

    // Report title
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("SALARY REPORT", 20, yPos + 20);

    // Report ID and date on right
    doc.setFontSize(8);
    const reportId = `SR-${Date.now().toString().slice(-8)}`;
    const generatedDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    doc.text(`Report ID: ${reportId}`, pageWidth - 20, yPos + 12, {
      align: "right",
    });
    doc.text(`Generated: ${generatedDate}`, pageWidth - 20, yPos + 18, {
      align: "right",
    });

    yPos += 45;

    // ==================== EMPLOYEE INFORMATION CARD ====================
    doc.setFillColor(
      colors.lightGray[0],
      colors.lightGray[1],
      colors.lightGray[2],
    );
    addRoundedRect(15, yPos, pageWidth - 30, 28, 2, "F");

    // Left border accent
    doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
    doc.rect(15, yPos, 3, 28, "F");

    // Employee icon placeholder (using text)
    doc.setFontSize(16);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("👤", 22, yPos + 10);

    // Employee details
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(
      colors.secondary[0],
      colors.secondary[1],
      colors.secondary[2],
    );
    const employeeName =
      `${data?.user?.firstName || ""} ${data?.user?.lastName || ""}`.trim() ||
      "N/A";
    doc.text(employeeName, 35, yPos + 8);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(
      colors.darkGray[0],
      colors.darkGray[1],
      colors.darkGray[2],
    );

    // Show phone instead of email
    if (data?.user?.phone) {
      doc.text(`📱 ${data.user.phone}`, 35, yPos + 14);
    } else {
      doc.text(`📱 N/A`, 35, yPos + 14);
    }

    // Period information on right
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    const monthName = new Date(data.year, data.month - 1).toLocaleString(
      "default",
      { month: "long" },
    );
    doc.text("PERIOD", pageWidth - 20, yPos + 8, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(
      colors.secondary[0],
      colors.secondary[1],
      colors.secondary[2],
    );
    doc.text(`${monthName} ${data.year}`, pageWidth - 20, yPos + 14, {
      align: "right",
    });

    yPos += 35;

    // ==================== FINANCIAL SUMMARY SECTION ====================
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(
      colors.secondary[0],
      colors.secondary[1],
      colors.secondary[2],
    );
    doc.text("Financial Summary", 15, yPos);

    yPos += 8;

    // Summary cards in grid layout
    const cardWidth = (pageWidth - 40) / 3;
    const cardHeight = 24;
    const cardSpacing = 5;

    const summaryItems = [
      {
        label: "Gross Salary",
        value: data.grossAmount || 0,
        color: colors.primary,
        icon: "💰",
        description: "Total earnings",
      },
      {
        label: "Total Paid",
        value: data.totalPaid || 0,
        color: colors.success,
        icon: "✓",
        description: "Amount paid",
      },
      {
        label: "Deductions",
        value: data.totalRecovered || 0,
        color: colors.danger,
        icon: "⚠",
        description: "Total recovered",
      },
      {
        label: "Net Amount",
        value: data.netAmount || 0,
        color: colors.accent,
        icon: "📊",
        description: "After deductions",
      },
      {
        label: "Balance Due",
        value: data.balanceAmount || 0,
        color: data.balanceAmount > 0 ? colors.warning : colors.success,
        icon: "⚖",
        description: "Remaining",
      },
    ];

    // Draw summary cards
    summaryItems.forEach((item, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const xPos = 15 + col * (cardWidth + cardSpacing);
      const cardY = yPos + row * (cardHeight + cardSpacing);

      // Card background
      doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
      addRoundedRect(xPos, cardY, cardWidth, cardHeight, 2, "F");

      // Card border
      doc.setDrawColor(
        colors.mediumGray[0],
        colors.mediumGray[1],
        colors.mediumGray[2],
      );
      doc.setLineWidth(0.3);
      addRoundedRect(xPos, cardY, cardWidth, cardHeight, 2, "S");

      // Colored top border
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.rect(xPos, cardY, cardWidth, 2, "F");

      // Icon
      doc.setFontSize(12);
      doc.text(item.icon, xPos + 3, cardY + 8);

      // Label
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(
        colors.darkGray[0],
        colors.darkGray[1],
        colors.darkGray[2],
      );
      doc.text(item.label, xPos + 12, cardY + 7);

      // Value
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(item.color[0], item.color[1], item.color[2]);
      const formattedValue = `₹${Number(item.value.toString().replace(/[^\d.-]/g, "")).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      doc.text(formattedValue, xPos + 12, cardY + 15);

      // Description
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(
        colors.darkGray[0],
        colors.darkGray[1],
        colors.darkGray[2],
      );
      doc.text(item.description, xPos + 12, cardY + 20);
    });

    yPos +=
      Math.ceil(summaryItems.length / 3) * (cardHeight + cardSpacing) + 10;

    // ==================== PAYMENTS TABLE ====================
    if (data.payments.length > 0) {
      const paymentsTableData = data.payments.map((payment) => [
        new Date(payment.date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        payment.description || "N/A",
        payment.type || "N/A",
        `₹${Math.abs(Number((payment.amount || 0).toString().replace(/[^\d.-]/g, ""))).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ]);

      autoTable(doc, {
        head: [["Date", "Description", "Type", "Amount"]],
        body: paymentsTableData,
        startY: yPos + 5,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 4,
          lineColor: [230, 230, 230],
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [colors.success[0], colors.success[1], colors.success[2]],
          textColor: toColor(colors.white),
          fontStyle: "bold",
          fontSize: 9,
          halign: "left",
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        columnStyles: {
          0: { cellWidth: 30 },
          3: { halign: "right", fontStyle: "bold" },
        },
        margin: { left: 15, right: 15 },
        didDrawPage: function (_data) {
          // Section header
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(
            colors.success[0],
            colors.success[1],
            colors.success[2],
          );
          doc.text("💵 Payments Made", 15, _data.settings.startY - 3);
        },
      });
    }

    // ==================== DEDUCTIONS & RECOVERIES TABLE ====================
    const combinedDeductions = [
      ...data.deductions.map((d) => ({ ...d, category: "Deduction" })),
      ...data.recoveries.map((r) => ({ ...r, category: "Recovery" })),
    ];

    if (combinedDeductions.length > 0) {
      const deductionsTableData = combinedDeductions.map((item) => [
        new Date(item.date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        item.description || "N/A",
        item.category,
        item.type || "N/A",
        `₹${Math.abs(Number((item.amount || 0).toString().replace(/[^\d.-]/g, ""))).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      ]);

      const startY =
        data.payments.length > 0
          ? (doc as any).lastAutoTable?.finalY + 12 || yPos + 20
          : yPos + 5;

      autoTable(doc, {
        head: [["Date", "Description", "Category", "Type", "Amount"]],
        body: deductionsTableData,
        startY: startY,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 4,
          lineColor: [230, 230, 230],
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [colors.danger[0], colors.danger[1], colors.danger[2]],
          textColor: toColor(colors.white),
          fontStyle: "bold",
          fontSize: 9,
          halign: "left",
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        columnStyles: {
          0: { cellWidth: 25 },
          2: { cellWidth: 25 },
          4: { halign: "right", fontStyle: "bold" },
        },
        margin: { left: 15, right: 15 },
        didDrawPage: function (_data) {
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(
            colors.danger[0],
            colors.danger[1],
            colors.danger[2],
          );
          doc.text("💸 Deductions & Recoveries", 15, _data.settings.startY - 3);
        },
      });
    }

    // ==================== RECENT TRANSACTIONS TABLE ====================
    if (data.recentTransactions && data.recentTransactions.length > 0) {
      const transactionsTableData = data.recentTransactions
        .slice(0, 10)
        .map((transaction) => [
          new Date(transaction.date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          transaction.description || "N/A",
          transaction.type || "N/A",
          `₹${Math.abs(Number((transaction.amount || 0).toString().replace(/[^\d.-]/g, ""))).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ]);

      const startY = (doc as any).lastAutoTable?.finalY + 12 || yPos + 20;

      autoTable(doc, {
        head: [["Date", "Description", "Type", "Amount"]],
        body: transactionsTableData,
        startY: startY,
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
          halign: "left",
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        columnStyles: {
          0: { cellWidth: 30 },
          3: { halign: "right", fontStyle: "bold" },
        },
        margin: { left: 15, right: 15 },
        didDrawPage: function (_data) {
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(
            colors.primary[0],
            colors.primary[1],
            colors.primary[2],
          );
          doc.text("📋 Recent Transactions", 15, _data.settings.startY - 3);
        },
      });
    }

    // ==================== FOOTER ====================
    const finalY = (doc as any).lastAutoTable?.finalY || yPos;

    // Add footer background
    doc.setFillColor(
      colors.lightGray[0],
      colors.lightGray[1],
      colors.lightGray[2],
    );
    doc.rect(0, pageHeight - 25, pageWidth, 25, "F");

    // Footer line
    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(1);
    doc.line(15, pageHeight - 23, pageWidth - 15, pageHeight - 23);

    // Footer text
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(
      colors.darkGray[0],
      colors.darkGray[1],
      colors.darkGray[2],
    );
    doc.text(`${companyName} - Payroll Management System`, 15, pageHeight - 16);
    doc.text(
      "This is a computer-generated document. No signature required.",
      15,
      pageHeight - 11,
    );

    doc.setFont("helvetica", "italic");
    doc.text(
      `Generated on ${new Date().toLocaleString("en-IN")}`,
      pageWidth - 15,
      pageHeight - 16,
      { align: "right" },
    );
    doc.text(`Page 1`, pageWidth - 15, pageHeight - 11, { align: "right" });

    // Confidentiality notice
    if (finalY < pageHeight - 40) {
      doc.setFontSize(7);
      doc.setTextColor(colors.danger[0], colors.danger[1], colors.danger[2]);
      doc.text(
        "CONFIDENTIAL - For authorized personnel only",
        pageWidth / 2,
        pageHeight - 30,
        { align: "center" },
      );
    }

    // Return PDF as buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    console.log(`Professional PDF buffer created: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error(
      `PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
