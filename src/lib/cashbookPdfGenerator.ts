import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { RGB, toColor } from "./salaryReportGenerator";
import type { FontStyle, HAlignType, CellDef } from "jspdf-autotable";
interface CashbookTransaction {
  id: string;
  transactionDate: string;
  transactionType: string;
  direction: string;
  amount: number;
  description: string;
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  creator?: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

interface CashbookReportData {
  company: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
  };
  transactions: CashbookTransaction[];
  summary: {
    totalTransactions: number;
    totalCredit: number;
    totalDebit: number;
    netBalance: number;
  };
  typeSummary: Record<string, { credit: number; debit: number; count: number }>;
  filters: {
    startDate?: string | null;
    endDate?: string | null;
    transactionType?: string | null;
    direction?: string | null;
  };
  generatedBy: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  };
}

export const generateCashbookPDFBuffer = (data: CashbookReportData): Buffer => {
  try {
    console.log("Starting professional cashbook PDF generation");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const colors: Record<string, RGB> = {
      primary: [13, 71, 161],
      primaryLight: [33, 150, 243],
      secondary: [38, 50, 56],
      accent: [0, 121, 107],
      success: [46, 125, 50],
      successLight: [129, 199, 132],
      danger: [198, 40, 40],
      dangerLight: [239, 154, 154],
      warning: [245, 124, 0],
      headerBg: [250, 250, 250],
      white: [255, 255, 255],
      border: [224, 224, 224],
      text: [33, 33, 33],
      textLight: [117, 117, 117],
      cardShadow: [200, 200, 200],
    };

    const drawRoundedRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number = 2,
    ) => {
      doc.roundedRect(x, y, w, h, r, r);
    };
    const boldCell = (
      content: string,
      textColor: RGB,
      fillColor?: RGB,
      halign?: HAlignType,
    ): CellDef => ({
      content,
      styles: {
        fontStyle: "bold" as FontStyle,
        textColor: toColor(textColor),
        ...(fillColor && { fillColor: toColor(fillColor) }),
        ...(halign && { halign }),
      },
    });

    const formatCurrency = (amount: number): string => {
      return `₹${Math.abs(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    };

    const formatDate = (dateString: string): string => {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    doc.setProperties({
      title: `Cashbook Report - ${data.company.name}`,
      subject: "Financial Cashbook Report",
      author:
        `${data.generatedBy.firstName || ""} ${data.generatedBy.lastName || ""}`.trim() ||
        data.generatedBy.email,
      creator: "PayRollBook System",
      keywords: "cashbook, financial, report, transactions, confidential",
    });

    let currentY = 15;

    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.03 }));
    doc.setFontSize(80);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(
      colors.textLight[0],
      colors.textLight[1],
      colors.textLight[2],
    );
    doc.text("CONFIDENTIAL", pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 45,
    });
    doc.restoreGraphicsState();

    doc.setFillColor(colors.danger[0], colors.danger[1], colors.danger[2]);
    doc.rect(0, 0, pageWidth, 5, "F");

    doc.setFillColor(
      colors.headerBg[0],
      colors.headerBg[1],
      colors.headerBg[2],
    );
    doc.rect(0, currentY, pageWidth, 42, "F");

    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(2);
    doc.roundedRect(18, currentY + 8, 18, 18, 9, 9, "FD");

    doc.setFontSize(12);
    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
    doc.setFont("helvetica", "bold");
    doc.text("PRB", 27, currentY + 19, { align: "center" });

    doc.setFontSize(22);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setFont("helvetica", "bold");
    doc.text(data.company.name.toUpperCase(), 42, currentY + 15);

    doc.setFontSize(9);
    doc.setTextColor(
      colors.textLight[0],
      colors.textLight[1],
      colors.textLight[2],
    );
    doc.setFont("helvetica", "normal");
    if (data.company.address) {
      doc.text(data.company.address, 42, currentY + 22);
    }
    if (data.company.phone) {
      doc.text(`Phone: ${data.company.phone}`, 42, currentY + 28);
    }

    doc.setFontSize(14);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setFont("helvetica", "bold");
    doc.text("CASHBOOK REPORT", pageWidth - 20, currentY + 13, {
      align: "right",
    });

    doc.setFontSize(8);
    doc.setTextColor(
      colors.textLight[0],
      colors.textLight[1],
      colors.textLight[2],
    );
    doc.setFont("helvetica", "normal");
    doc.text(
      `Report Date: ${new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}`,
      pageWidth - 20,
      currentY + 20,
      { align: "right" },
    );
    doc.text(
      `Report ID: CB-${Date.now().toString().slice(-8)}`,
      pageWidth - 20,
      currentY + 26,
      { align: "right" },
    );
    doc.text(
      `Time: ${new Date().toLocaleTimeString("en-IN")}`,
      pageWidth - 20,
      currentY + 32,
      { align: "right" },
    );

    currentY = 62;

    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(0.8);
    doc.line(15, currentY, pageWidth - 15, currentY);

    currentY += 10;

    doc.setFontSize(9);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFont("helvetica", "bold");
    doc.text("REPORTING PERIOD:", 20, currentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(
      colors.textLight[0],
      colors.textLight[1],
      colors.textLight[2],
    );

    const startDate = data.filters.startDate
      ? formatDate(data.filters.startDate)
      : "Beginning";
    const endDate = data.filters.endDate
      ? formatDate(data.filters.endDate)
      : "Present";
    doc.text(`${startDate} to ${endDate}`, 58, currentY);

    if (data.filters.transactionType || data.filters.direction) {
      currentY += 6;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.text("ACTIVE FILTERS:", 20, currentY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(
        colors.textLight[0],
        colors.textLight[1],
        colors.textLight[2],
      );
      const filters = [];
      if (data.filters.transactionType)
        filters.push(`Type: ${data.filters.transactionType}`);
      if (data.filters.direction)
        filters.push(`Direction: ${data.filters.direction}`);
      doc.text(filters.join(" | "), 58, currentY);
    }

    currentY += 12;

    doc.setFontSize(12);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setFont("helvetica", "bold");
    doc.text("FINANCIAL SUMMARY", 20, currentY);

    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(1.5);
    doc.line(20, currentY + 1, 67, currentY + 1);

    currentY += 8;

    const cardWidth = 45;
    const cardHeight = 24;
    const cardSpacing = 4;
    const startX = 19;

    const summaryCards = [
      {
        label: "TOTAL TRANSACTIONS",
        value: data.summary.totalTransactions.toString(),
        subtext: "Total Count",
        color: colors.primary,
        bgColor: [227, 242, 253],
      },
      {
        label: "TOTAL CREDIT",
        value: formatCurrency(data.summary.totalCredit),
        subtext: "Money In",
        color: colors.success,
        bgColor: [232, 245, 233],
      },
      {
        label: "TOTAL DEBIT",
        value: formatCurrency(data.summary.totalDebit),
        subtext: "Money Out",
        color: colors.danger,
        bgColor: [255, 235, 238],
      },
      {
        label: "NET BALANCE",
        value: formatCurrency(data.summary.netBalance),
        subtext: data.summary.netBalance >= 0 ? "Positive" : "Negative",
        color: data.summary.netBalance >= 0 ? colors.success : colors.danger,
        bgColor:
          data.summary.netBalance >= 0 ? [232, 245, 233] : [255, 235, 238],
      },
    ];

    summaryCards.forEach((card, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = startX + col * (cardWidth + cardSpacing);
      const y = currentY + row * (cardHeight + cardSpacing);

      doc.setFillColor(
        colors.cardShadow[0],
        colors.cardShadow[1],
        colors.cardShadow[2],
      );
      doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
      drawRoundedRect(x + 1, y + 1, cardWidth, cardHeight, 3);
      doc.setGState(new (doc as any).GState({ opacity: 1 }));

      doc.setFillColor(colors.white[0], colors.white[1], colors.white[2]);
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.3);
      drawRoundedRect(x, y, cardWidth, cardHeight, 3);
      doc.rect(x, y, cardWidth, cardHeight, "FD");

      doc.setFillColor(card.bgColor[0], card.bgColor[1], card.bgColor[2]);
      doc.rect(x, y, cardWidth, 3, "F");

      doc.setFontSize(7);
      doc.setTextColor(
        colors.textLight[0],
        colors.textLight[1],
        colors.textLight[2],
      );
      doc.setFont("helvetica", "bold");
      doc.text(card.label, x + 3, y + 8);

      doc.setFontSize(14);
      doc.setTextColor(card.color[0], card.color[1], card.color[2]);
      doc.setFont("helvetica", "bold");
      doc.text(card.value, x + 3, y + 15);

      doc.setFontSize(7);
      doc.setTextColor(
        colors.textLight[0],
        colors.textLight[1],
        colors.textLight[2],
      );
      doc.setFont("helvetica", "normal");
      doc.text(card.subtext, x + 3, y + 20);

      if (index === 1 || index === 2) {
        const directionSymbol = index === 1 ? "▲" : "▼";
        doc.setFontSize(10);
        doc.setTextColor(card.color[0], card.color[1], card.color[2]);
        doc.text(directionSymbol, x + cardWidth - 4, y + 14, {
          align: "right",
        });
      }
    });

    currentY += 2 * (cardHeight + cardSpacing) + 10;

    if (Object.keys(data.typeSummary).length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFont("helvetica", "bold");
      doc.text("TRANSACTION BREAKDOWN BY TYPE", 20, currentY);

      doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setLineWidth(1.5);
      doc.line(20, currentY + 1, 94, currentY + 1);

      currentY += 6;

      const typeSummaryData = Object.entries(data.typeSummary).map(
        ([type, summary]) => {
          const net = summary.credit - summary.debit;
          return [
            type,
            summary.count.toString(),
            formatCurrency(summary.credit),
            formatCurrency(summary.debit),
            {
              content: formatCurrency(net),
              styles: {
                textColor: toColor(net >= 0 ? colors.success : colors.danger),
                fontStyle: "bold" as FontStyle,
              },
            },
          ];
        },
      );

      autoTable(doc, {
        head: [
          [
            "Transaction Type",
            "Count",
            "Total Credit",
            "Total Debit",
            "Net Amount",
          ],
        ],
        body: typeSummaryData,
        startY: currentY,
        theme: "striped",
        styles: {
          fontSize: 8,
          cellPadding: 4,
          lineColor: toColor(colors.border),
          lineWidth: 0.1,
          textColor: toColor(colors.text),
        },
        headStyles: {
          fillColor: toColor(colors.primary),
          textColor: toColor(colors.white),
          fontStyle: "bold",
          fontSize: 9,
          halign: "center",
          valign: "middle",
        },
        columnStyles: {
          0: {
            cellWidth: 55,
            fontStyle: "bold",
            textColor: toColor(colors.text),
          },
          1: { halign: "center", cellWidth: 25 },
          2: { halign: "right", cellWidth: 32 },
          3: { halign: "right", cellWidth: 32 },
          4: { halign: "right", cellWidth: 36, fontStyle: "bold" },
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        margin: { left: 20, right: 20 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    if (data.transactions.length > 0) {
      if (currentY > pageHeight - 80) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFont("helvetica", "bold");
      doc.text("DETAILED TRANSACTION LEDGER", 20, currentY);

      doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setLineWidth(1.5);
      doc.line(20, currentY + 1, 85, currentY + 1);

      currentY += 6;

      const transactionsTableData = data.transactions.map((transaction) => {
        const userName = transaction.user
          ? `${transaction.user.firstName || ""} ${transaction.user.lastName || ""}`.trim() ||
            transaction.user.email
          : "System";

        const isCredit = transaction.direction === "CREDIT";

        return [
          formatDate(transaction.transactionDate),
          transaction.transactionType,
          boldCell(
            transaction.direction,
            isCredit ? colors.success : colors.danger,
            isCredit ? colors.successLight : colors.dangerLight,
            "center",
          ),
          boldCell(
            formatCurrency(transaction.amount),
            isCredit ? colors.success : colors.danger,
            undefined,
            "right",
          ),
          transaction.description || "-",
          userName,
        ];
      });

      autoTable(doc, {
        head: [["Date", "Type", "Direction", "Amount", "Description", "User"]],
        body: transactionsTableData,
        startY: currentY,
        theme: "striped",
        styles: {
          fontSize: 7,
          cellPadding: 3,
          lineColor: toColor(colors.border),
          lineWidth: 0.1,
          overflow: "linebreak",
          textColor: toColor(colors.text),
        },
        headStyles: {
          fillColor: toColor(colors.primary),
          textColor: toColor(colors.white),
          fontStyle: "bold",
          fontSize: 8,
          halign: "center",
          valign: "middle",
        },
        columnStyles: {
          0: { cellWidth: 24, halign: "center" },
          1: { cellWidth: 30 },
          2: { cellWidth: 22, halign: "center" },
          3: { cellWidth: 26, halign: "right" },
          4: { cellWidth: 48 },
          5: { cellWidth: 30, fontSize: 6.5 },
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        margin: { left: 20, right: 20 },
        didDrawPage: (data) => {
          const pageCount = (doc as any).internal.getNumberOfPages();
          const currentPage = (doc as any).internal.getCurrentPageInfo()
            .pageNumber;

          doc.setFontSize(8);
          doc.setTextColor(
            colors.textLight[0],
            colors.textLight[1],
            colors.textLight[2],
          );
          doc.setFont("helvetica", "normal");
          doc.text(
            `Page ${currentPage} of ${pageCount}`,
            pageWidth / 2,
            pageHeight - 8,
            { align: "center" },
          );
        },
      });
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.5);
      doc.line(20, pageHeight - 28, pageWidth - 20, pageHeight - 28);

      doc.setFontSize(7);
      doc.setTextColor(
        colors.textLight[0],
        colors.textLight[1],
        colors.textLight[2],
      );
      doc.setFont("helvetica", "normal");

      doc.text(
        `Generated: ${new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        20,
        pageHeight - 22,
      );
      doc.text(
        `By: ${data.generatedBy.firstName || ""} ${data.generatedBy.lastName || ""}`.trim() ||
          data.generatedBy.email,
        20,
        pageHeight - 17,
      );

      doc.setFont("helvetica", "bold");
      doc.text("PayRollBook", pageWidth - 20, pageHeight - 22, {
        align: "right",
      });
      doc.setFont("helvetica", "normal");
      doc.text("Cashbook Management System", pageWidth - 20, pageHeight - 17, {
        align: "right",
      });

      doc.setFontSize(6);
      doc.setTextColor(colors.danger[0], colors.danger[1], colors.danger[2]);
      doc.setFont("helvetica", "bold");
      doc.text(
        "CONFIDENTIAL - This document contains sensitive financial information. Unauthorized distribution is strictly prohibited.",
        pageWidth / 2,
        pageHeight - 6,
        { align: "center" },
      );
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    console.log(
      `Professional cashbook PDF buffer created successfully, size: ${pdfBuffer.length} bytes`,
    );
    return pdfBuffer;
  } catch (error) {
    console.error("Error generating professional cashbook PDF:", error);
    throw new Error(
      `PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
