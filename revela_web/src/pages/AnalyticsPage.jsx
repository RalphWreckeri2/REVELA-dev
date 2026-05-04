import React from "react";
import DashboardLayout from "../components/DashboardLayout";

export default function AnalyticsPage() {
  // Mock Data: Prescriptive Analytics - Weighted Linear Combination (WLC) Scores
  const wlcRankings = [
    { id: 1, barangay: "Poblacion II", score: 89.4, risk: "High", flagged: 18 },
    { id: 2, barangay: "Kinalaglagan", score: 76.2, risk: "High", flagged: 12 },
    { id: 3, barangay: "Nangkaan", score: 65.8, risk: "Medium", flagged: 8 },
    { id: 4, barangay: "Lumang Lipa", score: 42.1, risk: "Low", flagged: 3 },
    { id: 5, barangay: "Bayorbor", score: 38.5, risk: "Low", flagged: 2 },
  ];

  const handleExportInsights = () => {
    window.alert("Exporting analytics insights...");
  };

  const handleViewDetails = () => {
    window.alert("Opening detailed analytics report...");
  };

  return (
    <DashboardLayout>
      {/* PAGE HEADER */}
      <div className="page-header" style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 className="page-title">System Analytics</h1>
          <p className="page-subtitle">Descriptive, Diagnostic, and Prescriptive Insights</p>
        </div>
        <button className="primary-btn" type="button" onClick={handleExportInsights}>
          Export Insights
        </button>
      </div>

      {/* 1. DESCRIPTIVE ANALYTICS: METRIC CARDS */}
      <h3 style={{ fontSize: "16px", color: "#64748b", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "1px" }}>Descriptive Overview</h3>
      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "40px" }}>
        <div className="saas-card frosted-glass" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "12px", background: "rgba(86, 171, 47, 0.1)", color: "#56ab2f", display: "flex", alignItems: "center", justifyContent: "center" }}>
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          </div>
          <div>
            <h3 style={{ fontSize: "28px", fontWeight: "800", color: "#1a202c", margin: "0 0 4px 0" }}>94.2%</h3>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Overall Compliance Rate</p>
          </div>
        </div>

        <div className="saas-card frosted-glass" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
          </div>
          <div>
            <h3 style={{ fontSize: "28px", fontWeight: "800", color: "#1a202c", margin: "0 0 4px 0" }}>43</h3>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Total Unregistered Flags</p>
          </div>
        </div>

        <div className="saas-card frosted-glass" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "12px", background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <div>
            <h3 style={{ fontSize: "28px", fontWeight: "800", color: "#1a202c", margin: "0 0 4px 0" }}>2</h3>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>High-Risk Barangays</p>
          </div>
        </div>
      </div>

      {/* 2. DIAGNOSTIC ANALYTICS: CHARTS */}
      <h3 style={{ fontSize: "16px", color: "#64748b", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "1px" }}>Diagnostic Analytics</h3>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "40px" }}>
        
        {/* Bar Chart Placeholder */}
        <div className="saas-card frosted-glass" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#1a202c", margin: 0 }}>Compliance by Barangay</h3>
            <button type="button" onClick={handleViewDetails} style={{ all: "unset", color: "#56ab2f", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>View Details ↗</button>
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.4)", border: "1px dashed rgba(226, 232, 240, 0.8)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "250px" }}>
            <p style={{ color: "#94a3b8", fontWeight: "500" }}>[ Bar Chart Component Rendered Here ]</p>
          </div>
        </div>

        {/* Pie Chart Placeholder */}
        <div className="saas-card frosted-glass" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#1a202c", margin: 0 }}>Flagged Business Types</h3>
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.4)", border: "1px dashed rgba(226, 232, 240, 0.8)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "250px" }}>
            <p style={{ color: "#94a3b8", fontWeight: "500" }}>[ Pie Chart Rendered Here ]</p>
          </div>
        </div>
      </div>

      {/* 3. PRESCRIPTIVE ANALYTICS: WLC OPERATIONAL PRIORITY RANKING */}
      <h3 style={{ fontSize: "16px", color: "#64748b", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "1px" }}>Prescriptive Analytics</h3>
      <div className="saas-card frosted-glass">
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#1a202c", margin: "0 0 8px 0" }}>Operational Priority Ranking</h3>
          <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>Barangays ranked by Weighted Linear Combination (WLC) score for optimal inspector deployment.</p>
        </div>
        
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid rgba(226, 232, 240, 0.6)", color: "#94a3b8", fontSize: "12px", textTransform: "uppercase" }}>
                <th style={{ padding: "12px 16px", fontWeight: "700" }}>Rank</th>
                <th style={{ padding: "12px 16px", fontWeight: "700" }}>Barangay</th>
                <th style={{ padding: "12px 16px", fontWeight: "700" }}>Flagged Count</th>
                <th style={{ padding: "12px 16px", fontWeight: "700" }}>WLC Score</th>
                <th style={{ padding: "12px 16px", fontWeight: "700" }}>Risk Priority</th>
              </tr>
            </thead>
            <tbody>
              {wlcRankings.map((row, index) => (
                <tr key={row.id} style={{ borderBottom: "1px solid rgba(226, 232, 240, 0.4)", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.9)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "16px", fontWeight: "600", color: "#1a202c" }}>#{index + 1}</td>
                  <td style={{ padding: "16px", fontWeight: "600", color: "#1a202c" }}>{row.barangay}</td>
                  <td style={{ padding: "16px", color: "#64748b" }}>{row.flagged} Entities</td>
                  <td style={{ padding: "16px", fontWeight: "700", color: "#1a202c" }}>{row.score}</td>
                  <td style={{ padding: "16px" }}>
                    <span className={`badge ${row.risk === "High" ? "red" : row.risk === "Medium" ? "" : ""}`} 
                          style={{ background: row.risk === "Medium" ? "#fef3c7" : row.risk === "Low" ? "#dcfce3" : undefined, 
                                   color: row.risk === "Medium" ? "#d97706" : row.risk === "Low" ? "#166534" : undefined }}>
                      {row.risk} Priority
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}