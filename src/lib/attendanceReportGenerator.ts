import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getDate } from "./attendanceUtils";

interface AttendanceReportData {
  company: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
  };
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  trends: Array<{
    date: string;
    present: number;
    absent: number;
    late: number;
  }>;
  staffSummary: Array<{
    userId: string;
    user: {
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    };
    present: number;
    absent: number;
    late: number;
  }>;
  generatedBy: {
    firstName?: string | null;
    lastName?: string | null;
  };
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
}

export const generateAttendancePDFBuffer = (
  data: AttendanceReportData,
): Buffer => {
  try {
    console.log("Starting attendance PDF generation");

    const doc = new jsPDF();

    // Add PDF metadata for security
    doc.setProperties({
      title: `Attendance Report - ${data.company.name}`,
      subject: "Attendance Report",
      author: data.generatedBy.firstName || "PayRollBook System",
      creator: "PayRollBook System",
      keywords: "attendance, report, staff, presence, confidential",
    });

    // Add PDF protection features
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = doc.internal.pageSize.getHeight();

    // Add diagonal watermark
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
    doc.setFontSize(50);
    doc.setTextColor(200, 200, 200);
    doc.text("CONFIDENTIAL", pdfWidth / 2, pdfHeight / 2, {
      align: "center",
      angle: 45,
    });
    doc.restoreGraphicsState();

    // Colors
    const primaryColor = [41, 128, 185]; // Blue
    const secondaryColor = [52, 73, 94]; // Dark Gray
    const successColor = [46, 204, 113]; // Green
    const dangerColor = [231, 76, 60]; // Red
    const warningColor = [241, 196, 15]; // Yellow

    // Header
    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Attendance Report", 105, 20, { align: "center" });

    // Company Info
    doc.setFontSize(12);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(data.company.name, 105, 30, { align: "center" });

    if (data.company.address) {
      doc.setFontSize(9);
      doc.text(data.company.address, 105, 35, { align: "center" });
    }

    // Period
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const periodText = `Period: ${data.dateRange.startDate || "All"} to ${data.dateRange.endDate || "All"}`;
    doc.text(periodText, 20, 45);

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Summary", 20, 60);

    // Summary boxes
    const summaryData = [
      {
        label: "Total Records",
        value: data.totalRecords,
        color: primaryColor,
      },
      {
        label: "Present",
        value: data.present,
        color: successColor,
      },
      {
        label: "Absent",
        value: data.absent,
        color: dangerColor,
      },
      {
        label: "Late/Pending",
        value: data.late,
        color: warningColor,
      },
    ];

    let yPos = 70;
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
      doc.text(item.value.toString(), xPos + 2, yPos + 9);
    });

    // Staff Summary Table
    if (data.staffSummary.length > 0) {
      const startY = yPos + 25;

      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("Staff Attendance Summary", 20, startY - 5);

      const staffTableData = data.staffSummary.map((staff) => [
        `${staff.user.firstName || ""} ${staff.user.lastName || ""}`.trim() ||
          staff.user.email,
        staff.present.toString(),
        staff.absent.toString(),
        staff.late.toString(),
        (staff.present + staff.absent + staff.late).toString(),
      ]);

      autoTable(doc, {
        head: [["Staff Member", "Present", "Absent", "Late", "Total"]],
        body: staffTableData,
        startY: startY,
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
        columnStyles: {
          0: { cellWidth: 60 }, // Staff Member
          1: { cellWidth: 20 }, // Present
          2: { cellWidth: 20 }, // Absent
          3: { cellWidth: 20 }, // Late
          4: { cellWidth: 20 }, // Total
        },
        margin: { top: 20 },
      });
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated on ${getDate(new Date()).toLocaleString()}`,
      20,
      pageHeight - 20,
    );
    doc.text(
      `Generated by: ${data.generatedBy.firstName || ""} ${data.generatedBy.lastName || ""}`.trim() ||
        "PayRollBook System",
      20,
      pageHeight - 15,
    );
    doc.text("PayRollBook - Attendance Management System", 20, pageHeight - 10);

    // Return PDF as buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    console.log(
      `Attendance PDF buffer created successfully, size: ${pdfBuffer.length} bytes`,
    );
    return pdfBuffer;
  } catch (error) {
    console.error("Error generating attendance PDF:", error);
    throw new Error(
      `PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};
