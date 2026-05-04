/**
 * MapPage.jsx
 * Map & Flags — large map canvas + heatmap toggle + flagged locations side panel.
 * All layout handled by DashboardLayout. All shared styling via global.css.
 */

import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import StatusBadge from "../components/StatusBadge";

// ── Icons ─────────────────────────────────────────────────────────────────
const Icon = {
  Layers: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  Flag: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  ),
  MapPin: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="10" r="3"/>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Crosshair: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="22" y1="12" x2="18" y2="12"/>
      <line x1="6" y1="12" x2="2" y2="12"/>
      <line x1="12" y1="6" x2="12" y2="2"/>
      <line x1="12" y1="22" x2="12" y2="18"/>
    </svg>
  ),
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Send: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  ZoomIn: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="11" y1="8" x2="11" y2="14"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  ),
  ZoomOut: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  ),
};

// ── Mock flagged locations ────────────────────────────────────────────────
const FLAGGED = [
  {
    id: "F-001",
    name: "Unknown Eatery",
    type: "Carinderia",
    barangay: "Poblacion I",
    coords: "13.9174° N, 121.0794° E",
    status: "unregistered",
    risk: "high",
    detectedVia: "Google Maps Cross-ref",
    priorityScore: 91,
  },
  {
    id: "F-002",
    name: "Unregistered Piggery",
    type: "Livestock",
    barangay: "Bts. Aplaya",
    coords: "13.9201° N, 121.0812° E",
    status: "unregistered",
    risk: "high",
    detectedVia: "Google Maps Cross-ref",
    priorityScore: 88,
  },
  {
    id: "F-003",
    name: "Suspect Welding Shop",
    type: "Welding",
    barangay: "Poblacion II",
    coords: "13.9155° N, 121.0771° E",
    status: "unregistered",
    risk: "high",
    detectedVia: "Satellite Imagery",
    priorityScore: 85,
  },
  {
    id: "F-004",
    name: "Nangkaan Carinderia",
    type: "Carinderia",
    barangay: "Nangkaan",
    coords: "13.9098° N, 121.0743° E",
    status: "expired",
    risk: "medium",
    detectedVia: "Permit Expiry Scan",
    priorityScore: 62,
  },
  {
    id: "F-005",
    name: "Bautista Billiard Hall",
    type: "Recreation",
    barangay: "Kinalaglagan",
    coords: "13.9133° N, 121.0759° E",
    status: "expired",
    risk: "medium",
    detectedVia: "Permit Expiry Scan",
    priorityScore: 58,
  },
  {
    id: "F-006",
    name: "Unknown Welding Shop",
    type: "Welding",
    barangay: "Luta Sur",
    coords: "13.9047° N, 121.0718° E",
    status: "unregistered",
    risk: "high",
    detectedVia: "Google Maps Cross-ref",
    priorityScore: 79,
  },
  {
    id: "F-007",
    name: "Aling Nena's Tindahan",
    type: "Sari-Sari Store",
    barangay: "Nangkaan",
    coords: "13.9091° N, 121.0737° E",
    status: "expired",
    risk: "low",
    detectedVia: "Permit Expiry Scan",
    priorityScore: 34,
  },
];

const LAYER_OPTIONS = [
  { id: "base",     label: "Base Map" },
  { id: "heatmap",  label: "Risk Heatmap (DBSCAN)" },
  { id: "flags",    label: "Flag Markers" },
  { id: "barangay", label: "Barangay Boundaries" },
];

const RISK_COLOR = {
  high:   { bg: "var(--color-danger-light)",  text: "var(--color-danger)",       dot: "#ef4444" },
  medium: { bg: "var(--color-gold-light)",    text: "var(--color-gold-dark)",    dot: "#f59e0b" },
  low:    { bg: "var(--color-primary-light)", text: "var(--color-primary-dark)", dot: "#56ab2f" },
};

