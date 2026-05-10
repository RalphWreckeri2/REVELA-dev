import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { getAnalyticsOverviewRequest, getFlagsRequest } from "../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";

const REPORTS = [
  { id: 1, title: "Weekly Compliance Summary", type: "compliance", desc: "Overview of registered vs. unregistered entities and compliance rate." },
  { id: 2, title: "Top Unregistered Establishments", type: "unregistered", desc: "List of active Red and Yellow flags indicating suspected unregistered businesses." },
  { id: 3, title: "Field Inspector Dispatch Plan", type: "dispatch", desc: "Barangay priority rankings based on the WLC Operational Priority Score (OPS)." },
];

export default function ExportReportsPage() {
  const { token } = useAuth();
  const [loadingId, setLoadingId] = useState(null);

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

  const generateComplianceReport = async (format) => {
    const data = await getAnalyticsOverviewRequest(token);
    const kpis = data?.descriptive?.kpis;
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Compliance_Summary_${dateStr}`;

    const csvData = [
      { Metric: "Total Registered Entities", Value: kpis?.total_businesses || 0 },
      { Metric: "Active Registrations", Value: kpis?.active_count || 0 },
      { Metric: "Expired Permits", Value: kpis?.expired_count || 0 },
      { Metric: "Total Flagged Entities", Value: kpis?.total_flagged || 0 },
      { Metric: "Overall Compliance Rate", Value: `${kpis?.compliance_rate || 0}%` },
      { Metric: "High-Risk Barangays", Value: kpis?.high_risk_barangays || 0 }
    ];

    if (format === 'csv') {
      const csv = Papa.unparse(csvData);
      saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
    } else {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Weekly Compliance Summary", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      
      autoTable(doc, {
        startY: 40,
        head: [['Metric', 'Value']],
        body: csvData.map(r => [r.Metric, r.Value]),
        theme: 'striped',
        headStyles: { fillColor: [86, 171, 47] },
        styles: { fontSize: 11, cellPadding: 6 }
      });
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
      doc.setFontSize(18);
      doc.text("Top Unregistered Establishments", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

      autoTable(doc, {
        startY: 40,
        head: [['Log ID', 'Establishment Name', 'Barangay', 'Address', 'Status', 'Detected Date']],
        body: formattedData.map(f => [f.LogID, f.Name, f.Barangay, f.Address, f.Status, f.DetectedDate]),
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] },
        styles: { fontSize: 10 }
      });
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
      doc.setFontSize(18);
      doc.text("Field Inspector Dispatch Plan", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      doc.text("Prioritization based on Weighted Linear Combination (OPS)", 14, 36);

      autoTable(doc, {
        startY: 45,
        head: [['Rank', 'Barangay', 'OPS Score', 'Risk Level', 'Flagged', 'NCR']],
        body: formattedData.map(r => [r.Rank, r.Barangay, r.PriorityScore, r.RiskLevel, r.TotalFlagged, r.NonComplianceRate]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 10 }
      });
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
