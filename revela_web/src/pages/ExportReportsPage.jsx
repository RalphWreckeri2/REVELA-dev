import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { getAnalyticsOverviewRequest, getFlagsRequest } from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";
import myLogo from "../assets/logo.png";

const REPORTS = [
  { id: 1, title: "Weekly Compliance Summary", type: "compliance", desc: "Overview of registered vs. unregistered entities and compliance rate." },
  { id: 2, title: "Top Unregistered Establishments", type: "unregistered", desc: "List of active Red and Yellow flags indicating suspected unregistered businesses." },
  { id: 3, title: "Field Inspector Dispatch Plan", type: "dispatch", desc: "Barangay priority rankings based on the WLC Operational Priority Score (OPS)." },
];

// Helper to convert logo to Base64 for PDF rendering
const loadImageAsBase64 = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = url;
  });
};

// Formal letterhead and metadata block for page 1
const drawDocumentHeader = (doc, title, subtitle, logoBase64, userName, isLandscape = false) => {
  const width = doc.internal.pageSize.width;
  
  // 1. Logo
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", 14, 8, 18, 18);
  }

  // 2. Letterhead text
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text("Republic of the Philippines", width / 2, 11, { align: "center" });
  doc.text("Province of Batangas", width / 2, 15, { align: "center" });
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("MUNICIPALITY OF MATAASNAKAHOY", width / 2, 20, { align: "center" });
  
  doc.setFontSize(8);
  doc.setTextColor(86, 171, 47); // primary green
  doc.text("BUSINESS PERMITS AND LICENSING OFFICE (BPLO)", width / 2, 24, { align: "center" });

  // 3. Double-line decorative border
  doc.setDrawColor(86, 171, 47);
  doc.setLineWidth(1.2);
  doc.line(14, 27, width - 14, 27);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.line(14, 28.5, width - 14, 28.5);

  // 4. Document Title
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(title.toUpperCase(), 14, 36);

  // 5. Metadata Block
  const metaY = 41;
  const metaHeight = 16;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.roundedRect(14, metaY, width - 28, metaHeight, 2, 2, "FD");

  // Left col details
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("DATE GENERATED:", 18, metaY + 6);
  doc.text("PREPARED BY:", 18, metaY + 11);
  
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(new Date().toLocaleString(), 46, metaY + 6);
  doc.text(userName, 41, metaY + 11);

  // Right col details
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("OFFICE:", isLandscape ? width - 120 : width - 90, metaY + 6);
  doc.text("CLASSIFICATION:", isLandscape ? width - 120 : width - 90, metaY + 11);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text("BPLO Mataasnakahoy", isLandscape ? width - 105 : width - 75, metaY + 6);
  doc.text("Official Use / Confidential", isLandscape ? width - 92 : width - 62, metaY + 11);
};

