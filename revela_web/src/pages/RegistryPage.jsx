/**
 * RegistryPage.jsx
 * Business Registry — wired to /api/registry with upload, search, filter, pagination.
 */

import Papa from "papaparse";
import { useState, useEffect, useCallback, useContext } from "react";
import DashboardLayout from "../components/DashboardLayout";
import StatusBadge from "../components/StatusBadge";
import { AuthContext } from "../context/AuthContext";
import {
  getRegistryRequest,
  uploadRegistryFile,
  getBusinessByIdRequest,
  getBarangaysRequest,
} from "../services/api";

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icon = {
  Upload: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Filter: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Download: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  Eye: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Database: () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  AlertCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};


const STATUS_FILTERS = ["All Status", "Active", "Expired", "Revoked", "Pending"];
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const DEFAULT_PAGE_SIZE = 10;

// ── Status helpers ─────────────────────────────────────────────────────────────
function getStatusVariant(status) {
  return { Active: "green", Expired: "gold", Revoked: "red", Pending: "default" }[status] ?? "default";
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ hasFilters, onUpload }) {
  if (hasFilters) {
    return (
      <tr>
        <td colSpan={9} style={styles.emptyCell}>
          <div style={styles.emptyContent}>
            <span style={{ color: "var(--color-muted)", fontSize: 13 }}>
              No businesses match your current filters.
            </span>
          </div>
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td colSpan={9} style={{ ...styles.emptyCell, paddingTop: 64, paddingBottom: 64 }}>
        <div style={styles.emptyContent}>
          <div style={{ color: "var(--color-muted)", marginBottom: 16, opacity: 0.4 }}>
            <Icon.Database />
          </div>
          <p style={{ fontWeight: 700, fontSize: 15, color: "var(--color-ink)", marginBottom: 6 }}>
            No businesses in the registry yet
          </p>
          <p style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 20, maxWidth: 340 }}>
            Upload the official BPLO registry CSV or Excel file to get started.
            The system will geocode each entry automatically.
          </p>
          <button className="primary-btn" onClick={onUpload}>
            <Icon.Upload /> Upload Registry File
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose, onSuccess, token }) {
  const [dragging,   setDragging]   = useState(false);
  const [file,       setFile]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [summary,    setSummary]    = useState(null);  // result after upload
  const [error,      setError]      = useState("");

  const handleFile = (f) => {
    setError("");
    setSummary(null);
    const allowed = ["csv", "xlsx", "xls"];
    const ext     = f.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setError("Only CSV and Excel files are accepted (.csv, .xlsx, .xls)");
      return;
    }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const result = await uploadRegistryFile(file, token);
      setSummary(result);
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    if (summary) onSuccess();  // trigger table refresh
    onClose();
  };

  return (
    <div style={styles.modalBackdrop} onClick={!loading ? onClose : undefined}>
      <div style={styles.modalCard} onClick={e => e.stopPropagation()}>

        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>
            {summary ? "Upload Complete" : "Upload BPLO Registry"}
          </h3>
          {!loading && (
            <button style={styles.closeBtn} onClick={handleDone}>
              <Icon.X />
            </button>
          )}
        </div>

        {/* ── Success summary view ── */}
        {summary ? (
          <div>
            <div style={styles.summaryResult}>
              <div style={styles.summaryResultRow}>
                <span style={{ color: "var(--color-muted)" }}>Total rows in file</span>
                <strong>{summary.total_rows}</strong>
              </div>
              <div style={styles.summaryResultRow}>
                <span style={{ color: "var(--color-primary)" }}>Successfully inserted</span>
                <strong style={{ color: "var(--color-primary)" }}>{summary.inserted}</strong>
              </div>
              <div style={styles.summaryResultRow}>
                <span style={{ color: "var(--color-muted)" }}>Geocoded successfully</span>
                <strong>{summary.geocoded_ok}</strong>
              </div>
              <div style={styles.summaryResultRow}>
                <span style={{ color: "var(--color-gold-dark)" }}>Geocoding failed</span>
                <strong style={{ color: "var(--color-gold-dark)" }}>{summary.geocoded_failed}</strong>
              </div>
              <div style={styles.summaryResultRow}>
                <span style={{ color: "var(--color-muted)" }}>Skipped (duplicate / missing name)</span>
                <strong>{summary.skipped}</strong>
              </div>
            </div>

            {summary.errors?.length > 0 && (
              <div style={styles.errorList}>
                <p style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Skipped rows:</p>
                {summary.errors.slice(0, 5).map((e, i) => (
                  <p key={i} style={{ fontSize: 11, color: "var(--color-muted)", marginBottom: 2 }}>{e}</p>
                ))}
                {summary.errors.length > 5 && (
                  <p style={{ fontSize: 11, color: "var(--color-muted)" }}>
                    + {summary.errors.length - 5} more
                  </p>
                )}
              </div>
            )}

            <div style={styles.modalFooter}>
              <button className="primary-btn" onClick={handleDone}>
                <Icon.Check /> Done
              </button>
            </div>
          </div>

        ) : loading ? (
          /* ── Loading / processing view ── */
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
            <p style={{ fontWeight: 600, color: "var(--color-ink)", marginTop: 16 }}>
              Processing your file…
            </p>
            <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>
              Geocoding addresses via Google Maps API. This may take a minute.
            </p>
          </div>

        ) : (
          /* ── Upload form view ── */
          <>
            <p style={styles.modalSub}>
              Upload the official BPLO registry CSV or Excel file. The system
              will geocode each business address and seed the registry table.
            </p>

            {/* Drop zone */}
            <div
              style={{ ...styles.dropZone, ...(dragging ? styles.dropZoneActive : {}) }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            >
              <Icon.Upload />
              {file ? (
                <p style={{ color: "var(--color-primary)", fontWeight: 600, marginTop: 8 }}>
                  {file.name}
                </p>
              ) : (
                <>
                  <p style={{ fontWeight: 600, marginTop: 8, color: "var(--color-ink)" }}>
                    Drag &amp; drop your file here
                  </p>
                  <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>
                    or click to browse &nbsp;·&nbsp; CSV, XLSX, XLS accepted
                  </p>
                </>
              )}
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                style={styles.fileInput}
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>

            {/* Column hint */}
            <div style={styles.csvHint}>
              <strong>Expected columns (flexible naming):</strong>
              &nbsp; business_name, barangay, business_type, line_of_business,
              business_address, status, last_renewal_date
            </div>

            {error && (
              <div style={styles.errorBanner}>
                <Icon.AlertCircle /> &nbsp;{error}
              </div>
            )}

            <div style={styles.modalFooter}>
              <button className="ghost-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                className="primary-btn"
                disabled={!file}
                style={!file ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                onClick={handleSubmit}
              >
                <Icon.Upload /> Process File
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Business Detail Modal ─────────────────────────────────────────────────────
function BusinessDetailModal({ businessId, onClose, token }) {
  const [business, setBusiness] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    async function fetch() {
      try {
        const data = await getBusinessByIdRequest(businessId, token);
        setBusiness(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [businessId, token]);

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={{ ...styles.modalCard, width: 520 }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Business Details</h3>
          <button style={styles.closeBtn} onClick={onClose}><Icon.X /></button>
        </div>

        {loading && <p style={{ color: "var(--color-muted)", fontSize: 13 }}>Loading…</p>}
        {error   && <p style={{ color: "var(--color-danger)", fontSize: 13 }}>{error}</p>}

        {business && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["Business Name",    business.businessName],
              ["Business Type",    business.businessType    || "—"],
              ["Line of Business", business.lineOfBusiness  || "—"],
              ["Address",          business.businessAddress || "—"],
              ["Barangay",         business.barangayName    || "—"],
              ["Status",           business.applicationStatus],
              ["Last Renewal",     business.lastRenewalDate ? business.lastRenewalDate.slice(0, 10) : "—"],
              ["Coordinates",      business.latitude ? `${business.latitude}, ${business.longitude}` : "Not geocoded"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", gap: 12 }}>
                <span style={{ minWidth: 140, fontSize: 12, color: "var(--color-muted)", fontWeight: 500 }}>
                  {label}
                </span>
                <span style={{ fontSize: 13, color: "var(--color-ink)", fontWeight: label === "Business Name" ? 600 : 400 }}>
                  {label === "Status"
                    ? <StatusBadge variant={getStatusVariant(value)}>{value}</StatusBadge>
                    : value}
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ ...styles.modalFooter, marginTop: 24 }}>
          <button className="ghost-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RegistryPage() {
  const { token, user } = useContext(AuthContext);

  const [businesses,    setBusinesses]    = useState([]);
  const [total,         setTotal]         = useState(0);
  const [totalPages,    setTotalPages]    = useState(1);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");

  const [search,        setSearch]        = useState("");
  const [barangay,      setBarangay]      = useState("All Barangays");
  const [status,        setStatus]        = useState("All Status");
  const [page,          setPage]          = useState(1);
  const [pageSize,      setPageSize]      = useState(DEFAULT_PAGE_SIZE);

  const [showUpload,    setShowUpload]    = useState(false);
  const [detailId,      setDetailId]      = useState(null);

  // Dynamic barangay list loaded from API
  const [barangays,     setBarangays]     = useState([]);
  useEffect(() => {
    async function loadBarangays() {
      try {
        const data = await getBarangaysRequest(token);
        setBarangays(data);
      } catch (err) {
        console.error("Failed to load barangays", err);
      }
    }
    loadBarangays();
  }, [token]);

  // Debounced search — wait 400ms after typing before firing the request
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch businesses ──────────────────────────────────────────────────────
  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: pageSize };
      if (debouncedSearch)                         params.search     = debouncedSearch;
      if (barangay !== "All Barangays")            params.barangayID = barangay; // sends ID
      if (status   !== "All Status")               params.status     = status;

      const result = await getRegistryRequest(params, token);
      setBusinesses(result.data   ?? []);
      setTotal(result.total       ?? 0);
      setTotalPages(Math.max(1, result.pages ?? Math.ceil((result.total ?? 0) / pageSize)));
    } catch (err) {
      setError(err.message || "Failed to load registry.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, barangay, status, pageSize, token]);

  // ── Export CSV Handler ───────────────────────────────────────────────────
  const handleExport = async () => {
    setLoading(true);
    try {
      // 1. Fetch data from the existing Python API 
      // We set limit to 10000 to bypass the 10-row page limit
      const result = await getRegistryRequest({ 
        limit: 10000, 
        status: status !== "All Status" ? status : undefined,
        barangayID: barangay !== "All Barangays" ? barangay : undefined,
        search: debouncedSearch
      }, token);

      // 2. Convert the JSON results to CSV
      const csv = Papa.unparse(result.data);

      // 3. Download the file to the browser
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `REVELA_Registry_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed:", err);
      setError("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Reset page to 1 whenever filters change (search, barangay, status, pageSize)
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, barangay, status, pageSize]);

  // Fetch whenever page or filters change
  useEffect(() => {
    if (!token) return;
    fetchBusinesses();
  }, [fetchBusinesses, token]);

  // ── Summary counts (derived from the full total, not just current page) ───
  // These come from a dedicated summary endpoint in later sprints.
  // For now we show the total returned.
  const hasFilters = debouncedSearch || barangay !== "All Barangays" || status !== "All Status";

  return (
    <DashboardLayout user={{ initials: user?.fullName?.charAt(0) ?? "?", name: user?.fullName ?? "" }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Business Registry</h1>
          <p className="page-subtitle">Official BPLO-registered establishments in Mataasnakahoy.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button 
            className="ghost-btn" 
            onClick={handleExport} 
            disabled={loading}
          >
            <Icon.Download /> {loading ? "Exporting..." : "Export CSV"}
          </button>
          {user?.role === "Admin" && (
            <button className="primary-btn" onClick={() => setShowUpload(true)}>
              <Icon.Upload /> Upload File
            </button>
          )}
        </div>
      </div>

      {/* Summary Strip */}
      <div style={styles.summaryStrip}>
        {[
          { label: "Total Businesses", value: loading ? "—" : total,                            color: "var(--color-ink)" },
          { label: "Showing",          value: loading ? "—" : businesses.length,                color: "var(--color-primary)" },
          { label: "Current Page",     value: loading ? "—" : `${page} / ${totalPages}`,        color: "var(--color-muted)" },
          { label: "Page Size",        value: loading ? "—" : pageSize,                              color: "var(--color-muted)" },
        ].map(s => (
          <div key={s.label} className="frosted-glass saas-card" style={styles.summaryCard}>
            <span style={{ ...styles.summaryValue, color: s.color }}>{s.value}</span>
            <span style={styles.summaryLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner}>
          <Icon.AlertCircle /> &nbsp;{error}
        </div>
      )}

      {/* Filters Bar */}
      <div className="frosted-glass saas-card" style={styles.filtersBar}>
        <div className="search-bar" style={{ width: 280 }}>
          <Icon.Search />
          <input
            type="text"
            placeholder="Search name, type, address…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginLeft: "auto", alignItems: "center" }}>
          <Icon.Filter />

          <select
            style={styles.select}
            value={barangay}
            onChange={e => setBarangay(e.target.value)}
          >
            <option value="All Barangays">All Barangays</option>
            {barangays.map(b => (
              <option key={b.barangayID} value={b.barangayID}>
                {b.barangayName}
              </option>
            ))}
          </select>

          <select
            style={styles.select}
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {STATUS_FILTERS.map(s => <option key={s}>{s}</option>)}
          </select>

          <label style={styles.pageSizeLabel}>
            Rows
            <select
              style={{ ...styles.select, width: 120 }}
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{`${size} per page`}</option>
              ))}
            </select>
          </label>

          <span style={styles.resultCount}>
            {loading ? "Loading…" : `${total} result${total !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {/* Data Table */}
      <div className="frosted-glass saas-card" style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                {["ID", "Business Name", "Type", "Barangay", "Address", "Last Renewal", "Status", ""].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={styles.emptyCell}>
                    <div style={styles.emptyContent}>
                      <span style={{ color: "var(--color-muted)", fontSize: 13 }}>Loading registry…</span>
                    </div>
                  </td>
                </tr>
              ) : businesses.length === 0 ? (
                <EmptyState hasFilters={!!hasFilters} onUpload={() => setShowUpload(true)} />
              ) : (
                businesses.map((b, i) => (
                  <tr
                    key={b.businessID}
                    style={{ ...styles.tr, background: i % 2 === 0 ? "rgba(255,255,255,0.5)" : "transparent" }}
                  >
                    <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 12, color: "var(--color-muted)" }}>
                      #{b.businessID}
                    </td>
                    <td style={{ ...styles.td, fontWeight: 600, color: "var(--color-ink)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {b.businessName}
                    </td>
                    <td style={styles.td}>{b.businessType || "—"}</td>
                    <td style={styles.td}>{b.barangayName || "—"}</td>
                    <td style={{ ...styles.td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {b.businessAddress || "—"}
                    </td>
                    <td style={{ ...styles.td, fontSize: 12 }}>
                      {b.lastRenewalDate ? b.lastRenewalDate.slice(0, 10) : "—"}
                    </td>
                    <td style={styles.td}>
                      <StatusBadge variant={getStatusVariant(b.applicationStatus)}>
                        {b.applicationStatus}
                      </StatusBadge>
                    </td>
                    <td style={styles.td}>
                      <button
                        className="action-btn"
                        style={styles.viewBtn}
                        onClick={() => setDetailId(b.businessID)}
                      >
                        <Icon.Eye /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && businesses.length > 0 && (
          <div style={styles.pagination}>
            <span style={styles.pageInfo}>
              Page {page} of {totalPages} &nbsp;·&nbsp; {total} total entries
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                style={styles.pageBtn}
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <Icon.ChevronLeft /> Prev
              </button>

              {/* Show max 5 page buttons to avoid overflow */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                .reduce((acc, n, idx, arr) => {
                  if (idx > 0 && arr[idx - 1] !== n - 1) {
                    acc.push(
                      <button key={`gap-${n}`} style={{ ...styles.pageBtn, cursor: "default" }} disabled>…</button>
                    );
                  }
                  acc.push(
                    <button
                      key={`page-${n}`}
                      style={{ ...styles.pageBtn, ...(n === page ? styles.pageBtnActive : {}) }}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  );
                  return acc;
                }, [])}

              <button
                style={styles.pageBtn}
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next <Icon.ChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="saas-footer frosted-glass">
        <p>&copy; 2026 Municipality of Mataasnakahoy. All Rights Reserved.</p>
        <p className="footer-links"><span>BPLO Portal</span> • <span>System Settings</span></p>
      </footer>

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          token={token}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { fetchBusinesses(); setShowUpload(false); }}
        />
      )}

      {/* Business Detail Modal */}
      {detailId && (
        <BusinessDetailModal
          businessId={detailId}
          token={token}
          onClose={() => setDetailId(null)}
        />
      )}

    </DashboardLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  summaryStrip: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  summaryCard:  { display: "flex", flexDirection: "column", gap: 4, padding: "18px 24px", borderRadius: "var(--radius-lg)" },
  summaryValue: { fontSize: 28, fontWeight: 800, lineHeight: 1 },
  summaryLabel: { fontSize: 12, color: "var(--color-muted)", fontWeight: 500 },
  filtersBar:   { display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderRadius: "var(--radius-lg)" },
  select: {
    background: "rgba(248,249,250,0.8)", border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)", padding: "8px 12px", fontSize: 13,
    color: "var(--color-ink)", fontFamily: "var(--font-base)", cursor: "pointer", outline: "none",
  },
  resultCount: { fontSize: 12, color: "var(--color-muted)", fontWeight: 500, whiteSpace: "nowrap" },
  table:        { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  thead:        { background: "rgba(248,249,250,0.9)", borderBottom: "1px solid var(--color-border)" },
  th: {
    padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700,
    color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap",
  },
  tr:           { borderBottom: "1px solid rgba(226,232,240,0.4)", transition: "background 0.15s" },
  td:           { padding: "13px 16px", color: "var(--color-muted)", whiteSpace: "nowrap" },
  emptyCell:    { padding: "48px 16px", textAlign: "center", color: "var(--color-muted)", fontSize: 14 },
  emptyContent: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  viewBtn:      { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 },
  pagination:   { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid var(--color-border-soft)" },
  pageInfo:     { fontSize: 12, color: "var(--color-muted)" },
  pageBtn: {
    minWidth: 32, height: 32, padding: "0 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)",
    background: "#fff", color: "var(--color-muted)", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 6, fontSize: 13, fontWeight: 600, fontFamily: "var(--font-base)", transition: "all 0.15s",
  },
  pageBtnActive: { background: "var(--color-primary)", color: "#fff", border: "1px solid var(--color-primary)" },
  pageSizeLabel: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-muted)", cursor: "default" },
  // Modal
  modalBackdrop: {
    position: "fixed", inset: 0, background: "rgba(26,32,44,0.4)",
    backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
  },
  modalCard: { background: "#fff", borderRadius: "var(--radius-xl)", padding: 32, width: 480, boxShadow: "0 25px 50px rgba(0,0,0,0.15)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: 700, color: "var(--color-ink)" },
  closeBtn: { background: "none", border: "none", color: "var(--color-muted)", cursor: "pointer", display: "flex", alignItems: "center" },
  modalSub: { fontSize: 13, color: "var(--color-muted)", lineHeight: 1.6, marginBottom: 24 },
  dropZone: {
    border: "2px dashed var(--color-border)", borderRadius: "var(--radius-lg)", padding: "32px 24px",
    textAlign: "center", cursor: "pointer", position: "relative", transition: "all 0.2s", marginBottom: 16,
  },
  dropZoneActive: { borderColor: "var(--color-primary)", background: "var(--color-primary-light)" },
  fileInput: { position: "absolute", inset: 0, opacity: 0, cursor: "pointer" },
  csvHint: {
    background: "rgba(248,249,250,0.8)", border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 12,
    color: "var(--color-muted)", marginBottom: 16, lineHeight: 1.6,
  },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 },
  summaryResult: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 20, padding: "16px", background: "rgba(248,249,250,0.8)", borderRadius: "var(--radius-lg)" },
  summaryResultRow: { display: "flex", justifyContent: "space-between", fontSize: 13 },
  errorList: { background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 16 },
  errorBanner: {
    display: "flex", alignItems: "center", gap: 8, background: "#fff5f5",
    border: "1px solid #fed7d7", borderRadius: "var(--radius-sm)", padding: "10px 14px",
    fontSize: 13, color: "var(--color-danger)", marginBottom: 4,
  },
  loadingState: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "40px 0", textAlign: "center",
  },
  spinner: {
    width: 36, height: 36,
    border: "3px solid var(--color-border)",
    borderTopColor: "var(--color-primary)",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
};
