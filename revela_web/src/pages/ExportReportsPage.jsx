import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";

const REPORTS = [
  { id: 1, title: "Weekly Compliance Summary", generated: "Today, 08:30", status: "Ready" },
  { id: 2, title: "Top Unregistered Establishments", generated: "Yesterday, 17:20", status: "Ready" },
  { id: 3, title: "Field Inspector Dispatch Plan", generated: "May 3, 2026", status: "Ready" },
];

export default function ExportReportsPage() {
  const [reports] = useState(REPORTS);

  const handleCreateReport = () => {
    window.alert("Report generation started. The file will be available once ready.");
  };

  const handleDownloadReport = (title) => {
    window.alert(`Downloading report: ${title}`);
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Export Reports</h1>
          <p className="page-subtitle">Generate and download operational compliance reports.</p>
        </div>
        <button className="primary-btn" type="button" onClick={handleCreateReport}>Create Report</button>
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
                <p style={{ margin: "8px 0 0", color: "var(--color-muted)", fontSize: 13 }}>{report.generated}</p>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className={`badge badge--${report.status === "Ready" ? "green" : "gold"}`}>
                  {report.status}
                </span>
                <button className="ghost-btn" type="button" onClick={() => handleDownloadReport(report.title)}>Download</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