// Simplified header for subsequent pages
const drawPageHeaderSimplified = (doc, title) => {
  const width = doc.internal.pageSize.width;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(title.toUpperCase(), 14, 12);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Generated on: ${new Date().toLocaleDateString()} • BPLO Mataasnakahoy`, 14, 16);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, 18, width - 14, 18);
};

// Signature block at the end of the report
const drawSignatureBlock = (doc, userName, finalY) => {
  const width = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let sigY = finalY + 12;
  
  // Prevent signature page overflow
  if (sigY + 25 > pageHeight - 15) {
    doc.addPage();
    sigY = 25;
  }

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Prepared By:", 14, sigY);
  doc.text("Noted By:", width / 2 + 10, sigY);

  // Line for signature
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.line(14, sigY + 10, 14 + 50, sigY + 10);
  doc.line(width / 2 + 10, sigY + 10, width / 2 + 10 + 50, sigY + 10);

  // Signatory details
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(userName.toUpperCase(), 14, sigY + 14);
  doc.text("BPLO DEPARTMENT HEAD", width / 2 + 10, sigY + 14);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("REVELA System Operator", 14, sigY + 18);
  doc.text("Business Permits & Licensing Office", width / 2 + 10, sigY + 18);
};

// Traverse and draw post-processed page numbers and confidentiality rules
const addPageNumbers = (doc) => {
  const totalPages = doc.internal.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    
    // Left-aligned system ID
    const footerLeft = "REVELA System • BPLO Compliance Audit Report";
    doc.text(footerLeft, 14, pageHeight - 8);
    
    // Right-aligned page numbers
    const pageText = `Page ${i} of ${totalPages}`;
    doc.text(pageText, pageWidth - 14 - doc.getTextWidth(pageText), pageHeight - 8);
    
    // Thin line above footer text
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.4);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
  }
};

export default function ExportReportsPage() {
  const { token, user } = useAuth();
  const [loadingId, setLoadingId] = useState(null);
  const [logoBase64, setLogoBase64] = useState(null);

  // Pre-load municipal/BPLO logo as base64 on mount to avoid async latency
  useEffect(() => {
    loadImageAsBase64(myLogo).then((base64) => {
      setLogoBase64(base64);
    }).catch(err => {
      console.error("Error pre-loading BPLO logo:", err);
    });
  }, []);

  const handleDownload = async (report) => {
    // Prompt user for format preference using SweetAlert
    const { value: format } = await Swal.fire({
      title: 'Select Export Format',
      input: 'radio',
      inputOptions: {
        'pdf': 'PDF Document',
        'csv': 'CSV Spreadsheet'
      },
      inputValidator: (value) => {
        if (!value) {
          return 'You need to choose a format!'
        }
      },
      showCancelButton: true,
      confirmButtonText: 'Generate',
      confirmButtonColor: 'var(--color-primary)'
    });

    if (!format) return;

    setLoadingId(report.id);
    try {
      if (report.type === "compliance") {
        await generateComplianceReport(format);
      } else if (report.type === "unregistered") {
        await generateUnregisteredReport(format);
      } else if (report.type === "dispatch") {
        await generateDispatchReport(format);
      }
      
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: `${report.title} exported as ${format.toUpperCase()}`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: error.message || 'An error occurred while generating the report.'
      });
    } finally {
      setLoadingId(null);
    }
  };

// Draws a section header text for multi-section reports, handling page breaks safely
const drawSectionTitle = (doc, titleText, finalY) => {
  const pageHeight = doc.internal.pageSize.height;
  let y = finalY + 12;
  if (y + 15 > pageHeight - 15) {
    doc.addPage();
    y = 25;
  }
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(titleText, 14, y);
  return y + 4; // returns startY for the next table
};

  const generateComplianceReport = async (format) => {
    const data = await getAnalyticsOverviewRequest(token);
    const kpis = data?.descriptive?.kpis;
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Compliance_Summary_${dateStr}`;

    const csvData = [
      { Metric: "Total Registered Entities", Value: kpis?.total_businesses || 0 },
      { Metric: "Active Registrations", Value: kpis?.active_count || 0 },
      { Metric: "Pending Registrations", Value: kpis?.pending_count || 0 },
      { Metric: "Expired Permits", Value: kpis?.expired_count || 0 },
      { Metric: "Closed Establishments", Value: kpis?.closed_count || 0 },
      { Metric: "Registrations/Renewals in Current Year", Value: kpis?.current_year_count || 0 },
      { Metric: "Total Flagged Entities", Value: kpis?.total_flagged || 0 },
      { Metric: "Overall Compliance Rate", Value: `${kpis?.compliance_rate || 0}%` },
      { Metric: "High-Risk Barangays", Value: kpis?.high_risk_barangays || 0 }
    ];

    if (format === 'csv') {
      const csv = Papa.unparse(csvData);
      saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
    } else {
      const doc = new jsPDF();
      const userName = user?.fullName || "BPLO Staff";
      drawDocumentHeader(doc, "Weekly Compliance Summary", "Comprehensive overview of registration rates, compliance audits, and sectoral metrics", logoBase64, userName, false);
      
      // Table 1: Key Performance Indicators (KPIs)
      autoTable(doc, {
        startY: 62,
        margin: { top: 25, bottom: 15 },
        head: [['Compliance Metric', 'Reported Value']],
        body: csvData.map(r => [r.Metric, r.Value]),
        theme: 'striped',
        headStyles: { fillColor: [86, 171, 47], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 4, font: 'Helvetica' },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            drawPageHeaderSimplified(doc, "Weekly Compliance Summary");
          }
        }
      });

      // Table 2: Sectoral Distribution
      const sectors = data?.descriptive?.sectoral_distribution || [];
      if (sectors.length > 0) {
        const nextY = drawSectionTitle(doc, "Business Sector Distribution (Top 10 LOB)", doc.lastAutoTable.finalY);
        autoTable(doc, {
          startY: nextY,
          margin: { top: 25, bottom: 15 },
          head: [['Business Sector / Category', 'Registered Entities Count']],
          body: sectors.map(s => [s.sector, s.count]),
          theme: 'striped',
          headStyles: { fillColor: [86, 171, 47], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          styles: { fontSize: 8.5, cellPadding: 4, font: 'Helvetica' },
          didDrawPage: (data) => {
            if (data.pageNumber > 1) {
              drawPageHeaderSimplified(doc, "Weekly Compliance Summary");
            }
          }
        });
      }

      // Table 3: Business Size Distribution
      const sizes = data?.descriptive?.business_size_dist || [];
      if (sizes.length > 0) {
        const nextY = drawSectionTitle(doc, "Business Size Classification Distribution", doc.lastAutoTable.finalY);
        autoTable(doc, {
          startY: nextY,
          margin: { top: 25, bottom: 15 },
          head: [['Size Classification', 'Registered Entities Count']],
          body: sizes.map(s => [s.size_label, s.count]),
          theme: 'striped',
          headStyles: { fillColor: [86, 171, 47], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          styles: { fontSize: 8.5, cellPadding: 4, font: 'Helvetica' },
          didDrawPage: (data) => {
            if (data.pageNumber > 1) {
              drawPageHeaderSimplified(doc, "Weekly Compliance Summary");
            }
          }
        });
      }

      // Table 4: Field Inspections Audit Summary
      const audits = data?.descriptive?.audit_summary?.result_breakdown || [];
      const totalInspections = data?.descriptive?.audit_summary?.total_inspections || 0;
      const nextY = drawSectionTitle(doc, "Field Inspections Audit Results Breakdown", doc.lastAutoTable.finalY);
      autoTable(doc, {
        startY: nextY,
        margin: { top: 25, bottom: 15 },
        head: [['Inspection Result Status', 'Conducted Inspections Count']],
        body: [
          ...audits.map(a => [a.inspectionResult || "Unclassified", a.count]),
          ['TOTAL AUDIT INSPECTIONS COMPLETED', totalInspections]
        ],
        theme: 'striped',
        headStyles: { fillColor: [86, 171, 47], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 4, font: 'Helvetica' },
        rowStyles: {
          [audits.length]: { fontStyle: 'bold', fillColor: [241, 245, 249] } // bold total row
        },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            drawPageHeaderSimplified(doc, "Weekly Compliance Summary");
          }
        }
      });

      drawSignatureBlock(doc, userName, doc.lastAutoTable.finalY);
      addPageNumbers(doc);
      doc.save(`${filename}.pdf`);
    }
  };

  const generateUnregisteredReport = async (format) => {
    const res = await getFlagsRequest({ limit: 1000 }, token);
    const allFlags = res?.data || [];
    // Filter for Red and Yellow flags (unregistered / suspected)
    const flags = allFlags.filter(f => f.flagColor === 'Red' || f.flagColor === 'Yellow');
    
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Unregistered_Establishments_${dateStr}`;

    const formattedData = flags.map(f => ({
      LogID: f.logID,
      Name: f.detectedName || "Unknown",
      Barangay: f.barangayName || "Unknown",
      Address: f.resolvedAddress || f.nearestLandmark || "",
      Status: f.flagColor === 'Red' ? 'Unregistered' : 'Suspected',
      DetectedDate: f.detectedDate ? f.detectedDate.slice(0, 10) : ""
    }));

    if (format === 'csv') {
      const csv = Papa.unparse(formattedData);
      saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
    } else {
      const doc = new jsPDF('landscape');
      const userName = user?.fullName || "BPLO Staff";
      drawDocumentHeader(doc, "Top Suspected Unregistered Establishments", "List of flagged business locations showing commercial activity without matching registrations", logoBase64, userName, true);

      // KPI Summary Cards block (y=62)
      const summaryY = 62;
      const width = doc.internal.pageSize.width;
      const redCount = flags.filter(f => f.flagColor === 'Red').length;
      const yellowCount = flags.filter(f => f.flagColor === 'Yellow').length;
      const cardWidth = (width - 28 - 12) / 3;
      
      // Card 1: Total
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, summaryY, cardWidth, 14, 1.5, 1.5, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL FLAGGED LOCATIONS", 18, summaryY + 5);
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${flags.length} Suspected Entities`, 18, summaryY + 10);

      // Card 2: Unregistered (Red)
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(14 + cardWidth + 6, summaryY, cardWidth, 14, 1.5, 1.5, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(220, 38, 38);
      doc.text("UNREGISTERED COMMERCIAL (RED)", 14 + cardWidth + 10, summaryY + 5);
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${redCount} Confirmed Locations`, 14 + cardWidth + 10, summaryY + 10);

      // Card 3: Suspected (Yellow)
      doc.setFillColor(255, 251, 235);
      doc.roundedRect(14 + cardWidth * 2 + 12, summaryY, cardWidth, 14, 1.5, 1.5, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(180, 83, 9);
      doc.text("SUSPECTED COMPLIANCE GAP (YELLOW)", 14 + cardWidth * 2 + 16, summaryY + 5);
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${yellowCount} Potential Violations`, 14 + cardWidth * 2 + 16, summaryY + 10);

      // Start table at y=81
      autoTable(doc, {
        startY: 81,
        margin: { top: 25, bottom: 15 },
        head: [['Log ID', 'Establishment Name', 'Barangay', 'Resolved Address / Nearest Landmark', 'Flag Status', 'Date Flagged']],
        body: formattedData.map(f => [f.LogID, f.Name, f.Barangay, f.Address, f.Status, f.DetectedDate]),
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        styles: { fontSize: 8, cellPadding: 4, font: 'Helvetica' },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 50 },
          2: { cellWidth: 35 },
          3: { cellWidth: 110 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 }
        },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            drawPageHeaderSimplified(doc, "Top Suspected Unregistered Establishments");
          }
        }
      });

      drawSignatureBlock(doc, userName, doc.lastAutoTable.finalY);
      addPageNumbers(doc);
      doc.save(`${filename}.pdf`);
    }
  };

  const generateDispatchReport = async (format) => {
    const data = await getAnalyticsOverviewRequest(token);
    const rankings = data?.prescriptive?.rankings || [];
    
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Inspector_Dispatch_Plan_${dateStr}`;

    const formattedData = rankings.map(r => ({
      Rank: r.rank,
      Barangay: r.barangayName,
      PriorityScore: r.ops_score,
      RiskLevel: r.risk_level,
      TotalFlagged: r.flagged_count,
      RedFlags: r.red_count,
      NonComplianceRate: `${r.non_compliance_rate}%`
    }));

    if (format === 'csv') {
      const csv = Papa.unparse(formattedData);
      saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
    } else {
      const doc = new jsPDF();
      const userName = user?.fullName || "BPLO Staff";
      drawDocumentHeader(doc, "Field Inspector Dispatch Plan", "Barangay ranking prioritizations generated via WLC scoring model for optimal dispatching", logoBase64, userName, false);

      // Table 1: Barangay priority rankings
      autoTable(doc, {
        startY: 62,
        margin: { top: 25, bottom: 15 },
        head: [['Rank', 'Barangay Name', 'WLC OPS Score', 'Risk Level', 'Flag Count', 'Non-Compliance']],
        body: formattedData.map(r => [r.Rank, r.Barangay, r.PriorityScore, r.RiskLevel, r.TotalFlagged, r.NonComplianceRate]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 4, font: 'Helvetica' },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            drawPageHeaderSimplified(doc, "Field Inspector Dispatch Plan");
          }
        }
      });

      // Table 2: Actionable Dispatch Recommendations
      const recs = data?.prescriptive?.dispatch_recommendations || [];
      if (recs.length > 0) {
        const nextY = drawSectionTitle(doc, "Actionable Dispatch Recommendations & Allocations", doc.lastAutoTable.finalY);
        autoTable(doc, {
          startY: nextY,
          margin: { top: 25, bottom: 15 },
          head: [['Rank', 'Priority Barangay', 'Actionable Recommendation Plan']],
          body: recs.map(rec => [
            `Rank ${rec.rank}`,
            rec.barangayName,
            rec.recommendation
          ]),
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          styles: { fontSize: 8.2, cellPadding: 5, font: 'Helvetica' },
          columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 35 },
            2: { cellWidth: 130 }
          },
          didDrawPage: (data) => {
            if (data.pageNumber > 1) {
              drawPageHeaderSimplified(doc, "Field Inspector Dispatch Plan");
            }
          }
        });
      }

      drawSignatureBlock(doc, userName, doc.lastAutoTable.finalY);
      addPageNumbers(doc);
      doc.save(`${filename}.pdf`);
    }
  };


  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Export Reports</h1>
          <p className="page-subtitle">Generate and download operational compliance reports in PDF or CSV formats.</p>
        </div>
      </div>

      <div className="saas-card frosted-glass">
        <div style={{ display: "grid", gap: 16 }}>
          {REPORTS.map((report) => (
            <div
              key={report.id}
              className="saas-card"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "18px 20px" }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: "var(--color-ink)" }}>{report.title}</h3>
                <p style={{ margin: "8px 0 0", color: "var(--color-muted)", fontSize: 13 }}>{report.desc}</p>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button 
                  className="primary-btn" 
                  type="button" 
                  onClick={() => handleDownload(report)}
                  disabled={loadingId === report.id}
                >
                  {loadingId === report.id ? "Generating..." : "Download"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
