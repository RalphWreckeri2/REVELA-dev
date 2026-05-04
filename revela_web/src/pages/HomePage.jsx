/**
 * HomePage.jsx  —  Overview Dashboard
 *
 * What lives here: page-specific data, layout, and content ONLY.
 * What does NOT live here: Sidebar, TopNavbar, global CSS, KPI card markup.
 *
 * Tree:
 *   App
 *   └─ DashboardLayout          ← shared shell (sidebar + navbar)
 *      └─ HomePage              ← this file
 *         ├─ OnboardingPanel    ← local, one-off component (too specific to reuse)
 *         ├─ KpiCard ×3        ← shared micro-component
 *         ├─ MapWidget          ← local widget
 *         └─ RecentFlagsWidget  ← local widget
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import KpiCard from "../components/KpiCard";
import "../styles/HomePage.css"; // page-specific overrides only — see comments inside

// ── Page-scoped data (swap with API calls later) ──────────
const KPI_DATA = [
  {
    value: "1,204",
    label: "Total Registered Entities",
    iconVariant: "gold",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" /><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
      </svg>
    ),
  },
  {
    value: 12,
    label: "Unregistered Flags Detected",
    iconVariant: "red",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
  },
  {
    value: "98.1%",
    label: "Overall Compliance Rate",
    iconVariant: "green",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

const RECENT_FLAGS = [
  { id: 1, name: "Unknown Entity (Sari-Sari)", location: "Brgy. Poblacion I",   status: "red",    action: "Inspect" },
  { id: 2, name: "Unregistered Carinderia",    location: "Brgy. Kinalaglagan",  status: "red",    action: "Inspect" },
  { id: 3, name: "Expired Permit: XYZ Store",  location: "Brgy. Nangkaan",      status: "orange", action: "Verify"  },
];

const ONBOARDING_STEPS = [
  { num: 1, title: "Upload Registry",  desc: "Upload the BPLO CSV to geocode and set the baseline." },
  { num: 2, title: "Review Flags",     desc: "View detected establishments plotted by compliance status." },
  { num: 3, title: "Dispatch",         desc: "Assign inspectors to high-risk targets via priority scores." },
];

// ── Local sub-components (page-specific, not reused elsewhere) ──

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
              <div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MapWidget({ onOpenMap }) {
  return (
    <div className="dashboard-widget frosted-glass saas-card map-widget">
      <div className="widget-header">
        <h3>Live Map Preview</h3>
        <button className="ghost-btn" type="button" onClick={onOpenMap}>Open Full Map ↗</button>
      </div>
      <div className="map-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
        <p>Geospatial Map tiles will render here</p>
      </div>
    </div>
  );
}

function RecentFlagsWidget({ flags, onViewAll, onAction }) {
  return (
    <div className="dashboard-widget frosted-glass saas-card">
      <div className="widget-header">
        <h3>Recent Detections</h3>
        <button className="ghost-btn" type="button" onClick={onViewAll}>View All</button>
      </div>

      <div className="flag-list">
        {flags.map(({ id, name, location, status, action }) => (
          <div className="flag-item" key={id}>
            <div className={`dot-indicator dot-indicator--${status}`} />
            <div className="flag-details">
              <h4>{name}</h4>
              <p>{location}</p>
            </div>
            <button className="action-btn" type="button" onClick={() => onAction(action)}>{action}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────

export default function HomePage() {
  const [showWelcome, setShowWelcome] = useState(true);
  const navigate = useNavigate();

  const handleExportReport = () => navigate("/reports");
  const handleOpenMap = () => navigate("/map");
  const handleViewAll = () => navigate("/inspections");
  const handleAction = (label) => window.alert(`${label} action selected.`);

  return (
    <DashboardLayout user={{ initials: "JD", name: "J. Dela Cruz" }}>

      {showWelcome && (
        <OnboardingPanel onDismiss={() => setShowWelcome(false)} />
      )}

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview Dashboard</h1>
          <p className="page-subtitle">Real-time compliance metrics for Mataasnakahoy.</p>
        </div>
        <button className="ghost-btn" type="button" onClick={handleExportReport}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Report
        </button>
      </div>

      {/* KPI row */}
      <div className="kpi-grid">
        {KPI_DATA.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Widget row */}
      <div className="widget-grid">
        <MapWidget onOpenMap={handleOpenMap} />
        <RecentFlagsWidget flags={RECENT_FLAGS} onViewAll={handleViewAll} onAction={handleAction} />
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
