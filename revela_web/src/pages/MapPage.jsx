/**
 * MapPage.jsx
 * Map & Flags — large map canvas + heatmap toggle + flagged locations side panel.
 * All layout handled by DashboardLayout. All shared styling via global.css.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLoadScript, GoogleMap, Data } from "@react-google-maps/api";
import DashboardLayout from "../components/DashboardLayout";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import {
  getFlagsRequest,
  escalateFlagToBlackRequest,
  runDetectionRequest,
} from "../services/api";

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
const DEFAULT_MAP_CENTER = { lat: 13.9174, lng: 121.0794 };
const MAP_LIBRARIES = ["places", "marker"];
const MAP_OPTIONS = {
  disableDefaultUI: true,
  clickableIcons: false,
  zoomControl: false,
  mapId: "34390388b3abb63aa84876a7",
};

function MapCanvas({ isLoaded, loadError, center, zoom, layers, flags, selectedFlagId, onMarkerClick, onZoomIn, onZoomOut, onCenterMap, runDetectionLoading }) {
  const mapRef = useRef(null);
  const markerRefs = useRef(new Map());

  const handleMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const handleMapUnmount = useCallback(() => {
    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current.clear();
    mapRef.current = null;
  }, []);

  const handleBarangayLoad = useCallback((dataLayer) => {
    dataLayer.loadGeoJson("/data/mataasnakahoy.json");
    dataLayer.setStyle({
      fillColor: "#1f7a1f",
      strokeColor: "#166534",
      strokeWeight: 1,
      fillOpacity: 0.15,
    });
  }, []);

  const handleBarangayUnmount = useCallback((dataLayer) => {
    dataLayer.setMap(null);
  }, []);

  const buildMarkerContent = useCallback((flag, selected) => {
    const element = document.createElement("div");
    element.style.width = "18px";
    element.style.height = "18px";
    element.style.borderRadius = "50%";
    const riskColor = RISK_COLOR[flag.risk]?.dot || "#ef4444";
    element.style.backgroundColor = selected ? "#2563eb" : riskColor;
    element.style.border = "2px solid #fff";
    element.style.boxShadow = `0 0 14px ${selected ? "rgba(37,99,235,0.35)" : `${riskColor}55`}`;
    element.style.cursor = "pointer";
    element.title = flag.name || "Flag marker";
    return element;
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current.clear();

    if (!layers.flags) return;

    const visibleFlags = flags?.filter((flag) => flag.latitude != null && flag.longitude != null) || [];
    visibleFlags.forEach((flag) => {
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        position: { lat: Number(flag.latitude), lng: Number(flag.longitude) },
        map: mapRef.current,
        content: buildMarkerContent(flag, flag.id === selectedFlagId),
      });

      marker.addListener("gmp-click", () => onMarkerClick(flag.id));
      markerRefs.current.set(flag.id, marker);
    });

    return () => {
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current.clear();
    };
  }, [isLoaded, layers.flags, flags, selectedFlagId, onMarkerClick, buildMarkerContent]);

  if (loadError) {
    return (
      <div style={styles.mapCanvas}>
        <div style={styles.mapPlaceholderText}>
          <strong>Google Maps failed to load.</strong>
          <span>Please set `VITE_GOOGLE_MAPS_API_KEY` in your `.env` file and restart the dev server.</span>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={styles.mapCanvas}>
        <div style={styles.mapPlaceholderText}>
          Loading Google Maps...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.mapCanvas}>
      <GoogleMap
        mapContainerStyle={styles.mapCanvas}
        center={center}
        zoom={zoom}
        mapTypeId={layers.base ? "roadmap" : "satellite"}
        options={MAP_OPTIONS}
        onLoad={handleMapLoad}
        onUnmount={handleMapUnmount}
      >
        {layers.barangay && (
          <Data
            onLoad={handleBarangayLoad}
            onUnmount={handleBarangayUnmount}
          />
        )}
      </GoogleMap>

      {runDetectionLoading && (
        <div style={styles.mapActionOverlay}>
          <div style={styles.mapActionOverlayText}>
            <strong>Running detection...</strong>
            <span>Please wait while the latest analytics are processed.</span>
          </div>
        </div>
      )}

      {layers.heatmap && (
        <div style={styles.heatmapLayer} />
      )}

      <div style={styles.zoomControls}>
        <button type="button" style={styles.mapBtn} onClick={onZoomIn}><Icon.ZoomIn /></button>
        <button type="button" style={styles.mapBtn} onClick={onZoomOut}><Icon.ZoomOut /></button>
        <button type="button" style={styles.mapBtn} onClick={onCenterMap}><Icon.Crosshair /></button>
      </div>
    </div>
  );
}

// ── Flag Item in Side Panel ───────────────────────────────────────────────
function FlagCard({ flag, selected, onClick, onEscalate, canEscalate }) {
  const risk = RISK_COLOR[flag.risk] || RISK_COLOR.high;
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
          <p style={styles.flagMeta}>{flag.type || flag.nearestLandmark || flag.barangay}</p>
        </div>
        <span style={{ ...styles.riskPill, background: risk.bg, color: risk.text }}>
          {flag.risk?.toUpperCase() || "HIGH"}
        </span>
      </div>

      {selected && (
        <div style={styles.flagRow}>
          <Icon.MapPin />
          <span style={styles.flagCoords}>{flag.coords}</span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <StatusBadge variant={flag.status === "unregistered" ? "red" : flag.status === "review" ? "gold" : flag.status === "black" ? "default" : "green"}>
          {flag.status === "unregistered" ? "Unregistered" : flag.status === "review" ? "Review" : flag.status === "black" ? "Black" : flag.status === "registered" ? "Registered" : "Unknown"}
        </StatusBadge>
        <div style={styles.scoreRow}>
          <span style={styles.scoreLabel}>Priority</span>
          <span style={{ ...styles.scoreValue, color: flag.priorityScore >= 80 ? "var(--color-danger)" : flag.priorityScore >= 50 ? "var(--color-gold-dark)" : "var(--color-primary)" }}>
            {flag.priorityScore ?? "—"}
          </span>
        </div>
      </div>

      {selected && (
        <div style={styles.flagActions}>
          {canEscalate && (
            <button
              className="primary-btn"
              type="button"
              style={{ fontSize: 12, padding: "7px 14px" }}
              onClick={() => onEscalate(flag.logID)}
            >
              Escalate to Black
            </button>
          )}
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
  const { token, user } = useAuth();
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey,
    libraries: MAP_LIBRARIES,
    version: "beta"
  });
  const [flags, setFlags] = useState([]);
  const [loadingFlags, setLoadingFlags] = useState(false);
  const [flagsError, setFlagsError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [runDetectionLoading, setRunDetectionLoading] = useState(false);
  const [layers, setLayers] = useState({ base: true, heatmap: false, flags: true, barangay: false });
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [filterRisk, setFilterRisk] = useState("all");
  const [search, setSearch] = useState("");
  const [showFullList, setShowFullList] = useState(false);

  const toggleLayer = (id) => setLayers(prev => ({ ...prev, [id]: !prev[id] }));

  const normalizeFlag = (flag) => {
    const color = (flag.flagColor || "").toLowerCase();
    const risk = color === "green" ? "low" : color === "yellow" ? "medium" : "high";
    const status = color === "red" ? "unregistered" : color === "yellow" ? "review" : color === "black" ? "black" : "registered";
    const coords = flag.latitude != null && flag.longitude != null
      ? `${Number(flag.latitude).toFixed(4)}°, ${Number(flag.longitude).toFixed(4)}°`
      : flag.coords || "Unknown location";

    return {
      ...flag,
      id: flag.logID ?? flag.id,
      name: flag.detectedName ?? flag.name ?? "Unknown",
      type: flag.nearestLandmark ?? flag.type ?? "",
      barangay: flag.barangayName ?? flag.barangay ?? "",
      coords,
      risk,
      status,
    };
  };

  const sourceFlags = token ? flags : FLAGGED;
  const selectedFlagData = sourceFlags.find((f) => f.id === selectedFlag);
  const mapCenter = selectedFlagData && selectedFlagData.latitude != null && selectedFlagData.longitude != null
    ? { lat: Number(selectedFlagData.latitude), lng: Number(selectedFlagData.longitude) }
    : DEFAULT_MAP_CENTER;
  const mapZoom = selectedFlagData ? 14 : 12;

  const fetchFlags = useCallback(async () => {
    if (!token) return;
    setLoadingFlags(true);
    setFlagsError("");

    try {
      const result = await getFlagsRequest({ limit: 200 }, token);
      setFlags((result.data ?? []).map(normalizeFlag));
    } catch (err) {
      setFlagsError(err.message || "Unable to load flags.");
    } finally {
      setLoadingFlags(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleEscalate = async (logId) => {
    if (!token) return;
    setActionLoading(true);
    setActionError("");

    try {
      await escalateFlagToBlackRequest(logId, token);
      await fetchFlags();
      setSelectedFlag(logId);
    } catch (err) {
      setActionError(err.message || "Failed to escalate flag.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunDetection = async () => {
    if (!token) return;
    setRunDetectionLoading(true);
    setActionError("");

    try {
      await runDetectionRequest(token);
      await fetchFlags();
    } catch (err) {
      setActionError(err.message || "Failed to run detection.");
    } finally {
      setRunDetectionLoading(false);
    }
  };

  const handleMarkerClick = useCallback((id) => {
    setSelectedFlag((prev) => (prev === id ? null : id));
  }, []);

  const handleZoomIn = () => {
    window.alert("Zooming in on the map.");
  };

  const handleZoomOut = () => {
    window.alert("Zooming out of the map.");
  };

  const handleCenterMap = () => {
    window.alert("Centering map on the selected area.");
  };

  const visibleFlags = sourceFlags.filter(f => {
    const matchRisk = filterRisk === "all" || f.risk === filterRisk;
    const matchSearch = (f.name || "").toLowerCase().includes(search.toLowerCase()) ||
                        (f.barangay || "").toLowerCase().includes(search.toLowerCase());
    return matchRisk && matchSearch;
  });

  const isAdmin = user?.role === "Admin" || user?.role === "SUPER_ADMIN";

  return (
    <DashboardLayout user={{ initials: "JD", name: "J. Dela Cruz" }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Map & Flags</h1>
          <p className="page-subtitle">
            Geospatial view of flagged and unregistered establishments in Mataasnakahoy.
          </p>
          {(flagsError || actionError) && (
            <p style={{ color: "var(--color-danger)", marginTop: 8 }}>
              {flagsError || actionError}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={styles.livePill}>
            <span style={styles.liveDot} />
            {sourceFlags.length} Active Flags
          </span>
          {isAdmin && (
            <button className="primary-btn" type="button" onClick={handleRunDetection} disabled={runDetectionLoading || actionLoading}>
              {runDetectionLoading ? "Running..." : "Run Detection"}
            </button>
          )}
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
              isLoaded={isLoaded}
              loadError={loadError}
              center={mapCenter}
              zoom={mapZoom}
              layers={layers}
              flags={sourceFlags}
              selectedFlagId={selectedFlag}
              onMarkerClick={handleMarkerClick}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onCenterMap={handleCenterMap}
              runDetectionLoading={runDetectionLoading}
            />
          </div>

          {/* Stats strip below map */}
          <div style={styles.statsStrip}>
            {[
              { label: "Total Flags",    value: sourceFlags.length,                               color: "var(--color-ink)" },
              { label: "Red Flags",      value: sourceFlags.filter(f => f.flagColor === "Red").length,   color: "var(--color-danger)" },
              { label: "Yellow Flags",   value: sourceFlags.filter(f => f.flagColor === "Yellow").length, color: "var(--color-gold-dark)" },
              { label: "Black Flags",    value: sourceFlags.filter(f => f.flagColor === "Black").length,  color: "var(--color-primary)" },
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
              <button
                className="ghost-btn"
                type="button"
                style={{ fontSize: 12, padding: "6px 12px" }}
                onClick={() => setShowFullList(true)}
              >
                See Full List
              </button>
              <span className="badge badge--red" style={{ marginLeft: "auto" }}>
                {sourceFlags.length}
              </span>
            </div>
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
                canEscalate={isAdmin && (f.flagColor === "Red" || f.flagColor === "Yellow")}
                onEscalate={handleEscalate}
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

      {showFullList && (
        <FullFlagListModal visibleFlags={visibleFlags} onClose={() => setShowFullList(false)} />
      )}
    </DashboardLayout>
  );
}