// ── Map Canvas Placeholder ────────────────────────────────────────────────
function MapCanvas({ layers, heatmapOn, onZoomIn, onZoomOut, onCenterMap }) {
  return (
    <div style={styles.mapCanvas}>

      {/* Simulated topo grid */}
      <svg style={styles.topoOverlay} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(86,171,47,0.08)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
      </svg>

      {/* Heatmap blob simulation */}
      {layers.heatmap && (
        <div style={styles.heatmapLayer}>
          <div style={{ ...styles.heatBlob, top: "30%", left: "35%", width: 180, height: 180, background: "radial-gradient(circle, rgba(239,68,68,0.35) 0%, transparent 70%)" }}/>
          <div style={{ ...styles.heatBlob, top: "55%", left: "60%", width: 140, height: 140, background: "radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)" }}/>
          <div style={{ ...styles.heatBlob, top: "20%", left: "65%", width: 100, height: 100, background: "radial-gradient(circle, rgba(239,68,68,0.25) 0%, transparent 70%)" }}/>
          <div style={{ ...styles.heatBlob, top: "70%", left: "25%", width: 110, height: 110, background: "radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)" }}/>
        </div>
      )}

      {/* Simulated flag pins */}
      {layers.flags && FLAGGED.map((f, i) => {
        const positions = [
          { top: "33%", left: "38%" }, { top: "58%", left: "63%" },
          { top: "48%", left: "28%" }, { top: "22%", left: "52%" },
          { top: "67%", left: "45%" }, { top: "40%", left: "70%" },
          { top: "75%", left: "32%" },
        ];
        const pos = positions[i] || { top: "50%", left: "50%" };
        const color = RISK_COLOR[f.risk].dot;
        return (
          <div key={f.id} style={{ ...styles.mapPin, ...pos }}>
            <div style={{ ...styles.pinDot, background: color, boxShadow: `0 0 12px ${color}` }} />
            <div style={styles.pinPulse(color)} />
          </div>
        );
      })}

      {/* Center label */}
      <div style={styles.mapWatermark}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(86,171,47,0.3)" strokeWidth="1.5">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
          <line x1="15" y1="3" x2="15" y2="21"/>
        </svg>
        <span style={styles.mapWatermarkText}>Mataasnakahoy, Batangas</span>
        <span style={styles.mapWatermarkSub}>Google Map tiles will render here</span>
      </div>

      {/* Zoom controls */}
      <div style={styles.zoomControls}>
        <button type="button" style={styles.mapBtn} onClick={onZoomIn}><Icon.ZoomIn /></button>
        <button type="button" style={styles.mapBtn} onClick={onZoomOut}><Icon.ZoomOut /></button>
        <button type="button" style={styles.mapBtn} onClick={onCenterMap}><Icon.Crosshair /></button>
      </div>

      {/* Live legend */}
      {layers.heatmap && (
        <div style={styles.heatLegend}>
          <span style={styles.legendTitle}>Risk Level</span>
          {[["High", "#ef4444"], ["Medium", "#f59e0b"], ["Low", "#56ab2f"]].map(([label, color]) => (
            <div key={label} style={styles.legendRow}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Flag Item in Side Panel ───────────────────────────────────────────────
function FlagCard({ flag, selected, onClick }) {
  const risk = RISK_COLOR[flag.risk];
  return (
    <div
      onClick={onClick}
      style={{
        ...styles.flagCard,
        borderColor: selected ? "var(--color-primary)" : "var(--color-border)",
        background: selected ? "rgba(86,171,47,0.04)" : "rgba(255,255,255,0.6)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <p style={styles.flagName}>{flag.name}</p>
          <p style={styles.flagMeta}>{flag.type} · {flag.barangay}</p>
        </div>
        <span style={{ ...styles.riskPill, background: risk.bg, color: risk.text }}>
          {flag.risk.toUpperCase()}
        </span>
      </div>

      <div style={styles.flagRow}>
        <Icon.MapPin />
        <span style={styles.flagCoords}>{flag.coords}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <StatusBadge variant={flag.status === "unregistered" ? "red" : "gold"}>
          {flag.status === "unregistered" ? "Unregistered" : "Expired"}
        </StatusBadge>
        <div style={styles.scoreRow}>
          <span style={styles.scoreLabel}>Priority</span>
          <span style={{ ...styles.scoreValue, color: flag.priorityScore >= 80 ? "var(--color-danger)" : flag.priorityScore >= 50 ? "var(--color-gold-dark)" : "var(--color-primary)" }}>
            {flag.priorityScore}
          </span>
        </div>
      </div>

      {selected && (
        <div style={styles.flagActions}>
          <button className="primary-btn" type="button" style={{ fontSize: 12, padding: "7px 14px" }} onClick={() => window.alert("Inspector dispatch workflow started.")}>
            <Icon.Send /> Dispatch Inspector
          </button>
          <button className="ghost-btn" type="button" style={{ fontSize: 12, padding: "7px 12px" }} onClick={() => window.alert("Opening selected establishment profile.")}>
            View Profile
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function MapPage() {
  const [layers, setLayers] = useState({
    base: true, heatmap: false, flags: true, barangay: false,
  });
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [filterRisk,   setFilterRisk]   = useState("all");
  const [search,       setSearch]       = useState("");

  const toggleLayer = (id) => setLayers(prev => ({ ...prev, [id]: !prev[id] }));
  const handleZoomIn = () => window.alert("Zooming in on the map.");
  const handleZoomOut = () => window.alert("Zooming out of the map.");
  const handleCenterMap = () => window.alert("Centering map on selected flag location.");

  const visibleFlags = FLAGGED.filter(f => {
    const matchRisk   = filterRisk === "all" || f.risk === filterRisk;
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
                        f.barangay.toLowerCase().includes(search.toLowerCase());
    return matchRisk && matchSearch;
  });

  return (
    <DashboardLayout user={{ initials: "JD", name: "J. Dela Cruz" }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Map & Flags</h1>
          <p className="page-subtitle">
            Geospatial view of flagged and unregistered establishments in Mataasnakahoy.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={styles.livePill}>
            <span style={styles.liveDot} />
            {FLAGGED.filter(f => f.status === "unregistered").length} Active Flags
          </span>
        </div>
      </div>

      {/* Main Map Layout: map + side panel */}
      <div style={styles.mapLayout}>

        {/* ── Left: Map + Layer Controls ── */}
        <div style={styles.mapColumn}>

          {/* Layer toggle bar */}
          <div className="frosted-glass saas-card" style={styles.layerBar}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon.Layers />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>Layers</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {LAYER_OPTIONS.map(l => (
                <button
                  key={l.id}
                  onClick={() => toggleLayer(l.id)}
                  style={{
                    ...styles.layerToggle,
                    background: layers[l.id] ? "var(--color-primary)" : "rgba(248,249,250,0.9)",
                    color: layers[l.id] ? "#fff" : "var(--color-muted)",
                    borderColor: layers[l.id] ? "var(--color-primary)" : "var(--color-border)",
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Map canvas */}
          <div className="frosted-glass" style={styles.mapWrapper}>
<MapCanvas
            layers={layers}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onCenterMap={handleCenterMap}
          />
          </div>

          {/* Stats strip below map */}
          <div style={styles.statsStrip}>
            {[
              { label: "Total Flags",    value: FLAGGED.length,                                       color: "var(--color-ink)" },
              { label: "Unregistered",   value: FLAGGED.filter(f => f.status === "unregistered").length, color: "var(--color-danger)" },
              { label: "Expired Permit", value: FLAGGED.filter(f => f.status === "expired").length,      color: "var(--color-gold-dark)" },
              { label: "High Risk",      value: FLAGGED.filter(f => f.risk === "high").length,           color: "var(--color-danger)" },
            ].map(s => (
              <div key={s.label} className="frosted-glass saas-card" style={styles.statCard}>
                <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</span>
                <span style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 500 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Flagged Locations Panel ── */}
        <div className="frosted-glass saas-card" style={styles.sidePanel}>
          {/* Panel header */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Icon.Flag />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-ink)" }}>
                Flagged Locations
              </h3>
              <span className="badge badge--red" style={{ marginLeft: "auto" }}>
                {FLAGGED.length}
              </span>
            </div>

            {/* Search */}
            <div className="search-bar" style={{ width: "100%", marginBottom: 10 }}>
              <Icon.Search />
              <input
                type="text"
                placeholder="Search name or barangay..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Risk filter pills */}
            <div style={{ display: "flex", gap: 6 }}>
              {["all", "high", "medium", "low"].map(r => (
                <button
                  key={r}
                  onClick={() => setFilterRisk(r)}
                  style={{
                    ...styles.riskFilter,
                    background: filterRisk === r ? "var(--color-ink)" : "rgba(248,249,250,0.9)",
                    color: filterRisk === r ? "#fff" : "var(--color-muted)",
                    borderColor: filterRisk === r ? "var(--color-ink)" : "var(--color-border)",
                  }}
                >
                  {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable flag list */}
          <div style={styles.flagList}>
            {visibleFlags.length === 0 ? (
              <div style={styles.emptyPanel}>
                <Icon.AlertTriangle />
                <p>No flags match this filter.</p>
              </div>
            ) : visibleFlags.map(f => (
              <FlagCard
                key={f.id}
                flag={f}
                selected={selectedFlag === f.id}
                onClick={() => setSelectedFlag(prev => prev === f.id ? null : f.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="saas-footer frosted-glass">
        <p>&copy; 2026 Municipality of Mataasnakahoy. All Rights Reserved.</p>
        <p className="footer-links"><span>BPLO Portal</span> • <span>System Settings</span></p>
      </footer>

    </DashboardLayout>
  );
}

// ── Scoped styles ─────────────────────────────────────────────────────────
const styles = {
  livePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "var(--color-danger-light)",
    color: "var(--color-danger)",
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "var(--color-danger)",
    animation: "pulse 1.5s infinite",
  },

  // Map layout
  mapLayout: {
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: 20,
    alignItems: "start",
  },
  mapColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  // Layer bar
  layerBar: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "12px 18px",
    borderRadius: "var(--radius-lg)",
    flexWrap: "wrap",
  },
  layerToggle: {
    padding: "6px 12px",
    borderRadius: 20,
    border: "1px solid",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-base)",
    transition: "all 0.2s",
  },

  // Map wrapper
  mapWrapper: {
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
    position: "relative",
    height: 480,
  },
  mapCanvas: {
    width: "100%",
    height: "100%",
    background: "linear-gradient(135deg, #e8f5e2 0%, #d4edda 30%, #c8e6c9 60%, #dcedc8 100%)",
    position: "relative",
    overflow: "hidden",
  },
  topoOverlay: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  },
  heatmapLayer: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  },
  heatBlob: {
    position: "absolute",
    borderRadius: "50%",
    pointerEvents: "none",
    transform: "translate(-50%, -50%)",
  },
  mapPin: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    zIndex: 5,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    border: "2px solid #fff",
    position: "relative",
    zIndex: 2,
  },
  pinPulse: (color) => ({
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: color,
    opacity: 0.2,
    zIndex: 1,
  }),
  mapWatermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    pointerEvents: "none",
    zIndex: 0,
  },
  mapWatermarkText: {
    fontSize: 14,
    fontWeight: 700,
    color: "rgba(86,171,47,0.5)",
    letterSpacing: "0.5px",
  },
  mapWatermarkSub: {
    fontSize: 11,
    color: "rgba(100,116,139,0.6)",
  },
  zoomControls: {
    position: "absolute",
    top: 16,
    right: 16,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    zIndex: 10,
  },
  mapBtn: {
    width: 36,
    height: 36,
    background: "rgba(255,255,255,0.9)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "var(--color-muted)",
    backdropFilter: "blur(8px)",
  },
  heatLegend: {
    position: "absolute",
    bottom: 16,
    left: 16,
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(8px)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "10px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    zIndex: 10,
  },
  legendTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: "var(--color-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 2,
  },
  legendRow: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 12,
    color: "var(--color-ink)",
    fontWeight: 500,
  },

  // Stats strip
  statsStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
  },
  statCard: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "14px 18px",
    borderRadius: "var(--radius-lg)",
  },

  // Side panel
  sidePanel: {
    borderRadius: "var(--radius-lg)",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    maxHeight: 680,
    position: "sticky",
    top: 20,
  },
  flagList: {
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    flex: 1,
    paddingRight: 2,
  },

  // Flag card
  flagCard: {
    border: "1px solid",
    borderRadius: "var(--radius-md)",
    padding: 14,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  flagName: {
    fontSize: 13,
    fontWeight: 700,
    color: "var(--color-ink)",
    marginBottom: 2,
  },
  flagMeta: {
    fontSize: 11,
    color: "var(--color-muted)",
  },
  flagRow: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    color: "var(--color-muted)",
    fontSize: 11,
  },
  flagCoords: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "var(--color-muted)",
  },
  riskPill: {
    fontSize: 9,
    fontWeight: 800,
    padding: "3px 8px",
    borderRadius: 10,
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
  },
  scoreRow: {
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  scoreLabel: {
    fontSize: 10,
    color: "var(--color-muted)",
    fontWeight: 600,
    textTransform: "uppercase",
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 800,
  },
  flagActions: {
    display: "flex",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid var(--color-border-soft)",
  },
  emptyPanel: {
    textAlign: "center",
    padding: "40px 0",
    color: "var(--color-muted)",
    fontSize: 13,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  riskFilter: {
    padding: "4px 10px",
    borderRadius: 20,
    border: "1px solid",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "var(--font-base)",
    transition: "all 0.15s",
  },
};
