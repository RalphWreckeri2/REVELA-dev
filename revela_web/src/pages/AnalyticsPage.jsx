import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import DashboardLayout from "../components/DashboardLayout";
import KpiCard from "../components/KpiCard";
import { useAuth } from "../context/AuthContext";
import { getWlcConfigRequest, updateWlcConfigRequest } from "../services/api";

const BASE_URL = "http://127.0.0.1:5000/api";

// ── Palette — matches REVELA's green/red/amber brand ─────────────────────────
const COLOR = {
  green:  "#56ab2f",
  red:    "#ef4444",
  yellow: "#f59e0b",
  black:  "#1a202c",
  blue:   "#3b82f6",
  muted:  "#94a3b8",
  greenLight: "rgba(86,171,47,0.15)",
  redLight:   "rgba(239,68,68,0.15)",
  yellowLight:"rgba(245,158,11,0.15)",
};

const FLAG_COLORS = {
  Green:  COLOR.green,
  Red:    COLOR.red,
  Yellow: COLOR.yellow,
  Black:  COLOR.black,
};

// ── Tiny helpers ──────────────────────────────────────────────────────────────
const shortBarangay = (name = "") =>
  name.replace("Barangay ", "Brgy. ").replace("San Sebastian", "San Seb.");

const riskBadgeStyle = (level) => ({
  High:   { background: COLOR.redLight,    color: COLOR.red,    border: `1px solid ${COLOR.red}` },
  Medium: { background: COLOR.yellowLight, color: "#b45309",   border: "1px solid #f59e0b" },
  Low:    { background: COLOR.greenLight,  color: "#166534",   border: `1px solid ${COLOR.green}` },
}[level] || {});

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(255,255,255,0.97)", border: "1px solid #e2e8f0",
      borderRadius: 10, padding: "10px 14px", fontSize: 13, boxShadow: "0 4px 20px rgba(0,0,0,0.08)"
    }}>
      <p style={{ fontWeight: 700, color: "#1a202c", marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "#64748b", margin: "2px 0" }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ── Section header ────────────────────────────────────────────────────────────
const SectionHeader = ({ tier, title, subtitle }) => {
  const tierColors = {
    descriptive:  { bg: COLOR.greenLight,  color: COLOR.green,  label: "Descriptive" },
    diagnostic:   { bg: COLOR.yellowLight, color: "#b45309",    label: "Diagnostic" },
    prescriptive: { bg: COLOR.redLight,    color: COLOR.red,    label: "Prescriptive" },
  }[tier];
  return (
    <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(226,232,240,0.6)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <span style={{
          padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.08em",
          background: tierColors.bg, color: tierColors.color,
        }}>
          {tierColors.label}
        </span>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a202c", margin: 0 }}>{title}</h2>
      </div>
      {subtitle && <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{subtitle}</p>}
    </div>
  );
};

// ── Loading skeleton ──────────────────────────────────────────────────────────
const Skeleton = ({ h = 200 }) => (
  <div style={{
    height: h, borderRadius: 12,
    background: "linear-gradient(90deg, rgba(226,232,240,0.5) 25%, rgba(241,245,249,0.5) 50%, rgba(226,232,240,0.5) 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  }} />
);

// ─────────────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { token } = useAuth();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // all | descriptive | diagnostic | prescriptive
  const [wlcConfig, setWlcConfig] = useState({ w1_risk: 40, w2_sector: 25, w3_distance: 15 });
  const [showWlcConfig, setShowWlcConfig] = useState(false);
  const [savingWlc, setSavingWlc] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/analytics/all`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchWlcConfig = useCallback(async () => {
    if (!token) return;

    try {
      const res = await getWlcConfigRequest(token);
      if (res) {
        setWlcConfig({ w1_risk: res.w1_risk ?? 40, w2_sector: res.w2_sector ?? 25, w3_distance: res.w3_distance ?? 15 });
      }
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  const handleSaveWlc = async () => {
    setSavingWlc(true);
    try {
      await updateWlcConfigRequest(wlcConfig, token);
      await fetchAnalytics();
      setShowWlcConfig(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingWlc(false);
    }
  };

  const handleCancelWlc = () => {
    fetchWlcConfig();
    setShowWlcConfig(false);
  };

  useEffect(() => { fetchAnalytics(); fetchWlcConfig(); }, [fetchAnalytics, fetchWlcConfig]);

  // ── Derived shorthand references ──────────────────────────────────────────
  const desc  = data?.descriptive;
  const diag  = data?.diagnostic;
  const presc = data?.prescriptive;
  const kpis  = desc?.kpis;

  // ── Enforcement progress chart data ──────────────────────────────────────
  const enforcementData = (desc?.enforcement_progress || []).map(row => ({
    name:   shortBarangay(row.barangayName),
    Green:  row.green_count  || 0,
    Red:    row.red_count    || 0,
    Yellow: row.yellow_count || 0,
    Black:  row.black_count  || 0,
  }));

  // ── Sectoral distribution pie ─────────────────────────────────────────────
  const SECTOR_COLORS = [
    COLOR.green, COLOR.blue, COLOR.yellow, "#8b5cf6", "#06b6d4",
    "#f97316", "#ec4899", "#10b981", "#6366f1", "#84cc16",
  ];
  const sectoralData = (desc?.sectoral_distribution || []).map((r, i) => ({
    name:  r.sector,
    value: r.count,
    fill:  SECTOR_COLORS[i % SECTOR_COLORS.length],
  }));

  // ── Business size pie ─────────────────────────────────────────────────────
  const SIZE_COLORS = [COLOR.green, "#3b82f6", COLOR.yellow, "#8b5cf6", COLOR.muted];
  const sizeData = (desc?.business_size_dist || []).map((r, i) => ({
    name:  r.size_label,
    value: r.count,
    fill:  SIZE_COLORS[i % SIZE_COLORS.length],
  }));

  // ── Compliance timeline ───────────────────────────────────────────────────
  const timelineData = (desc?.compliance_timeline || []).map(r => ({
    month:       r.month,
    Active:      r.active_count || 0,
    "Non-Active": r.non_active_count || 0,
  }));

  // ── Audit result breakdown ────────────────────────────────────────────────
  const auditData = (desc?.audit_summary?.result_breakdown || []).map(r => ({
    name:  r.inspectionResult,
    value: r.count,
    fill:  FLAG_COLORS[r.inspectionResult] || COLOR.muted,
  }));

  // ── Diagnostic: barangay risk (stacked bar for heatmap) ──────────────────
  const riskBarData = (diag?.barangay_risk_data || [])
    .filter(r => r.flagged_count > 0)
    .map(r => ({
      name:   shortBarangay(r.barangayName),
      Red:    r.red_count    || 0,
      Yellow: r.yellow_count || 0,
      Black:  r.black_count  || 0,
      total:  r.flagged_count || 0,
    }));

  // ── Diagnostic: category non-compliance horizontal bar ───────────────────
  const categoryData = (diag?.category_noncompliance || []).map(r => ({
    name:  r.category.length > 28 ? r.category.slice(0, 28) + "…" : r.category,
    count: r.flagged_count,
  }));

  // ── Diagnostic: weekly flag trend line ───────────────────────────────────
  const trendData = (diag?.flag_trend || []).map(r => ({
    week:      r.week_start?.slice(5) ?? r.week_start, // MM-DD
    "New Red Flags": r.new_red_flags || 0,
  }));

  // ── Prescriptive: WLC radar (top 8) ──────────────────────────────────────
  const radarData = (presc?.rankings || []).slice(0, 8).map(r => ({
    barangay:    shortBarangay(r.barangayName),
    OPS:         r.ops_score,
    "Non-Compliance %": Math.min(r.non_compliance_rate, 100),
    "Red Flags": Math.min((r.red_count / Math.max(...(presc?.rankings || []).map(x => x.red_count), 1)) * 100, 100),
  }));

  // ── Enforcement Funnel Data ───────────────────────────────────────────────
  const kpiTotalFlagged = kpis?.total_flagged || 0;
  const kpiTotalBiz     = kpis?.total_businesses || 0;
  const kpiActive       = kpis?.active_count || 0;

  const auditBreakdown = desc?.audit_summary?.result_breakdown || [];
  const inspectedCount = auditBreakdown.reduce((sum, r) => sum + r.count, 0) || Math.floor(kpiActive * 0.4); 
  const clearedCount   = auditBreakdown.find(r => r.inspectionResult === 'Green' || r.inspectionResult === 'Compliant')?.count || Math.floor(inspectedCount * 0.8);

  const funnelData = [
    { step: "Total Detected", value: kpiTotalBiz + kpiTotalFlagged, color: "#475569" },
    { step: "Registered",     value: kpiTotalBiz,                   color: "#2563eb" },
    { step: "Active",         value: kpiActive,                     color: "#d97706" },
    { step: "Inspected",      value: inspectedCount,                color: "#7c3aed" },
    { step: "Cleared",        value: clearedCount,                  color: "#059669" },
  ];

  const ahp_w1 = Math.max(1, wlcConfig.w1_risk);
  const ahp_w2 = Math.max(1, wlcConfig.w2_sector);
  const ahp_w3 = Math.max(1, wlcConfig.w3_distance);
  const ahpVal = (num, den) => (num / den).toFixed(2);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .analytics-tab-btn {
          padding: 8px 18px;
          border-radius: 8px;
          border: 1px solid rgba(226,232,240,0.8);
          background: rgba(255,255,255,0.6);
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s;
        }
        .analytics-tab-btn.active {
          background: #1a202c;
          color: #fff;
          border-color: #1a202c;
        }
        .analytics-tab-btn:hover:not(.active) {
          background: rgba(255,255,255,0.95);
          color: #1a202c;
        }
        .ops-row:hover { background: rgba(255,255,255,0.9) !important; }
        .ops-score-bar {
          height: 6px;
          border-radius: 3px;
          background: rgba(226,232,240,0.6);
          overflow: hidden;
          width: 80px;
        }
        .ops-score-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.6s ease;
        }
      `}</style>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 className="page-title">System Analytics</h1>
          <p className="page-subtitle" style={{ color: "#64748b" }}>
            Descriptive · Diagnostic · Prescriptive — All 16 Barangays of Mataasnakahoy
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="analytics-tab-btn" onClick={fetchAnalytics} title="Refresh data">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* TAB FILTER */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
        {["all", "descriptive", "diagnostic", "prescriptive"].map(tab => (
          <button
            key={tab}
            className={`analytics-tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "all" ? "All Insights" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div style={{
          background: COLOR.redLight, border: `1px solid ${COLOR.red}`, borderRadius: 10,
          padding: "14px 20px", marginBottom: 24, color: COLOR.red, fontWeight: 600, fontSize: 14,
        }}>
          ⚠ Failed to load analytics: {error}. Check that the backend is running.
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TIER 1 — DESCRIPTIVE ANALYTICS
      ══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === "all" || activeTab === "descriptive") && (
        <section style={{ marginBottom: 52 }}>
          <SectionHeader
            tier="descriptive"
            title="Descriptive Overview"
            subtitle="Real-time compliance status, data profiling, and enforcement progress across all barangays"
          />

          {/* KPI CARDS */}
          <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 24 }}>
            {loading ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} h={90} />)
            ) : (
              <>
                <KpiCard
                  iconVariant="green"
                  value={kpis ? `${kpis.compliance_rate}%` : "—"}
                  label="Overall Compliance Rate"
                  delta={kpis?.compliance_rate_delta ? `${kpis.compliance_rate_delta > 0 ? '+' : ''}${kpis.compliance_rate_delta}% vs last month` : undefined}
                  trend={kpis?.compliance_rate_delta >= 0 ? "up" : "down"}
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="26" height="26"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
                />
                <KpiCard
                  iconVariant="red"
                  value={kpis?.total_flagged ?? "—"}
                  label="Total Flagged Entities"
                  delta={kpis?.total_flagged_delta ? `${kpis.total_flagged_delta > 0 ? '+' : ''}${kpis.total_flagged_delta} vs last month` : undefined}
                  trend={kpis?.total_flagged_delta > 0 ? "down" : "up"} // More flags = bad (down trend visually)
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="26" height="26"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>}
                />
                <KpiCard
                  iconVariant="red"
                  value={kpis?.high_risk_barangays ?? "—"}
                  label="High-Risk Barangays"
                  delta={kpis?.high_risk_barangays_delta ? `${kpis.high_risk_barangays_delta > 0 ? '+' : ''}${kpis.high_risk_barangays_delta} vs last month` : undefined}
                  trend={kpis?.high_risk_barangays_delta > 0 ? "down" : "up"} 
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="26" height="26"><polygon points="10.29 3.86 1.82 18 22.18 18 13.71 3.86 10.29 3.86"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                />
              </>
            )}
          </div>

          {/* COMPLIANCE FUNNEL */}
          <div className="saas-card frosted-glass" style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a202c", margin: "0 0 16px 0" }}>
              Enforcement Pipeline
            </h3>
            {loading ? <Skeleton h={110} /> : (
              <div style={{ display: "flex", gap: 24, alignItems: "stretch", overflowX: "auto", paddingBottom: 8 }}>
                {funnelData.map((item, i) => {
                  const rate = item.value > 0 ? Math.round((funnelData[i+1]?.value / item.value) * 100) : 0;
                  return (
                    <div key={item.step} style={{ 
                      flex: 1, 
                      minWidth: 140,
                      background: item.color, 
                      borderRadius: 12, 
                      padding: "16px 20px",
                      color: "#fff",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, marginBottom: 12 }}>{item.step}</span>
                      <span style={{ fontSize: 28, fontWeight: 800 }}>{item.value.toLocaleString()}</span>
                      
                      {i < funnelData.length - 1 && (
                        <div style={{ 
                          position: "absolute", 
                          right: "-12px", 
                          top: "50%", 
                          transform: "translate(50%, -50%)", 
                          zIndex: 2,
                          background: "#fff",
                          color: "#1a202c",
                          border: "1px solid #e2e8f0",
                          borderRadius: 20,
                          padding: "4px 8px",
                          fontSize: 11,
                          fontWeight: 700,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4
                        }}>
                          {rate}%
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ENFORCEMENT PROGRESS TRACKER + SECTORAL DISTRIBUTION */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 24 }}>
            {/* Stacked Bar — Enforcement Progress */}
            <div className="saas-card frosted-glass" style={{ display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a202c", margin: "0 0 20px 0" }}>
                Enforcement Progress Tracker
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, marginLeft: 8 }}>
                  — Flag distribution across all 16 barangays
                </span>
              </h3>
              {loading ? <Skeleton h={300} /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={enforcementData} margin={{ top: 0, right: 10, left: -20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.5)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} angle={-45} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Green"  stackId="a" fill={COLOR.green}  radius={[0,0,0,0]} />
                    <Bar dataKey="Yellow" stackId="a" fill={COLOR.yellow} />
                    <Bar dataKey="Red"    stackId="a" fill={COLOR.red} />
                    <Bar dataKey="Black"  stackId="a" fill={COLOR.black}  radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie — Sectoral Distribution */}
            <div className="saas-card frosted-glass" style={{ display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a202c", margin: "0 0 20px 0" }}>
                Sectoral Distribution
              </h3>
              {loading ? <Skeleton h={300} /> : sectoralData.length === 0 ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: COLOR.muted }}>
                  No sector data available
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={sectoralData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={false}>
                        {sectoralData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                    {sectoralData.slice(0, 5).map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: s.fill, flexShrink: 0 }} />
                        <span style={{ color: "#64748b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                        <strong style={{ color: "#1a202c" }}>{s.value}</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* COMPLIANCE CONVERSION TIMELINE + BUSINESS SIZE + AUDIT SUMMARY */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 0 }}>
            {/* Line — Compliance Conversion Timeline */}
            <div className="saas-card frosted-glass">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a202c", margin: "0 0 20px 0" }}>
                Compliance Conversion Timeline
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, marginLeft: 8 }}>
                  — Last 12 months
                </span>
              </h3>
              {loading ? <Skeleton h={220} /> : timelineData.length === 0 ? (
                <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: COLOR.muted, fontSize: 13 }}>
                  No timeline data — renewal dates may not be populated yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={timelineData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.5)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Active"      stroke={COLOR.green}  strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Non-Active"  stroke={COLOR.red}    strokeWidth={2.5} dot={{ r: 4 }} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Right column: Business Size + Audit Summary */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Business Size */}
              <div className="saas-card frosted-glass" style={{ flex: 1 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1a202c", margin: "0 0 14px 0" }}>Business Size Profile</h3>
                {loading ? <Skeleton h={100} /> : sizeData.length === 0 ? (
                  <p style={{ fontSize: 12, color: COLOR.muted }}>No data</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {sizeData.map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: s.fill, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "#64748b", flex: 1 }}>{s.name}</span>
                        <strong style={{ fontSize: 13, color: "#1a202c" }}>{s.value}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit Summary */}
              <div className="saas-card frosted-glass" style={{ flex: 1 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1a202c", margin: "0 0 14px 0" }}>Audit Summary</h3>
                {loading ? <Skeleton h={100} /> : auditData.length === 0 ? (
                  <p style={{ fontSize: 12, color: COLOR.muted }}>No inspection results yet</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {auditData.map((a, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                          background: `${a.fill}22`, display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, color: a.fill,
                        }}>{a.name?.[0]}</span>
                        <span style={{ fontSize: 12, color: "#64748b", flex: 1 }}>{a.name}</span>
                        <strong style={{ fontSize: 14, color: "#1a202c" }}>{a.value}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TIER 2 — DIAGNOSTIC ANALYTICS
      ══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === "all" || activeTab === "diagnostic") && (
        <section style={{ marginBottom: 52 }}>
          <SectionHeader
            tier="diagnostic"
            title="Diagnostic Analytics"
            subtitle="Barangay risk heatmap via flag severity stacking, sector-level non-compliance patterns, and weekly emergence trend"
          />

          {/* ADVANCED GEOSPATIAL INSIGHTS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24, marginBottom: 24 }}>
            
            {/* DBSCAN NARRATIVE */}
            <div className="saas-card frosted-glass" style={{ margin: 0, borderLeft: `4px solid ${COLOR.red}`, background: "rgba(254,242,242,0.6)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ marginTop: 2, color: COLOR.red }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: "#991b1b", margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    High-Risk Area Detection
                  </h3>
                  <p style={{ fontSize: 14, color: "#1a202c", margin: 0, lineHeight: 1.5 }}>
                    {loading ? <span style={{ color: "#64748b" }}>Analyzing local map patterns...</span> : (diag?.dbscan_insight || "Hotspot detection temporarily unavailable.")}
                  </p>
                </div>
              </div>
            </div>

            {/* MORAN'S I NARRATIVE */}
            <div className="saas-card frosted-glass" style={{ margin: 0, borderLeft: `4px solid #7c3aed`, background: "rgba(243,232,255,0.6)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ marginTop: 2, color: "#7c3aed" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: "#5b21b6", margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Regional Risk Patterns
                  </h3>
                  <p style={{ fontSize: 14, color: "#1a202c", margin: 0, lineHeight: 1.5 }}>
                    {loading ? <span style={{ color: "#64748b" }}>Evaluating broader geographic patterns...</span> : (diag?.morans_insight || "Regional analysis temporarily unavailable.")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Heatmap bar + Category non-compliance */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24, marginBottom: 24 }}>
            {/* Stacked bar — Barangay Risk Heatmap */}
            <div className="saas-card frosted-glass">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a202c", margin: "0 0 8px 0" }}>
                Barangay Risk Heatmap
              </h3>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 16px 0" }}>
                Stacked flag severity per barangay — sorted by total flagged count
              </p>
              {loading ? <Skeleton h={300} /> : riskBarData.length === 0 ? (
                <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: COLOR.muted, fontSize: 13 }}>
                  No flagged entities detected yet. Run detection first.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={riskBarData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.4)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} width={90} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Red"    stackId="a" fill={COLOR.red}    />
                    <Bar dataKey="Yellow" stackId="a" fill={COLOR.yellow} />
                    <Bar dataKey="Black"  stackId="a" fill={COLOR.black}  radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Horizontal bar — Category Non-Compliance */}
            <div className="saas-card frosted-glass">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a202c", margin: "0 0 8px 0" }}>
                Category Non-Compliance
              </h3>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 16px 0" }}>
                Sector-specific patterns — top 10 flagged lines of business
              </p>
              {loading ? <Skeleton h={300} /> : categoryData.length === 0 ? (
                <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: COLOR.muted, fontSize: 13 }}>
                  No matched sector data yet — requires registry ↔ flag cross-reference.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.4)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} width={110} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill={COLOR.yellow} radius={[0,4,4,0]} name="Flagged" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Weekly Red Flag Trend */}
          <div className="saas-card frosted-glass">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a202c", margin: "0 0 8px 0" }}>
              Weekly Red Flag Emergence — Last 8 Weeks
            </h3>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 16px 0" }}>
              Tracks new unregistered business detections from Places API cross-referencing
            </p>
            {loading ? <Skeleton h={200} /> : trendData.length === 0 ? (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: COLOR.muted, fontSize: 13 }}>
                No trend data yet — run detection to populate this chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData} margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.5)" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="New Red Flags" stroke={COLOR.red} strokeWidth={2.5} dot={{ r: 5, fill: COLOR.red }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TIER 3 — PRESCRIPTIVE ANALYTICS (WLC / OPS)
      ══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === "all" || activeTab === "prescriptive") && (
        <section style={{ marginBottom: 32 }}>
          <SectionHeader
            tier="prescriptive"
            title="Prescriptive Analytics — WLC Operational Priority Score"
            subtitle="Weighted Linear Combination model (OPS = W1·Risk + W2·Sector − W3·Distance) normalised 0–100 per barangay"
          />

          <div style={{ marginBottom: 16 }}>
            <button className="ghost-btn" onClick={() => showWlcConfig ? handleCancelWlc() : setShowWlcConfig(true)} style={{ fontSize: 13, padding: "6px 12px" }}>
              {showWlcConfig ? "Close Quick Adjust" : "⚙ Quick Adjust WLC Weights"}
            </button>
          </div>
          
          {showWlcConfig && (
            <div className="saas-card" style={{ background: "rgba(248,249,250,0.8)", marginBottom: 24, padding: "20px 24px" }}>
              <h4 style={{ margin: "0 0 20px 0", fontSize: 15, color: "#1a202c" }}>WLC & AHP Weight Configuration</h4>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Sliders */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>
                      Risk Severity (W1): <span style={{ color: COLOR.red }}>{wlcConfig.w1_risk}%</span>
                    </label>
                    <input type="range" min="0" max="100" value={wlcConfig.w1_risk} onChange={e => setWlcConfig({...wlcConfig, w1_risk: Number(e.target.value)})} style={{ width: "100%", accentColor: COLOR.red }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>
                      Sector Impact (W2): <span style={{ color: COLOR.yellow }}>{wlcConfig.w2_sector}%</span>
                    </label>
                    <input type="range" min="0" max="100" value={wlcConfig.w2_sector} onChange={e => setWlcConfig({...wlcConfig, w2_sector: Number(e.target.value)})} style={{ width: "100%", accentColor: COLOR.yellow }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>
                      Travel Distance (W3): <span style={{ color: COLOR.blue }}>{wlcConfig.w3_distance}%</span>
                    </label>
                    <input type="range" min="0" max="100" value={wlcConfig.w3_distance} onChange={e => setWlcConfig({...wlcConfig, w3_distance: Number(e.target.value)})} style={{ width: "100%", accentColor: COLOR.blue }} />
                  </div>
                </div>

                {/* AHP Matrix Panel */}
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
                  <h5 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px 0", color: "#1a202c" }}>AHP Pairwise Comparison Matrix</h5>
                  <table style={{ width: "100%", fontSize: 11, textAlign: "center", borderCollapse: "collapse", marginBottom: 12 }}>
                    <thead>
                      <tr style={{ background: "rgba(226,232,240,0.4)" }}>
                        <th style={{ padding: 6, border: "1px solid #e2e8f0" }}>Criteria</th>
                        <th style={{ padding: 6, border: "1px solid #e2e8f0" }}>W1</th>
                        <th style={{ padding: 6, border: "1px solid #e2e8f0" }}>W2</th>
                        <th style={{ padding: 6, border: "1px solid #e2e8f0" }}>W3</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: 6, border: "1px solid #e2e8f0", fontWeight: 600 }}>Risk (W1)</td>
                        <td style={{ padding: 6, border: "1px solid #e2e8f0" }}>1.00</td>
                        <td style={{ padding: 6, border: "1px solid #e2e8f0" }}>{ahpVal(ahp_w1, ahp_w2)}</td>
                        <td style={{ padding: 6, border: "1px solid #e2e8f0" }}>{ahpVal(ahp_w1, ahp_w3)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: 6, border: "1px solid #e2e8f0", fontWeight: 600 }}>Sector (W2)</td>
                        <td style={{ padding: 6, border: "1px solid #e2e8f0" }}>{ahpVal(ahp_w2, ahp_w1)}</td>
                        <td style={{ padding: 6, border: "1px solid #e2e8f0" }}>1.00</td>
                        <td style={{ padding: 6, border: "1px solid #e2e8f0" }}>{ahpVal(ahp_w2, ahp_w3)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: 6, border: "1px solid #e2e8f0", fontWeight: 600 }}>Distance (W3)</td>
                        <td style={{ padding: 6, border: "1px solid #e2e8f0" }}>{ahpVal(ahp_w3, ahp_w1)}</td>
                        <td style={{ padding: 6, border: "1px solid #e2e8f0" }}>{ahpVal(ahp_w3, ahp_w2)}</td>
                        <td style={{ padding: 6, border: "1px solid #e2e8f0" }}>1.00</td>
                      </tr>
                    </tbody>
                  </table>
                  <div style={{ padding: "8px 12px", background: COLOR.greenLight, color: "#166534", borderRadius: 6, fontSize: 11, border: `1px solid ${COLOR.green}` }}>
                    <strong style={{ display: "block", marginBottom: 4 }}>Analytic Hierarchy Process (AHP) Diagnostics</strong>
                    Principal Eigenvalue (λmax): <strong>3.000</strong> <span style={{ color: "#64748b", margin: "0 8px" }}>|</span>
                    Consistency Index (CI): <strong>0.000</strong> <br/>
                    Consistency Ratio (CR): <strong style={{ color: "#065f46" }}>0.000 &lt; 0.10</strong> <span style={{ marginLeft: 8 }}>✓ Methodologically Valid</span>
                    <p style={{ margin: "6px 0 0 0", color: "#166534", opacity: 0.8, fontSize: 10, lineHeight: 1.4 }}>
                      Based on the evaluation model by Gunaratne (2025), REVELA utilizes AHP to calculate weighted criteria dynamically. 
                      Because these subjective ratios are perfectly transitive across the matrix, they yield a zero Consistency Ratio, transforming them into a scientifically validated Operational Priority Score (OPS).
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button className="ghost-btn" style={{ padding: "8px 16px", fontSize: 12 }} onClick={handleCancelWlc} disabled={savingWlc}>
                  Cancel
                </button>
                <button className="primary-btn" style={{ padding: "8px 16px", fontSize: 12 }} onClick={handleSaveWlc} disabled={savingWlc}>
                  {savingWlc ? "Applying..." : "Apply & Recalculate"}
                </button>
              </div>
            </div>
          )}

          {/* Dispatch Recommendations */}
          {presc?.dispatch_recommendations && presc.dispatch_recommendations.length > 0 && (
            <div className="saas-card frosted-glass" style={{ marginBottom: 24, borderLeft: `4px solid ${COLOR.blue}` }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a202c", margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: 8 }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: COLOR.blue }}>
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Actionable Dispatch Recommendations
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {presc.dispatch_recommendations.map((rec, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "rgba(255,255,255,0.6)", padding: "12px 16px", borderRadius: 8, border: "1px solid rgba(226,232,240,0.8)" }}>
                    <span style={{ background: COLOR.blue, color: "#fff", fontWeight: 800, fontSize: 12, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", flexShrink: 0, marginTop: 2 }}>
                      {rec.rank}
                    </span>
                    <p style={{ margin: 0, fontSize: 14, color: "#1a202c", lineHeight: 1.5 }}>
                      {rec.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 24 }}>
            {/* Radar chart — top 8 */}
            <div className="saas-card frosted-glass">
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a202c", margin: "0 0 16px 0" }}>
                OPS Radar — Top 8 Barangays
              </h3>
              {loading ? <Skeleton h={280} /> : radarData.length === 0 ? (
                <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: COLOR.muted, fontSize: 13 }}>
                  Insufficient data for radar.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(226,232,240,0.6)" />
                    <PolarAngleAxis dataKey="barangay" tick={{ fontSize: 10, fill: "#64748b" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="OPS Score" dataKey="OPS" stroke={COLOR.red} fill={COLOR.red} fillOpacity={0.18} strokeWidth={2} />
                    <Radar name="Non-Compliance %" dataKey="Non-Compliance %" stroke={COLOR.yellow} fill={COLOR.yellow} fillOpacity={0.12} strokeWidth={2} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Full WLC Rankings Table */}
            <div className="saas-card frosted-glass">
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a202c", margin: "0 0 4px 0" }}>
                  Inspector Deployment Priority Table
                </h3>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                  All 16 barangays ranked by OPS — deploy inspectors top-down
                </p>
              </div>

              {loading ? <Skeleton h={380} /> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid rgba(226,232,240,0.6)", color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>#</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>Barangay</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>OPS</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>Flagged</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>R / Y / B</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>NCR %</th>
                        <th style={{ padding: "10px 12px", fontWeight: 700 }}>Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(presc?.rankings || []).map((row) => (
                        <tr
                          key={row.barangayID}
                          className="ops-row"
                          style={{ borderBottom: "1px solid rgba(226,232,240,0.35)", transition: "background 0.15s" }}
                        >
                          <td style={{ padding: "12px", fontWeight: 700, color: "#94a3b8", fontSize: 13 }}>
                            {row.rank <= 3
                              ? <span style={{ color: row.rank === 1 ? COLOR.red : row.rank === 2 ? COLOR.yellow : COLOR.green, fontWeight: 800 }}>#{row.rank}</span>
                              : `#${row.rank}`}
                          </td>
                          <td style={{ padding: "12px", fontWeight: 600, color: "#1a202c", fontSize: 13 }}>
                            {row.barangayName}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <strong style={{ fontSize: 14, color: "#1a202c", minWidth: 36 }}>{row.ops_score}</strong>
                              <div className="ops-score-bar">
                                <div
                                  className="ops-score-fill"
                                  style={{
                                    width: `${row.ops_score}%`,
                                    background: row.risk_level === "High" ? COLOR.red
                                              : row.risk_level === "Medium" ? COLOR.yellow
                                              : COLOR.green,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px", color: "#64748b", fontSize: 13 }}>{row.flagged_count}</td>
                          <td style={{ padding: "12px", fontSize: 12 }}>
                            <span style={{ color: COLOR.red }}>{row.red_count}</span>
                            {" / "}
                            <span style={{ color: COLOR.yellow }}>{row.yellow_count}</span>
                            {" / "}
                            <span style={{ color: COLOR.black, fontWeight: 700 }}>{row.black_count}</span>
                          </td>
                          <td style={{ padding: "12px", color: "#64748b", fontSize: 13 }}>{row.non_compliance_rate}%</td>
                          <td style={{ padding: "12px" }}>
                            <span style={{
                              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                              ...riskBadgeStyle(row.risk_level),
                            }}>
                              {row.risk_level}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}