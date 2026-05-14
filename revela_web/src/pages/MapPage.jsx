/**
 * MapPage.jsx
 * Map & Flags — Google Maps with color-coded pin markers, click-to-open detail
 * modal, working zoom controls, fixed "See Full List" modal.
 */

import { useState, useEffect, useCallback, useRef, useContext, useMemo } from "react";
import { MarkerClusterer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";
import { useLoadScript, GoogleMap, Data } from "@react-google-maps/api";
import DashboardLayout from "../components/DashboardLayout";
import StatusBadge from "../components/StatusBadge";
import { AuthContext } from "../context/AuthContext";
import {
  getFlagsRequest,
  escalateFlagToBlackRequest,
  runDetectionRequest,
  createYellowFlagRequest,   
  getBarangaysRequest,
  assignInspectionRequest,
  getAnalyticsOverviewRequest,
  getDiagnosticClustersRequest,
} from "../services/api";

// ── Icons ─────────────────────────────────────────────────────────────────────
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
  Send: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ExternalLink: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  Radar: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="2"/>
      <path d="M12 2a10 10 0 0 1 10 10"/>
      <path d="M12 6a6 6 0 0 1 6 6"/>
    </svg>
  ),
};

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_MAP_CENTER = { lat: 13.9667, lng: 121.1167 };
const MAP_LIBRARIES      = ["places", "marker"];

// `public/data/mataasnakahoy.json` is a single outer boundary for the whole
// municipality. Feature names must be listed here so the heatmap sums all
// per-barangay Red Flag counts instead of matching barangay names to "Mataasnakahoy".
const MUNICIPAL_BOUNDARY_NAMES = new Set(["mataasnakahoy", "mataas na kahoy"]);
// const MAP_OPTIONS        = {
//  disableDefaultUI: true,
//  clickableIcons:   false,
//  zoomControl:      false,
//  mapTypeId:        isSatellite ? "satellite" : "roadmap",
//  mapId:            isSatellite ? undefined : "34390388b3abb63aa84876a7",
//};

const LAYER_OPTIONS = [
  { id: "base",        label: "Base Map"             },
  { id: "heatmap",     label: "Risk Heatmap"         },
  { id: "flags",       label: "Flag Markers"         },
  { id: "barangay",    label: "Barangay Boundaries"  },
  { id: "diagnostics", label: "🔴 Hotspot Clusters"  },
];

// Flag color → UI color mapping
const FLAG_COLORS = {
  Red:    { marker: "#ef4444", bg: "#fee2e2", text: "#b91c1c", label: "Unregistered" },
  Yellow: { marker: "#f59e0b", bg: "#fef3c7", text: "#92400e", label: "Suspected"    },
  Black:  { marker: "#1e293b", bg: "#f1f5f9", text: "#1e293b", label: "Non-Responsive" },
  Green:  { marker: "#22c55e", bg: "#dcfce7", text: "#15803d", label: "Compliant"    },
};

const defaultColor = { marker: "#94a3b8", bg: "#f1f5f9", text: "#64748b", label: "Unknown" };

/** Discrete barangay risk fills (HRI-style). Keys align with analytics `risk_level` + edge cases. */
const HEATMAP_RISK_STYLE = {
  High: {
    fillColor: "#D32F2F",
    fillOpacity: 0.72,
    strokeColor: "#212121",
    strokeWeight: 1,
    zIndex: 4,
  },
  Medium: {
    fillColor: "#FFB74D",
    fillOpacity: 0.72,
    strokeColor: "#212121",
    strokeWeight: 1,
    zIndex: 3,
  },
  Low: {
    fillColor: "#A5D6A7",
    fillOpacity: 0.72,
    strokeColor: "#212121",
    strokeWeight: 1,
    zIndex: 2,
  },
  /** Red flags present but barangay not in prescriptive rankings yet */
  unranked: {
    fillColor: "#FFF9C4",
    fillOpacity: 0.72,
    strokeColor: "#616161",
    strokeWeight: 1,
    zIndex: 2,
  },
  /** No red flags (or no data) — “very low” style */
  none: {
    fillColor: "#BBDEFB",
    fillOpacity: 0.72,
    strokeColor: "#546E7A",
    strokeWeight: 1,
    zIndex: 1,
  },
};

function heatmapTierKey(riskLevel, redFlagCount) {
  if (riskLevel === "High") return "High";
  if (riskLevel === "Medium") return "Medium";
  if (riskLevel === "Low") return "Low";
  if (redFlagCount > 0) return "unranked";
  return "none";
}

function getFlagColor(flagColor) {
  return FLAG_COLORS[flagColor] ?? defaultColor;
}

/** Higher = more severe — used so mixed clusters show the worst color, not green. */
const FLAG_SEVERITY_RANK = { Green: 1, Yellow: 2, Red: 3, Black: 4 };

function flagSeverityRank(flagColor) {
  return FLAG_SEVERITY_RANK[flagColor] ?? 0;
}

/** Dominant flag color among clustered markers (see `_revelaFlagColor` on each marker). */
function getDominantFlagColorFromMarkers(markers) {
  let dominant = "Green";
  let best = 0;
  for (const m of markers) {
    const raw = m?._revelaFlagColor;
    if (raw == null || raw === "") continue;
    const c = canonicalFlagColor(raw);
    const r = flagSeverityRank(c);
    if (r > best) {
      best = r;
      dominant = c;
    }
  }
  return dominant;
}

/** Map API `flagColor` to a canonical key in FLAG_COLORS (handles casing / unknown). */
function canonicalFlagColor(raw) {
  if (raw == null || raw === "") return "Red";
  const s = String(raw).trim();
  const cap = s.length ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "Red";
  return FLAG_COLORS[cap] ? cap : "Red";
}

// ── Normalise flag from API → UI shape ────────────────────────────────────────
function normalizeFlag(flag) {
  const color  = canonicalFlagColor(flag.flagColor);
  const coords =
    flag.latitude != null && flag.longitude != null
      ? `${Number(flag.latitude).toFixed(6)}°N, ${Number(flag.longitude).toFixed(6)}°E`
      : "No coordinates";

  return {
    ...flag,
    id:       flag.logID ?? flag.id,
    name:     flag.detectedName ?? "Unknown Establishment",
    barangay: flag.barangayName ?? "Unknown Barangay",
    address:  flag.resolvedAddress ?? flag.nearestLandmark ?? "",  
    source:   flag.flagSource ?? "registry_only", 
    size:     flag.businessSize ?? "—",                 
    coords,
    color,
  };
}

