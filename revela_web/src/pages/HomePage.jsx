/**
 * HomePage.jsx — Overview Dashboard
 * Live KPIs from /api/analytics/all
 * Recent Detections from /api/flags (newest activity, all colors)
 * Mini Google Map preview with real flag markers
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLoadScript, GoogleMap } from "@react-google-maps/api";
import DashboardLayout from "../components/DashboardLayout";
import KpiCard from "../components/KpiCard";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { useAuth } from "../context/AuthContext";
import { getAnalyticsOverviewRequest, getFlagsRequest, getInspectionsRequest } from "../services/api";
import "../styles/HomePage.css";

const MAP_LIBRARIES = ["places", "marker"];
const DEFAULT_CENTER = { lat: 13.9667, lng: 121.1167 };

const FLAG_COLORS = {
  Red:    { marker: "#ef4444", bg: "#fee2e2", text: "#b91c1c", label: "Unregistered"   },
  Yellow: { marker: "#f59e0b", bg: "#fef3c7", text: "#92400e", label: "Suspected"      },
  Black:  { marker: "#1e293b", bg: "#f1f5f9", text: "#1e293b", label: "Non-Responsive" },
  Green:  { marker: "#22c55e", bg: "#dcfce7", text: "#15803d", label: "Compliant"      },
};
const defaultColor = { marker: "#94a3b8", bg: "#f1f5f9", text: "#64748b", label: "Unknown" };
const getFlagColor = (c) => FLAG_COLORS[c] ?? defaultColor;

const parseColor = (f) => {
  const raw = f.flagColor || f.color || f.flag_color;
  if (!raw) return "Red";
  const s = String(raw).trim();
  if (!s) return "Red";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const shortBarangay = (name = "") => name.replace("Barangay ", "Brgy.");

// ── Onboarding ────────────────────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  { num: 1, title: "Upload Registry",  desc: "Upload the BPLO CSV to geocode and set the baseline." },
  { num: 2, title: "Review Flags",     desc: "View detected establishments plotted by compliance status." },
  { num: 3, title: "Dispatch",         desc: "Assign inspectors to high-risk targets via priority scores." },
];

function OnboardingPanel({ onDismiss }) {
  return (
    <section className="onboarding-panel frosted-glass">
      <div className="onboarding-header">
        <div>
          <span className="hero-tag">Welcome to REVELA</span>
          <h2>Geospatial Business Intelligence</h2>
        </div>
        <button className="dismiss-btn" onClick={onDismiss}>Dismiss Guide ✕</button>
      </div>
      <div className="onboarding-body">
        <div className="onboarding-about">
          <p>
            REVELA is designed for the Municipality of Mataasnakahoy. It cross-references
            public Google Maps data against the official BPLO registry to surface unregistered
            commercial establishments, generate compliance intelligence reports, and optimize
            the deployment of field inspectors.
          </p>
          <p>
            The system produces three tiers of output: Descriptive Analytics for real-time
            monitoring, Diagnostic Analytics through{" "}
            <strong>DBSCAN-powered Barangay Risk Heatmaps</strong>, and Prescriptive Analytics
            via a <strong>Weighted Linear Combination</strong> model that generates Operational
            Priority Scores.
          </p>
        </div>
        <div className="onboarding-steps">
          {ONBOARDING_STEPS.map(({ num, title, desc }) => (
            <div className="mini-step" key={num}>
              <span className="mini-step-num">{num}</span>
              <div><h4>{title}</h4><p>{desc}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── New Features / Widgets ──────────────────────────────────────────────────

function QuickActionsWidget({ navigate }) {
  return (
    <div className="dashboard-widget frosted-glass saas-card">
      <div className="widget-header">
        <h3>Quick Actions</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button className="primary-btn" onClick={() => navigate('/inspections')} style={{ justifyContent: 'center' }}>
          Dispatch Inspector
        </button>
        <button className="ghost-btn" onClick={() => navigate('/map')} style={{ justifyContent: 'center' }}>
          Manually Add Yellow Flag
        </button>
        <button className="ghost-btn" onClick={() => navigate('/map')} style={{ justifyContent: 'center' }}>
          Run Detection Engine
        </button>
      </div>
    </div>
  );
}

function SystemHealthWidget() {
  return (
    <div className="dashboard-widget frosted-glass saas-card">
      <div className="widget-header">
        <h3>System Health</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--color-muted)", fontWeight: 500 }}>Detection Engine</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 12, background: "#dcfce7", color: "#15803d" }}>Idle</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--color-muted)", fontWeight: 500 }}>Registry Sync</span>
          <span style={{ fontSize: 12, color: "var(--color-ink)", fontWeight: 600 }}>Up to date</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--color-muted)", fontWeight: 500 }}>Places API Polling</span>
          <span style={{ fontSize: 12, color: "var(--color-ink)", fontWeight: 600 }}>2 hrs ago</span>
        </div>
      </div>
    </div>
  );
}

function ActiveInspectionsWidget({ navigate, stats }) {
  return (
    <div className="dashboard-widget frosted-glass saas-card">
      <div className="widget-header">
        <h3>Active Inspections Tracker</h3>
        <button className="ghost-btn" onClick={() => navigate('/inspections')} style={{ fontSize: 11, padding: "4px 10px" }}>
          View Kanban
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, textAlign: "center", marginTop: 8 }}>
        <div style={{ background: "rgba(239,246,255,0.8)", padding: "20px 10px", borderRadius: 12, border: "1px solid #bfdbfe" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#3b82f6", lineHeight: 1 }}>{stats.assigned}</div>
          <div style={{ fontSize: 11, color: "#1e3a8a", fontWeight: 700, marginTop: 8, letterSpacing: "0.05em" }}>ASSIGNED</div>
        </div>
        <div style={{ background: "rgba(254,252,232,0.8)", padding: "20px 10px", borderRadius: 12, border: "1px solid #fef08a" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#ca8a04", lineHeight: 1 }}>{stats.reassigned}</div>
          <div style={{ fontSize: 11, color: "#713f12", fontWeight: 700, marginTop: 8, letterSpacing: "0.05em" }}>REASSIGNED</div>
        </div>
        <div style={{ background: "rgba(240,253,244,0.8)", padding: "20px 10px", borderRadius: 12, border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#16a34a", lineHeight: 1 }}>{stats.verified}</div>
          <div style={{ fontSize: 11, color: "#14532d", fontWeight: 700, marginTop: 8, letterSpacing: "0.05em" }}>VERIFIED</div>
        </div>
      </div>
    </div>
  );
}

function ComplianceTrendWidget() {
  // Static mock trend for visual representation
  const trendData = [
    { day: '1', rate: 75 }, { day: '5', rate: 76 }, { day: '10', rate: 78 },
    { day: '15', rate: 77 }, { day: '20', rate: 80 }, { day: '25', rate: 82 },
    { day: '30', rate: 83 }
  ];

  return (
    <div className="dashboard-widget frosted-glass saas-card" style={{ display: "flex", flexDirection: "column" }}>
      <div className="widget-header" style={{ marginBottom: 0 }}>
        <div>
          <h3 style={{ margin: 0 }}>Compliance Trend</h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-muted)" }}>Trailing 30 Days</p>
        </div>
        <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 700, background: "#dcfce7", padding: "4px 10px", borderRadius: 20 }}>
          +8% ↑
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 140, marginTop: 16 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
            <Line type="monotone" dataKey="rate" stroke="#22c55e" strokeWidth={3} dot={{ r: 3, fill: "#22c55e", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function HighPriorityAlertsWidget({ flags, navigate, hasLoadedFlags }) {
  // Map severity for sorting
  const severity = { Black: 3, Red: 2, Yellow: 1, Green: 0 };
  const getSeverity = (capColor) => {
    return severity[capColor] || 0;
  };
  
  // Filter to non-green, sort by severity then date, and take top 5
  const criticalFlags = flags
    .filter(f => getSeverity(parseColor(f)) > 0)
    .sort((a, b) => {
      const sevA = getSeverity(parseColor(a));
      const sevB = getSeverity(parseColor(b));
      if (sevA !== sevB) return sevB - sevA; // Highest severity first
      return new Date(b.detectedDate || 0) - new Date(a.detectedDate || 0); // Newest first
    })
    .slice(0, 5);

  return (
    <div className="dashboard-widget frosted-glass saas-card">
      <div className="widget-header">
        <h3 style={{ color: "#b91c1c", display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          High-Priority Alerts
        </h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        {criticalFlags.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "var(--color-muted)", fontSize: 13 }}>
            {hasLoadedFlags && flags.length > 0
              ? "No critical alerts — latest scans show compliant or verified establishments."
              : hasLoadedFlags
                ? "No flags in the system yet. Run the detection engine or add a manual flag."
                : "Loading alerts…"}
          </div>
        ) : criticalFlags.map(f => {
          const capColor = parseColor(f);
          const fc = getFlagColor(capColor);
          
          let alertReason = "Unregistered - Escalation needed";
          if (capColor === 'Black') alertReason = 'Non-responsive for 7+ days';
          else if (capColor === 'Yellow') alertReason = 'Suspected - Needs verification';

          return (
            <div 
              key={f.logID || f.id} 
              style={{ background: fc.bg, border: `1px solid ${fc.marker}`, padding: "10px 12px", borderRadius: 10, cursor: "pointer", transition: "transform 0.15s" }} 
              onClick={() => navigate('/map')}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: fc.text, marginBottom: 2 }}>{f.detectedName || f.name || "Unknown Establishment"}</div>
              <div style={{ fontSize: 11, color: fc.text, opacity: 0.9 }}>
                {alertReason}
              </div>
            </div>
          );
        })}
        {criticalFlags.length > 0 && (
          <button className="ghost-btn" style={{ fontSize: 11, padding: "6px", color: "#b91c1c", borderColor: "transparent", marginTop: 4, width: "100%" }} onClick={() => navigate('/map')}>
            View All Critical Targets →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Mini Map Widget ───────────────────────────────────────────────────────────
function MiniMapWidget({ flags, onOpenMap, isLoaded, loadError }) {
  const mapRef     = useRef(null);
  const markerRefs = useRef([]);

  const buildMarkerEl = (color) => {
    const el = document.createElement("div");
    el.style.cssText = `width:22px;height:22px;cursor:pointer;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3))`;
    el.innerHTML = `<svg viewBox="0 0 24 32" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20C24 5.37 18.63 0 12 0z" fill="${color}"/>
      <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
    </svg>`;
    return el;
  };

  const handleMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // Place markers once map + flags are ready
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google?.maps?.marker) return;

    // Clear old markers
    markerRefs.current.forEach(m => { m.map = null; });
    markerRefs.current = [];

    flags
      .filter(f => f.latitude != null && f.longitude != null)
      .slice(0, 100) // cap for performance
      .forEach(f => {
        const fc = getFlagColor(parseColor(f));
        const marker = new window.google.maps.marker.AdvancedMarkerElement({
          position: { lat: Number(f.latitude), lng: Number(f.longitude) },
          map:      mapRef.current,
          content:  buildMarkerEl(fc.marker),
        });
        markerRefs.current.push(marker);
      });

    return () => {
      markerRefs.current.forEach(m => { m.map = null; });
      markerRefs.current = [];
    };
  }, [isLoaded, flags]);

  return (
    <div className="dashboard-widget frosted-glass saas-card map-widget">
      <div className="widget-header">
        <h3>Live Map Preview</h3>
        <button className="ghost-btn" type="button" onClick={onOpenMap}>
          Open Full Map ↗
        </button>
      </div>

      <div style={{ borderRadius: 12, overflow: "hidden", height: 260, position: "relative" }}>
        {loadError ? (
          <div style={miniMapFallback}>
            <span>⚠ Google Maps failed to load.</span>
            <small>Check VITE_GOOGLE_MAPS_API_KEY in your .env</small>
          </div>
        ) : !isLoaded ? (
          <div style={miniMapFallback}>Loading map…</div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={DEFAULT_CENTER}
            zoom={12}
            options={{
              disableDefaultUI:  true,
              clickableIcons:    false,
              zoomControl:       false,
              mapId:             "34390388b3abb63aa84876a7",
            }}
            onLoad={handleMapLoad}
          />
        )}

        {/* Clickable overlay to open full map */}
        <div
          onClick={onOpenMap}
          title="Open full map"
          style={{
            position: "absolute", inset: 0, zIndex: 5, cursor: "pointer",
            background: "transparent",
          }}
        />

        {/* Flag count badge */}
        {flags.length > 0 && (
          <div style={{
            position: "absolute", top: 10, left: 10, zIndex: 10,
            background: "rgba(239,68,68,0.9)", color: "#fff",
            fontSize: 11, fontWeight: 700, padding: "4px 10px",
            borderRadius: 20, backdropFilter: "blur(4px)",
            pointerEvents: "none",
          }}>
            {flags.filter(f => parseColor(f) !== "Green").length} active flags
          </div>
        )}
      </div>

      {/* Mini legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
        {Object.entries(FLAG_COLORS).map(([color, meta]) => (
          <div key={color} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.marker, display: "inline-block" }} />
            {meta.label}
          </div>
        ))}
      </div>
    </div>
  );
}

const miniMapFallback = {
  width: "100%", height: "100%", display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center", gap: 6,
  background: "#f1f5f9", color: "#64748b", fontSize: 13, textAlign: "center",
};

// ── Recent Detections Widget ──────────────────────────────────────────────────
function RecentFlagsWidget({ flags, loading, onViewAll, onOpenMap, totalFetched }) {
  return (
    <div className="dashboard-widget frosted-glass saas-card">
      <div className="widget-header">
        <h3>Recent Detections</h3>
        <button className="ghost-btn" type="button" onClick={onViewAll}>View All</button>
      </div>

      <div className="flag-list">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} style={{
              height: 56, borderRadius: 10, marginBottom: 8,
              background: "linear-gradient(90deg,rgba(226,232,240,0.5) 25%,rgba(241,245,249,0.5) 50%,rgba(226,232,240,0.5) 75%)",
              backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
            }} />
          ))
        ) : flags.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: 13 }}>
            {totalFetched > 0
              ? "No recent log entries in the current batch."
              : "No flags detected yet. Run the detection engine from the map or quick actions."}
          </div>
        ) : flags.map((f) => {
          const fc = getFlagColor(parseColor(f));
          return (
            <div className="flag-item" key={f.logID || f.id}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: fc.marker, flexShrink: 0,
              }} />
              <div className="flag-details">
                <h4>{f.detectedName || f.name || "Unknown Establishment"}</h4>
                <p>{shortBarangay(f.barangayName || f.barangay || "—")}</p>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px",
                borderRadius: 10, background: fc.bg, color: fc.text,
                whiteSpace: "nowrap",
              }}>
                {fc.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { token } = useAuth();
  const navigate  = useNavigate();

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey,
    libraries: MAP_LIBRARIES,
    version:   "beta",
  });

  const [showWelcome, setShowWelcome] = useState(true);

  // KPIs
  const [kpis,     setKpis]     = useState(null);
  const [kpiError, setKpiError] = useState(false);

  // Flags
  const [recentFlags,   setRecentFlags]   = useState([]);
  const [allFlags,      setAllFlags]      = useState([]);
  const [flagsLoading,  setFlagsLoading]  = useState(true);

  const [inspectionStats, setInspectionStats] = useState({ assigned: 0, reassigned: 0, verified: 0 });

  useEffect(() => {
    if (!token) return;

    // Fetch KPIs
    getAnalyticsOverviewRequest(token)
      .then(data => setKpis(data?.descriptive?.kpis ?? null))
      .catch(() => setKpiError(true));

    // Fetch flags for map + recent list
    setFlagsLoading(true);
    getFlagsRequest({ limit: 200 }, token)
      .then(res => {
        const data = res?.data ?? [];
        setAllFlags(data);
        // Recent detections: newest activity first (all colors). Non-green surfaces first, then by date.
        const byDate = (a, b) =>
          new Date(b.detectedDate || 0) - new Date(a.detectedDate || 0);
        const nonGreen = data
          .filter(f => parseColor(f) !== "Green")
          .sort(byDate);
        const greenOnly = data
          .filter(f => parseColor(f) === "Green")
          .sort(byDate);
        const recent = [...nonGreen, ...greenOnly].slice(0, 5);
        setRecentFlags(recent);
      })
      .catch(() => {})
      .finally(() => setFlagsLoading(false));

    // Fetch inspection tracker counts
    getInspectionsRequest({ limit: 1000 }, token)
      .then(res => {
        const data = res?.data ?? [];
        let assigned = 0, reassigned = 0, verified = 0;
        data.forEach(r => {
          if (r.verificationStatus === "Assigned") assigned++;
          else if (r.verificationStatus === "Reassigned") reassigned++;
          else if (r.verificationStatus === "Verified") verified++;
        });
        setInspectionStats({ assigned, reassigned, verified });
      })
      .catch(() => {});
  }, [token]);

  const kpiCards = [
    {
      value:       kpis ? kpis.total_businesses.toLocaleString() : "—",
      label:       "Total Registered Entities",
      delta:       kpis?.total_businesses_delta ? `${kpis.total_businesses_delta > 0 ? '+' : ''}${kpis.total_businesses_delta} vs last month` : undefined,
      trend:       kpis?.total_businesses_delta >= 0 ? "up" : "down",
      iconVariant: "gold",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
        </svg>
      ),
    },
    {
      value:       kpis ? kpis.total_flagged : "—",
      label:       "Unregistered Flags Detected",
      delta:       kpis?.total_flagged_delta ? `${kpis.total_flagged_delta > 0 ? '+' : ''}${kpis.total_flagged_delta} vs last month` : undefined,
      trend:       kpis?.total_flagged_delta > 0 ? "down" : "up", // Red flag: more is bad
      iconVariant: "red",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
          <line x1="4" y1="22" x2="4" y2="15"/>
        </svg>
      ),
    },
    {
      value:       kpis ? `${kpis.compliance_rate}%` : "—",
      label:       "Overall Compliance Rate",
      delta:       kpis?.compliance_rate_delta ? `${kpis.compliance_rate_delta > 0 ? '+' : ''}${kpis.compliance_rate_delta}% vs last month` : undefined,
      trend:       kpis?.compliance_rate_delta >= 0 ? "up" : "down",
      iconVariant: "green",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      {showWelcome && <OnboardingPanel onDismiss={() => setShowWelcome(false)} />}

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview Dashboard</h1>
          <p className="page-subtitle">Real-time compliance metrics for Mataasnakahoy.</p>
        </div>
      </div>

      {kpiError && (
        <div style={{
          background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444",
          borderRadius: 8, padding: "10px 16px", marginBottom: 16,
          color: "#ef4444", fontSize: 13, fontWeight: 600,
        }}>
          ⚠ Could not load live metrics — check that the backend is running.
        </div>
      )}

      {/* KPI row */}
      <div className="kpi-grid">
        {kpiCards.map(kpi => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      {/* New Widgets: Trends & Inspections */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginTop: 24 }}>
        <ComplianceTrendWidget />
        <ActiveInspectionsWidget navigate={navigate} stats={inspectionStats} />
      </div>

      {/* New Widgets: Actions & Alerts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginTop: 24 }}>
        <QuickActionsWidget navigate={navigate} />
        <HighPriorityAlertsWidget
          flags={allFlags}
          navigate={navigate}
          hasLoadedFlags={!flagsLoading}
        />
        <SystemHealthWidget />
      </div>

      {/* Original Widget row */}
      <div className="widget-grid" style={{ marginTop: 24 }}>
        <MiniMapWidget
          flags={allFlags}
          onOpenMap={() => navigate("/map")}
          isLoaded={isLoaded}
          loadError={loadError}
        />
        <RecentFlagsWidget
          flags={recentFlags}
          loading={flagsLoading}
          onViewAll={() => navigate("/map")}
          onOpenMap={() => navigate("/map")}
          totalFetched={allFlags.length}
        />
      </div>

      {/* Footer */}
      <footer className="saas-footer frosted-glass">
        <p>&copy; 2026 Municipality of Mataasnakahoy. All Rights Reserved.</p>
        <p className="footer-links">
          <span>BPLO Portal</span> • <span>System Settings</span>
        </p>
      </footer>
    </DashboardLayout>
  );
}