// ── Full Flag List Modal ───────────────────────────────────────────────────
function FullFlagListModal({ visibleFlags, onClose }) {
  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>All Visible Flags</h3>
          <button type="button" style={styles.closeBtn} onClick={onClose}>
            <Icon.X />
          </button>
        </div>
        <div style={styles.modalBody}>
          <div style={styles.tableWrapper}>
            <table style={styles.fullListTable}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>ID</th>
                  <th style={styles.tableHeader}>Name</th>
                  <th style={styles.tableHeader}>Barangay</th>
                  <th style={styles.tableHeader}>Risk</th>
                  <th style={styles.tableHeader}>Status</th>
                  <th style={styles.tableHeader}>Priority</th>
                </tr>
              </thead>
              <tbody>
                {visibleFlags.map((flag) => (
                  <tr key={flag.id}>
                    <td style={styles.tableCell}>{flag.id}</td>
                    <td style={styles.tableCell}>{flag.name}</td>
                    <td style={styles.tableCell}>{flag.barangay}</td>
                    <td style={styles.tableCell}>{flag.risk}</td>
                    <td style={styles.tableCell}>{flag.status}</td>
                    <td style={styles.tableCell}>{flag.priorityScore ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
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
  mapActionOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(15,23,42,0.6)",
    zIndex: 20,
    pointerEvents: "none",
  },
  mapActionOverlayText: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    color: "#fff",
    background: "rgba(15,23,42,0.8)",
    borderRadius: "16px",
    padding: "14px 20px",
    fontSize: 14,
    lineHeight: 1.4,
    boxShadow: "0 18px 48px rgba(15,23,42,0.24)",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 30,
    background: "rgba(15,23,42,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "min(100%, 960px)",
    maxHeight: "90vh",
    overflow: "hidden",
    borderRadius: "22px",
    background: "rgba(255,255,255,0.95)",
    boxShadow: "0 24px 60px rgba(15,23,42,0.16)",
    border: "1px solid rgba(148,163,184,0.18)",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "20px 24px 0",
  },
  modalTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "var(--color-ink)",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: "1px solid var(--color-border)",
    background: "#fff",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },
  modalBody: {
    padding: "0 24px 24px",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  fullListTable: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 720,
  },
  tableHeader: {
    textAlign: "left",
    padding: "12px 16px",
    color: "var(--color-muted)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    borderBottom: "1px solid rgba(148,163,184,0.24)",
  },
  tableCell: {
    padding: "14px 16px",
    borderBottom: "1px solid rgba(148,163,184,0.15)",
    color: "var(--color-ink)",
    fontSize: 13,
  },
  mapCanvas: {
    width: "100%",
    height: "100%",
    background: "linear-gradient(135deg, #e8f5e2 0%, #d4edda 30%, #c8e6c9 60%, #dcedc8 100%)",
    position: "relative",
    overflow: "hidden",
  },
  mapPlaceholderText: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    textAlign: "center",
    color: "#334155",
    padding: 24,
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