// ── Flag Detail Modal ─────────────────────────────────────────────────────────
function FlagDetailModal({ flag, onClose, onEscalate, onDispatch, isAdmin, actionLoading }) {
  const fc = getFlagColor(flag.color);

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.detailModal} onClick={e => e.stopPropagation()}>

        {/* Header strip */}
        <div style={{ ...styles.detailHeader, background: fc.bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Color dot */}
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: fc.marker, flexShrink: 0, display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: fc.text, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {fc.label}
            </span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><Icon.X /></button>
        </div>

        {/* Body */}
        <div style={styles.detailBody}>
          <h2 style={styles.detailName}>{flag.name}</h2>

          <div style={styles.detailGrid}>
            {[
              ["Log ID",      `#${flag.id}`],
              ["Barangay",    flag.barangay  || "—"],
              ["Address",     flag.address   || "—"],
              ["Business Size", flag.size      || "—"],
              ["Source",      flag.source === "registry_and_maps"
                              ? "✅ In Registry & Google Maps"
                              : flag.source === "maps_only"
                              ? "🗺️ Google Maps Only"
                              : "📋 In Registry"],
              // -------------------------------
              ["Coordinates", flag.coords],
              ["Detected",    flag.detectedDate ? flag.detectedDate.slice(0, 10) : "—"],
              ["Flag Status", flag.color],
            ].map(([label, value]) => (
              <div key={label} style={styles.detailRow}>
                <span style={styles.detailLabel}>{label}</span>
                <span style={styles.detailValue}>
                  {label === "Flag Status"
                    ? <span style={{ ...styles.flagPill, background: fc.bg, color: fc.text }}>{fc.label}</span>
                    : value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div style={styles.detailFooter}>
          <button className="ghost-btn" onClick={onClose}>Close</button>
          {isAdmin && (flag.color === "Red" || flag.color === "Yellow") && (
            <>
              <button
                className="primary-btn"
                style={{ background: "#3b82f6", borderColor: "#3b82f6", display: "flex", alignItems: "center", gap: 6 }}
                disabled={actionLoading}
                onClick={() => onDispatch(flag)}
              >
                <Icon.Send /> Dispatch
              </button>
              <button
                className="primary-btn"
                style={{ background: "#1e293b", borderColor: "#1e293b" }}
                disabled={actionLoading}
                onClick={() => onEscalate(flag.id)}
              >
                {actionLoading ? "Escalating…" : "Escalate to Black"}
              </button>
            </>
          )}
          {flag.latitude && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${flag.latitude},${flag.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="ghost-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}
            >
              <Icon.ExternalLink /> View on Google Maps
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Full Flag List Modal ───────────────────────────────────────────────────────
function FullFlagListModal({ flags, onClose, onSelectFlag }) {
  const [search, setSearch] = useState("");
  const [filterColor, setFilterColor] = useState("all");
  const [sortConfig, setSortConfig] = useState("date_desc");

  const displayed = flags.filter(f => {
    const matchColor = filterColor === "all" || f.color === filterColor;
    const matchSearch = (f.name || "").toLowerCase().includes(search.toLowerCase()) ||
                        (f.barangay || "").toLowerCase().includes(search.toLowerCase()) ||
                        (f.address || "").toLowerCase().includes(search.toLowerCase());
    return matchColor && matchSearch;
  });

  displayed.sort((a, b) => {
    if (sortConfig === "date_desc") {
      return (new Date(b.detectedDate || 0).getTime()) - (new Date(a.detectedDate || 0).getTime());
    } else if (sortConfig === "date_asc") {
      return (new Date(a.detectedDate || 0).getTime()) - (new Date(b.detectedDate || 0).getTime());
    } else if (sortConfig === "name_asc") {
      return (a.name || "").localeCompare(b.name || "");
    } else if (sortConfig === "name_desc") {
      return (b.name || "").localeCompare(a.name || "");
    } else if (sortConfig === "id_desc") {
      return Number(b.id) - Number(a.id);
    } else if (sortConfig === "id_asc") {
      return Number(a.id) - Number(b.id);
    }
    return 0;
  });

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.fullListModal} onClick={e => e.stopPropagation()}>

        <div style={{ ...styles.fullListHeader, flexDirection: "column", gap: 16, alignItems: "stretch" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={styles.modalTitle}>All Flagged Locations</h3>
              <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>
                {displayed.length} result{displayed.length !== 1 ? 's' : ''} · click a row to view on map
              </p>
            </div>
            <button style={styles.closeBtn} onClick={onClose}><Icon.X /></button>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="search-bar" style={{ flex: 1, minWidth: 200, padding: "0 12px", height: 40 }}>
              <Icon.Search />
              <input
                type="text"
                placeholder="Search name, barangay, or address…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select style={styles.modalSelect} value={filterColor} onChange={e => setFilterColor(e.target.value)}>
              <option value="all">All Colors</option>
              <option value="Red">Red Flags</option>
              <option value="Yellow">Yellow Flags</option>
              <option value="Black">Black Flags</option>
              <option value="Green">Green Flags</option>
            </select>
            <select style={styles.modalSelect} value={sortConfig} onChange={e => setSortConfig(e.target.value)}>
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="id_desc">ID (High to Low)</option>
              <option value="id_asc">ID (Low to High)</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(80vh - 140px)" }}>
          <table style={styles.fullListTable}>
            <thead>
              <tr>
                {["ID", "Name", "Barangay", "Address", "Detected", "Flag", ""].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px", color: "var(--color-muted)", fontSize: 13 }}>
                    No flags match your criteria.
                  </td>
                </tr>
              ) : displayed.map((f, i) => {
                const fc = getFlagColor(f.color);
                return (
                  <tr
                    key={f.id}
                    style={{ background: i % 2 === 0 ? "rgba(248,249,250,0.6)" : "transparent", cursor: "pointer" }}
                    onClick={() => { onSelectFlag(f.id); onClose(); }}
                  >
                    <td style={styles.td}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--color-muted)" }}>#{f.id}</span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.name}
                    </td>
                    <td style={styles.td}>{f.barangay || "—"}</td>
                    <td style={{ ...styles.td, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.address || "—"}
                    </td>
                    <td style={{ ...styles.td, fontSize: 11 }}>
                      {f.detectedDate ? f.detectedDate.slice(0, 10) : "—"}
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.flagPill, background: fc.bg, color: fc.text }}>{fc.label}</span>
                    </td>
                    <td style={styles.td}>
                      <button
                        className="ghost-btn"
                        style={{ fontSize: 11, padding: "4px 10px" }}
                        onClick={e => { e.stopPropagation(); onSelectFlag(f.id); onClose(); }}
                      >
                        View on Map
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Map Canvas ────────────────────────────────────────────────────────────────
function MapCanvas({ isLoaded, loadError, center, zoom, mapRef, layers, flags, barangayRiskLevels, selectedFlagId, onMarkerClick, onMapClick, isPickingLocation, runDetectionLoading, satellite, clusters, barangayRedFlagCounts }) {
  const markerRefs      = useRef(new Map());
  const internalMapRef  = useRef(null);
  const clusterRef      = useRef(null); 
  const diagnosticCircleRefs = useRef([]);
  const geoJsonDataRef  = useRef(null);

  // ── Draw / clear DBSCAN cluster circles ─────────────────────────────────
  useEffect(() => {
    // Clean up previous circles regardless of whether we're drawing new ones
    diagnosticCircleRefs.current.forEach(c => c.setMap(null));
    diagnosticCircleRefs.current = [];

    if (!isLoaded || !internalMapRef.current) return;
    if (!layers.diagnostics)                  return;
    if (!clusters || clusters.length === 0)   return;

    clusters.forEach((cl) => {
      // Visual intensity encoding — recalibrate thresholds to match eps/MinPts tuning:
      //   size ≥ 10 → deep red    (major hotspot)
      //   size 4–9  → amber       (moderate cluster)
      //   size 3    → soft orange (minimum qualifying cluster — MinPts = 3)
      // Note: noise points (isolated flags) are filtered server-side and never
      // reach this loop, per the system design's anomaly-discard rule.
      let fillColor, strokeColor, fillOpacity, strokeOpacity, strokeWeight, zIndex;

      if (cl.size >= 10) {
        fillColor    = "#ef4444";
        strokeColor  = "#b91c1c";
        fillOpacity  = 0.28;
        strokeOpacity= 0.9;
        strokeWeight = 2;
        zIndex       = 4;
      } else if (cl.size >= 4) {
        fillColor    = "#f59e0b";
        strokeColor  = "#b45309";
        fillOpacity  = 0.22;
        strokeOpacity= 0.85;
        strokeWeight = 2;
        zIndex       = 3;
      } else {
        // size === 3 — minimum cluster (MinPts threshold)
        fillColor    = "#fb923c";
        strokeColor  = "#c2410c";
        fillOpacity  = 0.16;
        strokeOpacity= 0.7;
        strokeWeight = 1.5;
        zIndex       = 2;
      }

      const circle = new window.google.maps.Circle({
        map:           internalMapRef.current,
        center:        { lat: cl.centroidLat, lng: cl.centroidLng },
        // Minimum 30 m so tiny clusters are still visible at town zoom
        radius:        Math.max(cl.radius_m, 30),
        fillColor,
        fillOpacity,
        strokeColor,
        strokeOpacity,
        strokeWeight,
        zIndex,
        clickable:     true,
      });

      // Info window on click showing cluster stats
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="font-family:sans-serif;font-size:13px;line-height:1.6;padding:4px 6px;">
            <strong style="color:#b91c1c;">
              Hotspot Cluster #${cl.clusterID}
            </strong><br/>
            <span style="color:#475569;">
              ${cl.size} Red Flag${cl.size !== 1 ? "s" : ""} within ${cl.radius_m} m
            </span><br/>
            <span style="color:#94a3b8;font-size:11px;">
              eps = 20 m · MinPts = 3 &nbsp;·&nbsp;
              IDs: ${cl.logIDs.slice(0, 6).map(id => `#${id}`).join(", ")}${cl.logIDs.length > 6 ? "…" : ""}
            </span>
          </div>
        `,
      });

      circle.addListener("click", (e) => {
        infoWindow.setPosition(e.latLng);
        infoWindow.open(internalMapRef.current);
      });

      diagnosticCircleRefs.current.push(circle);
    });

    return () => {
      diagnosticCircleRefs.current.forEach(c => c.setMap(null));
      diagnosticCircleRefs.current = [];
    };
  }, [isLoaded, layers.diagnostics, clusters]);

  const handleMapLoad = useCallback((map) => {
    internalMapRef.current = map;
    if (mapRef) mapRef.current = map;
    
    if (isPickingLocation) {
      map.setOptions({ draggableCursor: 'crosshair' });
    }
  }, [mapRef]);

  const handleMapUnmount = useCallback(() => {
    markerRefs.current.forEach(m => m.setMap(null));
    markerRefs.current.clear();
    internalMapRef.current = null;
  }, []);

  // google.maps.Data does not re-apply the react-google-maps <Data> `options`
  // prop after mount — we keep a ref and call data.setStyle() imperatively.
  const geoJsonFeatureStyle = useMemo(
    () => (feature) => {
      if (!layers.heatmap && !layers.barangay) return { visible: false };

      if (layers.heatmap) {
        // ── Name resolution (unchanged from original) ────────────────────
        const rawName = (
          feature.getProperty('ADM4_EN') ||
          feature.getProperty('NAME_4')  ||
          feature.getProperty('name')    ||
          feature.getProperty('brgy_name') || ""
        ).toLowerCase();
        const bName = rawName
          .replace("barangay ", "").replace("brgy. ", "")
          .replace("san sebastian", "san seb.").trim();

        const compact = rawName.replace(/\s+/g, "");
        const isMunicipalBoundary =
          MUNICIPAL_BOUNDARY_NAMES.has(bName) ||
          [...MUNICIPAL_BOUNDARY_NAMES].some(
            (n) => compact === n.replace(/\s+/g, "") || rawName.includes(n),
          );

        let count;
        let riskLevel;

        if (isMunicipalBoundary) {
          count = Object.values(barangayRedFlagCounts || {}).reduce(
            (sum, n) => sum + Number(n || 0),
            0,
          );
          const levels = Object.values(barangayRiskLevels || {}).map((e) =>
            typeof e === "object" ? e?.risk_level : e,
          );
          riskLevel = levels.includes("High")
            ? "High"
            : levels.includes("Medium")
              ? "Medium"
              : levels.some(Boolean)
                ? "Low"
                : undefined;
        } else {
          // ── Red Flag count for this barangay ───────────────────────────
          count = barangayRedFlagCounts?.[bName] ?? 0;
          if (count === 0) {
            const fuzzyKey = Object.keys(barangayRedFlagCounts || {}).find(
              (k) => rawName.includes(k) || k.includes(rawName),
            );
            if (fuzzyKey) count = barangayRedFlagCounts[fuzzyKey];
          }

          let entry = barangayRiskLevels?.[bName];
          if (!entry) {
            const fuzzyKey = Object.keys(barangayRiskLevels || {}).find(
              (k) => rawName.includes(k) || k.includes(rawName),
            );
            if (fuzzyKey) entry = barangayRiskLevels[fuzzyKey];
          }
          riskLevel = typeof entry === "object" ? entry?.risk_level : entry;
        }

        const tier = heatmapTierKey(riskLevel, count);
        const s = HEATMAP_RISK_STYLE[tier];
        return { ...s, visible: true };
      }

      // Base barangay boundaries style
      return {
        fillColor:   "#1f7a1f",
        fillOpacity: 0.12,
        strokeColor: "#166534",
        strokeWeight: 1,
        visible: true,
      };
    },
    [layers.heatmap, layers.barangay, barangayRiskLevels, barangayRedFlagCounts],
  );

  useEffect(() => {
    const dl = geoJsonDataRef.current;
    if (!dl) return;
    dl.setStyle(geoJsonFeatureStyle);
  }, [geoJsonFeatureStyle]);

  // Build a proper pin-shaped SVG marker element
  const buildMarkerContent = useCallback((flag, selected) => {
    const fc = getFlagColor(flag.color);
    const color = selected ? "#2563eb" : fc.marker;
    const size  = selected ? 36 : 30;

    const el = document.createElement("div");
    el.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      cursor: pointer;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      transition: transform 0.15s;
    `;
    el.innerHTML = `
      <svg viewBox="0 0 24 32" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20C24 5.37 18.63 0 12 0z"
          fill="${color}" />
        <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
      </svg>
    `;
    el.title = flag.name;
    return el;
  }, []);

  // Recreate markers whenever flags or selection changes

  useEffect(() => {
    if (!isLoaded || !internalMapRef.current) return;

    // Clear old markers and cluster
    markerRefs.current.forEach(m => m.map = null);
    markerRefs.current.clear();
    if (clusterRef.current) {
      clusterRef.current.clearMarkers();
      clusterRef.current = null;
    }

    if (!layers.flags) return;

    const visibleFlags = flags.filter(f => f.latitude != null && f.longitude != null);
    const markers = [];

    visibleFlags.forEach(flag => {
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat: Number(flag.latitude), lng: Number(flag.longitude) },
        map:      internalMapRef.current,
        content:  buildMarkerContent(flag, flag.id === selectedFlagId),
      });

      marker.addListener("gmp-click", () => onMarkerClick(flag.id));
      marker._revelaFlagColor = flag.color;
      markerRefs.current.set(flag.id, marker);
      markers.push(marker);
    });

    // Cluster markers that are close together
    clusterRef.current = new MarkerClusterer({
      map: internalMapRef.current,
      markers,
      algorithm: new SuperClusterAlgorithm({
        radius: 80,        // smaller = breaks apart sooner
        maxZoom: 16,       // at zoom 16+, show individual pins
        minPoints: 2,      // only cluster if 2+ pins overlap
      }),
      renderer: {
        render: (cluster /* , stats, map */) => {
          const { count, position, markers: clusterMarkers } = cluster;
          const dominant = getDominantFlagColorFromMarkers(clusterMarkers);
          const fc = getFlagColor(dominant);
          const sev = flagSeverityRank(dominant);
          const countColor = dominant === "Yellow" ? "#422006" : "#ffffff";
          const size = count > 100 ? 56 : count > 50 ? 48 : count > 10 ? 42 : 36;
          const el = document.createElement("div");
          el.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            background: ${fc.marker};
            border: 3px solid ${fc.text};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${countColor};
            font-weight: 800;
            font-size: ${count > 99 ? 11 : 13}px;
            font-family: sans-serif;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            text-shadow: ${dominant === "Yellow" ? "none" : "0 1px 2px rgba(0,0,0,0.35)"};
          `;
          el.textContent = count;
          el.title = `${count} flags (${fc.label})`;

          return new window.google.maps.marker.AdvancedMarkerElement({
            position,
            content: el,
            zIndex: 800 + sev * 50 + Math.min(count, 99),
          });
        },
      },
    });

    return () => {
      markerRefs.current.forEach(m => m.map = null);
      markerRefs.current.clear();
      if (clusterRef.current) {
        clusterRef.current.clearMarkers();
        clusterRef.current = null;
      }
    };
  }, [isLoaded, layers.flags, flags, selectedFlagId, onMarkerClick, buildMarkerContent]);
  
  // Update cursor dynamically if picking state changes
  useEffect(() => {
    if (internalMapRef.current) {
      internalMapRef.current.setOptions({ draggableCursor: isPickingLocation ? 'crosshair' : null });
    }
  }, [isPickingLocation]);

  // Zoom controls that actually work
  const handleZoomIn = () => {
    if (internalMapRef.current) {
      internalMapRef.current.setZoom(internalMapRef.current.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (internalMapRef.current) {
      internalMapRef.current.setZoom(internalMapRef.current.getZoom() - 1);
    }
  };

  const handleCenter = () => {
    if (internalMapRef.current) {
      internalMapRef.current.panTo(DEFAULT_MAP_CENTER);
      internalMapRef.current.setZoom(13);
    }
  };

  if (loadError) {
    return (
      <div style={styles.mapCanvas}>
        <div style={styles.mapFallback}>
          <strong>Google Maps failed to load.</strong>
          <span>Set VITE_GOOGLE_MAPS_API_KEY in your .env and restart.</span>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={styles.mapCanvas}>
        <div style={styles.mapFallback}>Loading Google Maps…</div>
      </div>
    );
  }

  return (
    <div style={styles.mapCanvas}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={zoom}
        options={{
          disableDefaultUI: true,
          clickableIcons:   false,
          zoomControl:      false,
          mapTypeId:        satellite ? "satellite" : "roadmap",
          mapId:            satellite ? undefined : "34390388b3abb63aa84876a7",
        }}
        onLoad={handleMapLoad}
        onUnmount={handleMapUnmount}
        onClick={onMapClick}
      >
        {(layers.barangay || layers.heatmap) && (
          <Data
            onLoad={(dataLayer) => {
              geoJsonDataRef.current = dataLayer;
              dataLayer.setStyle(geoJsonFeatureStyle);
              Promise.resolve(dataLayer.loadGeoJson("/data/mataasnakahoy.json")).then(() => {
                dataLayer.setStyle(geoJsonFeatureStyle);
              });
            }}
            onUnmount={(dataLayer) => {
              geoJsonDataRef.current = null;
              dataLayer.setMap(null);
            }}
          />
        )}
      </GoogleMap>

      {/* Zoom / Center controls */}
      <div style={styles.zoomControls}>
        <button type="button" style={styles.mapBtn} onClick={handleZoomIn}   title="Zoom in">  <Icon.ZoomIn  /></button>
        <button type="button" style={styles.mapBtn} onClick={handleZoomOut}  title="Zoom out"> <Icon.ZoomOut /></button>
        <button type="button" style={styles.mapBtn} onClick={handleCenter}   title="Re-center"><Icon.Crosshair /></button>
      </div>

      {/* Detection overlay */}
      {runDetectionLoading && (
        <div style={styles.overlay}>
          <div style={styles.overlayCard}>
            <strong>Running detection…</strong>
            <span style={{ fontSize: 12, opacity: 0.7 }}>This may take up to 30 seconds.</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Side panel flag card ───────────────────────────────────────────────────────
function FlagCard({ flag, selected, onClick }) {
  const fc = getFlagColor(flag.color);
  return (
    <div
      onClick={onClick}
      style={{
        ...styles.flagCard,
        borderLeft: `3px solid ${fc.marker}`,
        borderColor: selected ? fc.marker : "var(--color-border)",
        background: selected ? `${fc.bg}` : "rgba(255,255,255,0.6)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <p style={styles.flagName}>{flag.name}</p>
          <p style={styles.flagMeta}>{flag.barangay}</p>
        </div>
        <span style={{ ...styles.flagPill, background: fc.bg, color: fc.text, flexShrink: 0, marginLeft: 8 }}>
          {fc.label}
        </span>
      </div>
      {flag.address && (
        <p style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {flag.address}
        </p>
      )}
    </div>
  );
}

function YellowFlagModal({ token, barangays, draft, onPickLocation, onClose, onSuccess }) {
  const [form, setForm]     = useState(draft || { businessName: "", lat: "", lng: "", barangayID: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  
  const handlePickOnMap = () => {
    onPickLocation(form); // pass current form state back to parent so it's not lost
  };

  const handleSubmit = async () => {
    if (!form.businessName || !form.lat || !form.lng || !form.barangayID) {
      setError("Business name, coordinates, and barangay are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await createYellowFlagRequest({
        businessName: form.businessName,
        lat:          parseFloat(form.lat),
        lng:          parseFloat(form.lng),
        barangayID:   parseInt(form.barangayID, 10),
        notes:        form.notes || undefined,
      }, token);
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to create flag.");
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalBackdrop} onClick={!loading ? onClose : undefined}>
      <div style={{ ...styles.detailModal, padding: 0 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ ...styles.detailHeader, background: "#fef3c7", borderBottom: "1px solid #fde68a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Add Yellow Flag
            </span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><Icon.X /></button>
        </div>

        {/* Body */}
        <div style={styles.detailBody}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <p style={{ fontSize: 13, color: "var(--color-muted)", lineHeight: 1.6, maxWidth: "70%" }}>
              Manually flag a suspected or unverified establishment. It will appear on the map immediately.
            </p>
            <button 
              type="button" 
              className="ghost-btn" 
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-primary)", borderColor: "var(--color-primary-light)", background: "var(--color-primary-light)" }}
              onClick={handlePickOnMap}
            >
              <Icon.Crosshair /> Pick on Map
            </button>
          </div>

          {error && (
            <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--color-danger)", marginBottom: 14 }}>
              {error}
            </div>
          )}

          {[
            { label: "Business Name *", key: "businessName", placeholder: "e.g. Aling Nena's Tindahan" },
            { label: "Latitude *",      key: "lat",          placeholder: "e.g. 13.9667" },
            { label: "Longitude *",     key: "lng",          placeholder: "e.g. 121.1167" },
            { label: "Notes",           key: "notes",        placeholder: "Reason for flagging…" },
          ].map(({ label, key, placeholder }) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--color-ink)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {label}
              </label>
              <input
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 14, fontFamily: "var(--font-base)", color: "var(--color-ink)", outline: "none" }}
                placeholder={placeholder}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
              />
            </div>
          ))}

          <div style={{ marginBottom: 4 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--color-ink)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Barangay *
            </label>
            <select
              style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 14, fontFamily: "var(--font-base)", color: "var(--color-ink)", background: "#fff", cursor: "pointer" }}
              value={form.barangayID}
              onChange={e => set("barangayID", e.target.value)}
            >
              <option value="">Select barangay…</option>
              {barangays.map(b => (
                <option key={b.barangayID} value={b.barangayID}>{b.barangayName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.detailFooter}>
          <button className="ghost-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className="primary-btn"
            style={{ background: "#d97706", borderColor: "#d97706" }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving…" : "+ Add Yellow Flag"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dispatch Modal ────────────────────────────────────────────────────────────
function DispatchModal({ flag, token, onClose, onSuccess }) {
  const [inspectors, setInspectors] = useState([]);
  const [selectedUID, setSelectedUID] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`http://127.0.0.1:5000/api/users/?role=Inspector`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.data ?? []);
        setInspectors(list.filter(u => u.isActive !== 0 && u.isActive !== false && u.userRole === 'Inspector'));
        setFetching(false);
      })
      .catch(() => { setFetching(false); setError("Could not load inspectors."); });
  }, [token]);

  const handleAssign = async () => {
    if (!selectedUID) { setError("Select an inspector first."); return; }
    setLoading(true);
    setError("");
    try {
      await assignInspectionRequest({ logID: flag.id, userID: parseInt(selectedUID, 10) }, token);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Assignment failed.");
    } finally {
      setLoading(false);
    }
  };

  const fc = getFlagColor(flag.color);

  return (
    <div style={styles.modalBackdrop} onClick={!loading ? onClose : undefined}>
      <div style={{ ...styles.detailModal, padding: 24, width: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={styles.modalTitle}>Dispatch Inspector</h3>
          {!loading && <button style={styles.closeBtn} onClick={onClose}><Icon.X /></button>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(248,249,250,0.8)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "12px 14px", marginBottom: 20 }}>
          <span style={{ ...styles.flagPill, background: fc.bg, color: fc.text }}>{fc.label}</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: "var(--color-ink)", marginBottom: 2 }}>{flag.name}</p>
            <p style={{ fontSize: 12, color: "var(--color-muted)" }}>{flag.barangay} · Log #{flag.id}</p>
          </div>
        </div>
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--color-danger)", marginBottom: 16 }}>
            <Icon.AlertTriangle /> &nbsp;{error}
          </div>
        )}
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--color-ink)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Select Inspector</label>
        {fetching ? (
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Loading inspectors…</p>
        ) : (
          <select style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 14, fontFamily: "var(--font-base)", color: "var(--color-ink)", background: "#fff", cursor: "pointer", marginBottom: 4 }} value={selectedUID} onChange={e => setSelectedUID(e.target.value)}>
            <option value="">Choose an inspector…</option>
            {inspectors.map(u => (<option key={u.userID} value={u.userID}>{u.fullName}</option>))}
          </select>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
          <button className="ghost-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="primary-btn" style={{ background: "#3b82f6", borderColor: "#3b82f6", display: "flex", alignItems: "center", gap: 6 }} onClick={handleAssign} disabled={loading || fetching}>{loading ? "Dispatching…" : <><Icon.Send /> Dispatch</>}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MapPage() {
  const { token, user }    = useContext(AuthContext);
  const googleMapsApiKey   = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey,
    libraries: MAP_LIBRARIES,
    version:   "beta",
  });

  const mapRef = useRef(null);

  const [flags,               setFlags]               = useState([]);
  const [barangayRiskLevels,  setBarangayRiskLevels]  = useState({});
  const [loadingFlags,        setLoadingFlags]         = useState(false);
  const [flagsError,          setFlagsError]           = useState("");
  const [actionError,         setActionError]          = useState("");
  const [actionLoading,       setActionLoading]        = useState(false);
  const [runDetectionLoading, setRunDetectionLoading]  = useState(false);

  const [layers, setLayers] = useState({ base: true, heatmap: false, flags: true, barangay: false, diagnostics: false });
  const [selectedFlag, setSelectedFlag] = useState(null);   // logID of selected flag
  const [modalFlag,    setModalFlag]    = useState(null);   // flag object shown in detail modal
  const [showFullList, setShowFullList] = useState(false);
  const [dispatchTarget, setDispatchTarget] = useState(null);
  const [filterColor,  setFilterColor]  = useState("all");
  const [search,       setSearch]       = useState("");
  const [satellite, setSatellite] = useState(false);
  const [filterSource, setFilterSource] = useState("all");

  const isAdmin = user?.role === "Admin" || user?.role === "SUPER_ADMIN";

  const [showYellowModal, setShowYellowModal] = useState(false);
  const [isPickingYellowLocation, setIsPickingYellowLocation] = useState(false);
  const [yellowDraft, setYellowDraft]         = useState(null);
  const [barangays,       setBarangays]       = useState([]);
  const [clusters,         setClusters]         = useState([]);
  const [clustersLoading,  setClustersLoading]  = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchFlags = useCallback(async () => {
    if (!token) return;
    setLoadingFlags(true);
    setFlagsError("");
    try {
      const result = await getFlagsRequest({ limit: 1000 }, token);
      setFlags((result.data ?? []).map(normalizeFlag));
      
      // Fetch analytics for border-to-border risk heatmap (current state of the barangay)
      try {
        const analytics = await getAnalyticsOverviewRequest(token);
        const payload = analytics?.data || analytics;
        const rankings = payload?.prescriptive?.rankings || [];
        const riskMap = {};
        rankings.forEach(r => {
           const bName = (r.barangayName || "").toLowerCase()
             .replace("barangay ", "").replace("brgy. ", "")
             .replace("san sebastian", "san seb.").trim();
           riskMap[bName] = {
             risk_level:   r.risk_level,             // "High" | "Medium" | "Low"
             redFlagCount: r.redFlagCount ?? r.red_flag_count ?? 0,
           };
        });
        setBarangayRiskLevels(riskMap);
      } catch (err) {
        console.error("Failed to load analytics for map", err);
      }
    } catch (err) {
      setFlagsError(err.message || "Unable to load flags.");
    } finally {
      setLoadingFlags(false);
    }
  }, [token]);

  // Count Red Flags per barangay from the already-loaded flags array.
  // Used when prescriptive rankings omit a barangay (unranked tier on the map).
  const barangayRedFlagCounts = useMemo(() => {
    const counts = {};
    flags.forEach(f => {
      if (f.color !== "Red") return;
      const bName = (f.barangay || "unknown").toLowerCase()
        .replace("barangay ", "").replace("brgy. ", "")
        .replace("san sebastian", "san seb.").trim();
      counts[bName] = (counts[bName] || 0) + 1;
    });
    return counts;
  }, [flags]);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  useEffect(() => {
    if (!token || !isAdmin) return;
    getBarangaysRequest(token)
      .then(data => setBarangays(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [token, isAdmin]);

  useEffect(() => {
    if (!layers.diagnostics || !token) return;
    if (clusters.length > 0) return;           // already fetched this session

    setClustersLoading(true);
    getDiagnosticClustersRequest(token)
      .then(data => {
        setClusters(Array.isArray(data) ? data : (data?.clusters ?? []));
      })
      .catch(err => {
        console.error("[Diagnostics] Failed to load clusters:", err);
      })
      .finally(() => setClustersLoading(false));
  }, [layers.diagnostics, token]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleEscalate = async (logId) => {
    setActionLoading(true);
    setActionError("");
    try {
      await escalateFlagToBlackRequest(logId, token);
      await fetchFlags();
      setModalFlag(null);  // close modal after escalation
    } catch (err) {
      setActionError(err.message || "Failed to escalate.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunDetection = async () => {
    setRunDetectionLoading(true);
    setActionError("");
    try {
      const result = await runDetectionRequest(token);
      await fetchFlags();
      setClusters([]);
      // Show result summary briefly
      if (result?.new_flags !== undefined) {
        setActionError(`Detection complete — ${result.new_flags} new Red Flag${result.new_flags !== 1 ? "s" : ""} found.`);
        setTimeout(() => setActionError(""), 5000);
      }
    } catch (err) {
      setActionError(err.message || "Detection failed.");
    } finally {
      setRunDetectionLoading(false);
    }
  };

  // ── Marker click → pan map + open detail modal ────────────────────────────
  const handleMarkerClick = useCallback((id) => {
    const flag = flags.find(f => f.id === id);
    if (!flag) return;

    setSelectedFlag(id);
    setModalFlag(flag);

    // Pan map to marker
    if (mapRef.current && flag.latitude && flag.longitude) {
      mapRef.current.panTo({ lat: Number(flag.latitude), lng: Number(flag.longitude) });
      mapRef.current.setZoom(16);
    }
  }, [flags]);

  // ── When user clicks a flag in the side panel ─────────────────────────────
  const handleSidePanelClick = (flag) => {
    setSelectedFlag(flag.id);
    setModalFlag(flag);
    if (mapRef.current && flag.latitude && flag.longitude) {
      mapRef.current.panTo({ lat: Number(flag.latitude), lng: Number(flag.longitude) });
      mapRef.current.setZoom(16);
    }
  };
  
  // ── Map click (for "Drop a Pin" feature) ──────────────────────────────────
  const handleMapClick = useCallback((e) => {
    if (isPickingYellowLocation) {
      setYellowDraft(prev => ({ ...prev, lat: e.latLng.lat().toFixed(6), lng: e.latLng.lng().toFixed(6) }));
      setIsPickingYellowLocation(false);
      setShowYellowModal(true);
    }
  }, [isPickingYellowLocation]);

  // ── Filters ────────────────────────────────────────────────────────────────
  const visibleFlags = flags.filter(f => {
    const matchColor  = filterColor === "all" || f.color === filterColor;
    const matchSearch = (f.name || "").toLowerCase().includes(search.toLowerCase()) ||
                        (f.barangay || "").toLowerCase().includes(search.toLowerCase());
    const matchSource = filterSource === "all" || f.source === filterSource;
    return matchColor && matchSearch && matchSource;
  });

  const mapCenter = selectedFlag
    ? (() => {
        const f = flags.find(x => x.id === selectedFlag);
        return f?.latitude ? { lat: Number(f.latitude), lng: Number(f.longitude) } : DEFAULT_MAP_CENTER;
      })()
    : DEFAULT_MAP_CENTER;

  const mapZoom = selectedFlag ? 16 : 13;

  // Flag counts
  const counts = {
    Red:    flags.filter(f => f.color === "Red").length,
    Yellow: flags.filter(f => f.color === "Yellow").length,
    Black:  flags.filter(f => f.color === "Black").length,
    Green:  flags.filter(f => f.color === "Green").length,
  };

  return (
    <DashboardLayout user={{ initials: user?.fullName?.charAt(0) ?? "?", name: user?.fullName ?? "" }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Map &amp; Flags</h1>
          <p className="page-subtitle">
            Geospatial view of flagged and unregistered establishments in Mataasnakahoy.
          </p>
          {(flagsError || actionError) && (
            <p style={{ fontSize: 13, marginTop: 6, color: actionError && !flagsError ? "var(--color-primary)" : "var(--color-danger)" }}>
              {flagsError || actionError}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={styles.livePill}>
            <span style={styles.liveDot} />
            {flags.filter(f => f.color !== "Green").length} Active Flags
          </span>
          {isAdmin && (
            <>
              <button className="ghost-btn" type="button" onClick={() => setShowYellowModal(true)}>
                + Yellow Flag
              </button>
              <button className="primary-btn" type="button" onClick={handleRunDetection} disabled={runDetectionLoading}>
                {runDetectionLoading ? "Running…" : "Run Detection"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Banner showing when picking location */}
      {isPickingYellowLocation && (
        <div style={styles.pickingBanner}>
          <Icon.Crosshair /> Click anywhere on the map to set the flag's coordinates. 
          <button style={{ marginLeft: 16, background: "none", border: "none", color: "#fff", textDecoration: "underline", cursor: "pointer" }} onClick={() => { setIsPickingYellowLocation(false); setShowYellowModal(true); }}>Cancel</button>
        </div>
      )}

      {/* Map layout */}
      <div style={styles.mapLayout}>

        {/* Left: map + layer controls */}
        <div style={styles.mapColumn}>

          {/* Layer toggle */}
          <div className="frosted-glass saas-card" style={styles.layerBar}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon.Layers />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>Layers</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {LAYER_OPTIONS.map(l => (
                <button
                  key={l.id}
                  onClick={() => {
                    if (l.id === "base") {
                      setSatellite(prev => !prev);
                    } else {
                      setLayers(prev => ({ ...prev, [l.id]: !prev[l.id] }));
                    }
                  }}
                  style={{
                    ...styles.layerToggle,
                    background:  (l.id === "base" ? satellite : layers[l.id])
                      ? "var(--color-primary)" : "rgba(248,249,250,0.9)",
                    color:       (l.id === "base" ? satellite : layers[l.id])
                      ? "#fff" : "var(--color-muted)",
                    borderColor: (l.id === "base" ? satellite : layers[l.id])
                      ? "var(--color-primary)" : "var(--color-border)",
                  }}
                >
                  {l.label}
                  {l.id === "diagnostics" && layers.diagnostics && clustersLoading && (
                    <span style={{ fontSize: 11, color: "var(--color-muted)", marginLeft: 4 }}>
                      loading…
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Map */}
          <div className="frosted-glass" style={styles.mapWrapper}>
            <MapCanvas
              isLoaded={isLoaded}
              loadError={loadError}
              center={mapCenter}
              zoom={mapZoom}
              mapRef={mapRef}
              layers={layers}
              flags={visibleFlags}
              barangayRiskLevels={barangayRiskLevels}
              selectedFlagId={selectedFlag}
              onMarkerClick={handleMarkerClick}
              onMapClick={handleMapClick}
              isPickingLocation={isPickingYellowLocation}
              runDetectionLoading={runDetectionLoading}
              satellite={satellite}
              clusters={clusters}
              barangayRedFlagCounts={barangayRedFlagCounts}
            />
            {/* Discrete risk legend — matches HEATMAP_RISK_STYLE on the Data layer */}
            {layers.heatmap && (
              <div style={{
                position:       "absolute",
                bottom:         14,
                left:           14,
                zIndex:         10,
                background:     "rgba(255,255,255,0.93)",
                backdropFilter: "blur(6px)",
                borderRadius:   10,
                padding:        "10px 14px",
                boxShadow:      "0 2px 12px rgba(0,0,0,0.15)",
                minWidth:       168,
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Barangay risk index
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    { tier: "High",     label: "High risk" },
                    { tier: "Medium",   label: "Moderate risk" },
                    { tier: "Low",      label: "Low risk" },
                    { tier: "unranked", label: "Red flags (unranked)" },
                    { tier: "none",     label: "No red flags" },
                  ].map(({ tier, label }) => {
                    const row = HEATMAP_RISK_STYLE[tier];
                    return (
                      <div key={tier} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            width: 22,
                            height: 14,
                            borderRadius: 2,
                            background: row.fillColor,
                            border: `1px solid ${row.strokeColor}`,
                            flexShrink: 0,
                            opacity: 0.92,
                          }}
                        />
                        <span style={{ fontSize: 11, color: "#334155", fontWeight: 500 }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Stats strip */}
        <div style={styles.statsStrip}>
          {[
            { label: "Total Flags",   value: flags.length,  color: "var(--color-ink)" },
            { label: "Green Flags",   value: counts.Green,  color: "#22c55e"          },
            { label: "Red Flags",     value: counts.Red,    color: "#ef4444"          },
            { label: "Yellow Flags",  value: counts.Yellow, color: "#f59e0b"          },
            { label: "Black Flags",   value: counts.Black,  color: "#1e293b"          },
          ].map(s => (
            <div key={s.label} className="frosted-glass saas-card" style={styles.statCard}>
              <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>
        </div>

        {/* Right: side panel */}
        <div className="frosted-glass saas-card" style={styles.sidePanel}>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Icon.Flag />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)", flex: 1 }}>
                Flagged Locations
              </h3>
              <button
                className="ghost-btn"
                type="button"
                style={{ fontSize: 11, padding: "5px 10px" }}
                onClick={() => setShowFullList(true)}
              >
                See Full List
              </button>
              <span style={styles.countBadge}>{visibleFlags.length}</span>
            </div>

            {/* Search */}
            <div className="search-bar" style={{ marginBottom: 10 }}>
              <Icon.Search />
              <input
                type="text"
                placeholder="Search name or barangay…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Color filter pills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["all", "Red", "Yellow", "Black", "Green"].map(c => (
                <button
                  key={c}
                  onClick={() => {
                    setFilterColor(c);
                    if (c !== "Green") setFilterSource("all");
                  }}
                  style={{
                    ...styles.filterPill,
                    background:  filterColor === c ? (c === "all" ? "var(--color-ink)" : FLAG_COLORS[c]?.marker ?? "var(--color-ink)") : "rgba(248,249,250,0.9)",
                    color:       filterColor === c ? "#fff" : "var(--color-muted)",
                    borderColor: filterColor === c ? "transparent" : "var(--color-border)",
                  }}
                >
                  {c === "all" ? "All" : c}
                </button>
              ))}
            </div>

            {/* Source filter — shows only when Green is selected */}
            {filterColor === "Green" && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {[
                  { value: "all",               label: "All Sources"        },
                  { value: "registry_only",     label: "📋 Registry Only"   },
                  { value: "registry_and_maps", label: "🗺️ Registry + Maps" },
                ].map(s => (
                  <button
                    key={s.value}
                    onClick={() => setFilterSource(s.value)}
                    style={{
                      ...styles.filterPill,
                      fontSize: 10,
                      background:  filterSource === s.value ? "var(--color-ink)" : "rgba(248,249,250,0.9)",
                      color:       filterSource === s.value ? "#fff" : "var(--color-muted)",
                      borderColor: filterSource === s.value ? "transparent" : "var(--color-border)",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Flag list */}
          <div style={styles.flagList}>
            {loadingFlags ? (
              <div style={styles.emptyPanel}>Loading flags…</div>
            ) : visibleFlags.length === 0 ? (
              <div style={styles.emptyPanel}>
                <Icon.AlertTriangle />
                <p>{search || filterColor !== "all" ? "No flags match this filter." : "No flags detected yet."}</p>
              </div>
            ) : visibleFlags.map(f => (
              <FlagCard
                key={f.id}
                flag={f}
                selected={selectedFlag === f.id}
                onClick={() => handleSidePanelClick(f)}
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

      {/* Flag detail modal — opens on marker or side panel click */}
      {modalFlag && (
        <FlagDetailModal
          flag={modalFlag}
          onClose={() => { setModalFlag(null); setSelectedFlag(null); }}
          onEscalate={handleEscalate}
          onDispatch={(flag) => setDispatchTarget(flag)}
          isAdmin={isAdmin}
          actionLoading={actionLoading}
        />
      )}

      {/* Full list modal */}
      {showFullList && (
        <FullFlagListModal
          flags={flags}
          onClose={() => setShowFullList(false)}
          onSelectFlag={(id) => {
            const flag = flags.find(f => f.id === id);
            if (flag) handleSidePanelClick(flag);
          }}
        />
      )}

      {dispatchTarget && (
        <DispatchModal
          flag={dispatchTarget}
          token={token}
          onClose={() => setDispatchTarget(null)}
          onSuccess={() => {
            setDispatchTarget(null);
            setModalFlag(null);
            fetchFlags();
          }}
        />
      )}

      {showYellowModal && (
        <YellowFlagModal
          token={token}
          barangays={barangays}
          draft={yellowDraft}
          onPickLocation={(currentForm) => {
            setYellowDraft(currentForm);
            setShowYellowModal(false);
            setIsPickingYellowLocation(true);
          }}
          onClose={() => setShowYellowModal(false)}
          onSuccess={() => { setShowYellowModal(false); setYellowDraft(null); fetchFlags(); }}
        />
      )}

    </DashboardLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  livePill: { display: "inline-flex", alignItems: "center", gap: 6, background: "#fee2e2", color: "#b91c1c", padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  liveDot:  { width: 7, height: 7, borderRadius: "50%", background: "#ef4444" },

  mapLayout:  { display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" },
  mapColumn:  { display: "flex", flexDirection: "column", gap: 14 },

  layerBar:   { display: "flex", alignItems: "center", gap: 16, padding: "12px 18px", borderRadius: "var(--radius-lg)", flexWrap: "wrap" },
  layerToggle:{ padding: "6px 12px", borderRadius: 20, border: "1px solid", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-base)", transition: "all 0.15s" },

  mapWrapper: { borderRadius: "var(--radius-lg)", overflow: "hidden", position: "relative", height: 480 },
  mapCanvas:  { width: "100%", height: "100%", position: "relative", background: "#e8f5e2" },
  mapFallback:{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#334155", fontSize: 14, textAlign: "center", padding: 24 },

  zoomControls: { position: "absolute", top: 16, right: 16, display: "flex", flexDirection: "column", gap: 4, zIndex: 10 },
  mapBtn:       { width: 36, height: 36, background: "rgba(255,255,255,0.95)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-muted)", backdropFilter: "blur(8px)" },
  overlay:      { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.5)", zIndex: 20 },
  overlayCard:  { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "#fff", background: "rgba(15,23,42,0.8)", borderRadius: 16, padding: "16px 24px", fontSize: 14 },
  pickingBanner:{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: "var(--color-primary)", color: "#fff", padding: "12px 24px", borderRadius: 30, zIndex: 100, display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, boxShadow: "0 10px 25px rgba(0,0,0,0.2)" },

  statsStrip: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 },
  statCard:   { display: "flex", flexDirection: "column", gap: 2, padding: "14px 18px", borderRadius: "var(--radius-lg)" },

  sidePanel: { borderRadius: "var(--radius-lg)", padding: 16, display: "flex", flexDirection: "column", maxHeight: 680, position: "sticky", top: 20 },
  flagList:  { overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, flex: 1, paddingRight: 2 },
  flagCard:  { border: "1px solid", borderRadius: "var(--radius-md)", padding: "12px 14px", cursor: "pointer", transition: "all 0.12s" },
  flagName:  { fontSize: 13, fontWeight: 700, color: "var(--color-ink)", marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  flagMeta:  { fontSize: 11, color: "var(--color-muted)" },
  flagPill:  { fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, letterSpacing: "0.03em", whiteSpace: "nowrap" },

  countBadge: { background: "#fee2e2", color: "#b91c1c", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12 },
  filterPill: { padding: "4px 10px", borderRadius: 20, border: "1px solid", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-base)", transition: "all 0.12s" },
  emptyPanel: { textAlign: "center", padding: "40px 0", color: "var(--color-muted)", fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },

  // Detail modal
  modalBackdrop: { position: "fixed", inset: 0, zIndex: 50, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  detailModal:   { width: "min(100%, 480px)", borderRadius: 20, background: "#fff", boxShadow: "0 24px 60px rgba(15,23,42,0.18)", overflow: "hidden" },
  detailHeader:  { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" },
  detailBody:    { padding: "20px 24px" },
  detailName:    { fontSize: 18, fontWeight: 700, color: "var(--color-ink)", marginBottom: 16, lineHeight: 1.3 },
  detailGrid:    { display: "flex", flexDirection: "column", gap: 10 },
  detailRow:     { display: "flex", gap: 12, alignItems: "flex-start" },
  detailLabel:   { minWidth: 110, fontSize: 12, color: "var(--color-muted)", fontWeight: 500, paddingTop: 1 },
  detailValue:   { fontSize: 13, color: "var(--color-ink)", fontWeight: 400, flex: 1 },
  detailFooter:  { display: "flex", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--color-border-soft)", flexWrap: "wrap" },
  closeBtn:      { width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(148,163,184,0.3)", background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-muted)" },

  // Full list modal
  fullListModal:  { width: "min(100%, 900px)", maxHeight: "85vh", borderRadius: 20, background: "#fff", boxShadow: "0 24px 60px rgba(15,23,42,0.16)", overflow: "hidden" },
  fullListHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "24px 24px 16px" },
  modalTitle:     { fontSize: 18, fontWeight: 700, color: "var(--color-ink)", margin: 0 },
  fullListTable:  { width: "100%", borderCollapse: "collapse", minWidth: 640, fontSize: 13 },
  th: { textAlign: "left", padding: "10px 16px", color: "var(--color-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid rgba(148,163,184,0.2)", fontWeight: 700, whiteSpace: "nowrap" },
  td: { padding: "12px 16px", borderBottom: "1px solid rgba(148,163,184,0.12)", color: "var(--color-ink)", verticalAlign: "middle" },
  modalSelect:    { padding: "0 12px", height: 40, borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)", background: "rgba(248,249,250,0.8)", fontSize: 13, color: "var(--color-ink)", outline: "none", cursor: "pointer", fontFamily: "var(--font-base)" },
};