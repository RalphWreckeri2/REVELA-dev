/**
 * MapPage.jsx
 * Map & Flags — Google Maps with color-coded pin markers, click-to-open detail
 * modal, working zoom controls, fixed "See Full List" modal.
 */

import { useState, useEffect, useCallback, useRef, useContext } from "react";
import { MarkerClusterer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";
import { useLoadScript, GoogleMap, Data } from "@react-google-maps/api";
import DashboardLayout from "../components/DashboardLayout";
import StatusBadge from "../components/StatusBadge";
import { AuthContext } from "../context/AuthContext";
import {
  getFlagsRequest,
  escalateFlagToBlackRequest,
  runDetectionRequest,
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
};

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_MAP_CENTER = { lat: 13.9667, lng: 121.1167 };
const MAP_LIBRARIES      = ["places", "marker"];
// const MAP_OPTIONS        = {
//  disableDefaultUI: true,
//  clickableIcons:   false,
//  zoomControl:      false,
//  mapTypeId:        isSatellite ? "satellite" : "roadmap",
//  mapId:            isSatellite ? undefined : "34390388b3abb63aa84876a7",
//};

const LAYER_OPTIONS = [
  { id: "base",     label: "Base Map" },
  { id: "heatmap",  label: "Risk Heatmap" },
  { id: "flags",    label: "Flag Markers" },
  { id: "barangay", label: "Barangay Boundaries" },
];

// Flag color → UI color mapping
const FLAG_COLORS = {
  Red:    { marker: "#ef4444", bg: "#fee2e2", text: "#b91c1c", label: "Unregistered" },
  Yellow: { marker: "#f59e0b", bg: "#fef3c7", text: "#92400e", label: "Suspected"    },
  Black:  { marker: "#1e293b", bg: "#f1f5f9", text: "#1e293b", label: "Non-Responsive" },
  Green:  { marker: "#22c55e", bg: "#dcfce7", text: "#15803d", label: "Compliant"    },
};

const defaultColor = { marker: "#94a3b8", bg: "#f1f5f9", text: "#64748b", label: "Unknown" };

function getFlagColor(flagColor) {
  return FLAG_COLORS[flagColor] ?? defaultColor;
}

// ── Normalise flag from API → UI shape ────────────────────────────────────────
function normalizeFlag(flag) {
  const color  = flag.flagColor ?? "Red";
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
function FlagDetailModal({ flag, onClose, onEscalate, isAdmin, actionLoading }) {
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
            <button
              className="primary-btn"
              style={{ background: "#1e293b", borderColor: "#1e293b" }}
              disabled={actionLoading}
              onClick={() => onEscalate(flag.id)}
            >
              {actionLoading ? "Escalating…" : "Escalate to Black"}
            </button>
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
  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.fullListModal} onClick={e => e.stopPropagation()}>

        <div style={styles.fullListHeader}>
          <div>
            <h3 style={styles.modalTitle}>All Flagged Locations</h3>
            <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>
              {flags.length} total · click a row to view on map
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}><Icon.X /></button>
        </div>

        <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(80vh - 100px)" }}>
          <table style={styles.fullListTable}>
            <thead>
              <tr>
                {["ID", "Name", "Barangay", "Address", "Detected", "Flag", ""].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flags.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px", color: "var(--color-muted)", fontSize: 13 }}>
                    No flags to display.
                  </td>
                </tr>
              ) : flags.map((f, i) => {
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
function MapCanvas({ isLoaded, loadError, center, zoom, mapRef, layers, flags, selectedFlagId, onMarkerClick, runDetectionLoading, satellite }) {
  const markerRefs      = useRef(new Map());
  const internalMapRef  = useRef(null);
  const clusterRef      = useRef(null); 

  const handleMapLoad = useCallback((map) => {
    internalMapRef.current = map;
    if (mapRef) mapRef.current = map;
  }, [mapRef]);

  const handleMapUnmount = useCallback(() => {
    markerRefs.current.forEach(m => m.setMap(null));
    markerRefs.current.clear();
    internalMapRef.current = null;
  }, []);

  const handleBarangayLoad = useCallback((dataLayer) => {
    dataLayer.loadGeoJson("/data/mataasnakahoy.json");
    dataLayer.setStyle({
      fillColor:    "#1f7a1f",
      strokeColor:  "#166534",
      strokeWeight: 1,
      fillOpacity:  0.12,
    });
  }, []);

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
        render: ({ count, position }) => {
          const size = count > 100 ? 56 : count > 50 ? 48 : count > 10 ? 42 : 36;
          const el = document.createElement("div");
          el.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            background: #22c55e;
            border: 3px solid #16a34a;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 800;
            font-size: ${count > 99 ? 11 : 13}px;
            font-family: sans-serif;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          `;
          el.textContent = count;

          return new window.google.maps.marker.AdvancedMarkerElement({
            position,
            content: el,
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
      >
        {layers.barangay && (
          <Data onLoad={handleBarangayLoad} onUnmount={dl => dl.setMap(null)} />
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
  const [loadingFlags,        setLoadingFlags]         = useState(false);
  const [flagsError,          setFlagsError]           = useState("");
  const [actionError,         setActionError]          = useState("");
  const [actionLoading,       setActionLoading]        = useState(false);
  const [runDetectionLoading, setRunDetectionLoading]  = useState(false);

  const [layers,       setLayers]       = useState({ base: true, heatmap: false, flags: true, barangay: false });
  const [selectedFlag, setSelectedFlag] = useState(null);   // logID of selected flag
  const [modalFlag,    setModalFlag]    = useState(null);   // flag object shown in detail modal
  const [showFullList, setShowFullList] = useState(false);
  const [filterColor,  setFilterColor]  = useState("all");
  const [search,       setSearch]       = useState("");
  const [satellite, setSatellite] = useState(false);
  const [filterSource, setFilterSource] = useState("all");

  const isAdmin = user?.role === "Admin" || user?.role === "SUPER_ADMIN";

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchFlags = useCallback(async () => {
    if (!token) return;
    setLoadingFlags(true);
    setFlagsError("");
    try {
      const result = await getFlagsRequest({ limit: 1000 }, token);
      setFlags((result.data ?? []).map(normalizeFlag));
    } catch (err) {
      setFlagsError(err.message || "Unable to load flags.");
    } finally {
      setLoadingFlags(false);
    }
  }, [token]);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

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
            <button className="primary-btn" type="button" onClick={handleRunDetection} disabled={runDetectionLoading}>
              {runDetectionLoading ? "Running…" : "Run Detection"}
            </button>
          )}
        </div>
      </div>

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
              selectedFlagId={selectedFlag}
              onMarkerClick={handleMarkerClick}
              runDetectionLoading={runDetectionLoading}
              satellite={satellite}
            />
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
          isAdmin={isAdmin}
          actionLoading={actionLoading}
        />
      )}

      {/* Full list modal */}
      {showFullList && (
        <FullFlagListModal
          flags={visibleFlags}
          onClose={() => setShowFullList(false)}
          onSelectFlag={(id) => {
            const flag = flags.find(f => f.id === id);
            if (flag) handleSidePanelClick(flag);
          }}
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
};
