/**
 * RegistryPage.jsx
 * Business Registry — searchable, filterable data table.
 * All layout handled by DashboardLayout. All styling via global.css.
 */

import { useState, useMemo } from "react";
import DashboardLayout from "../components/DashboardLayout";
import StatusBadge from "../components/StatusBadge";

// ── Icons (inline SVGs kept as tiny components to avoid an icon lib dep) ──
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
};

// ── Realistic mock data ───────────────────────────────────────────────────
const ALL_BUSINESSES = [
  { id: "MNK-0001", name: "Dela Cruz Sari-Sari Store",   type: "Sari-Sari Store",  barangay: "Poblacion I",    owner: "Maria Dela Cruz",   status: "registered",   permit: "2026-01-15", expiry: "2026-12-31" },
  { id: "MNK-0002", name: "Reyes Hardware & Construction",type: "Hardware",         barangay: "Kinalaglagan",   owner: "Jose Reyes",         status: "registered",   permit: "2026-02-03", expiry: "2026-12-31" },
  { id: "MNK-0003", name: "Nangkaan Carinderia",          type: "Carinderia",       barangay: "Nangkaan",       owner: "Lourdes Santos",     status: "expired",      permit: "2025-01-10", expiry: "2025-12-31" },
  { id: "MNK-0004", name: "Santos Vulcanizing Shop",      type: "Vulcanizing",      barangay: "Poblacion II",   owner: "Pedro Santos",       status: "registered",   permit: "2026-01-20", expiry: "2026-12-31" },
  { id: "MNK-0005", name: "Unknown Eatery (Flagged)",     type: "Carinderia",       barangay: "Poblacion I",    owner: "Unknown",            status: "unregistered", permit: "—",          expiry: "—"          },
  { id: "MNK-0006", name: "Mataasnakahoy Bakery",         type: "Bakery",           barangay: "Luta Norte",     owner: "Angelica Ramos",     status: "registered",   permit: "2026-03-01", expiry: "2026-12-31" },
  { id: "MNK-0007", name: "Bautista Billiard Hall",       type: "Recreation",       barangay: "Kinalaglagan",   owner: "Ramon Bautista",     status: "expired",      permit: "2024-12-01", expiry: "2025-12-31" },
  { id: "MNK-0008", name: "JM General Merchandise",       type: "General Store",    barangay: "Nangkaan",       owner: "Joel Mercado",       status: "registered",   permit: "2026-01-05", expiry: "2026-12-31" },
  { id: "MNK-0009", name: "Unregistered Piggery (Flag)",  type: "Livestock",        barangay: "Bts. Aplaya",    owner: "Unknown",            status: "unregistered", permit: "—",          expiry: "—"          },
  { id: "MNK-0010", name: "Flores Pharmacy",              type: "Pharmacy",         barangay: "Poblacion I",    owner: "Dr. Carina Flores",  status: "registered",   permit: "2026-02-14", expiry: "2026-12-31" },
  { id: "MNK-0011", name: "Gonzales Rice Trading",        type: "Rice Trading",     barangay: "Luta Sur",       owner: "Ernesto Gonzales",   status: "registered",   permit: "2026-01-28", expiry: "2026-12-31" },
  { id: "MNK-0012", name: "Suspect Welding Shop",         type: "Welding",          barangay: "Poblacion II",   owner: "Unknown",            status: "unregistered", permit: "—",          expiry: "—"          },
  { id: "MNK-0013", name: "Cruz Motor Parts",             type: "Auto Parts",       barangay: "Kinalaglagan",   owner: "Benito Cruz",        status: "registered",   permit: "2026-03-11", expiry: "2026-12-31" },
  { id: "MNK-0014", name: "Aling Nena's Tindahan",        type: "Sari-Sari Store",  barangay: "Nangkaan",       owner: "Nena Aquino",        status: "expired",      permit: "2025-06-01", expiry: "2025-12-31" },
  { id: "MNK-0015", name: "Mataasnakahoy Feeds & Supply", type: "Agricultural",     barangay: "Luta Norte",     owner: "Victor Villanueva",  status: "registered",   permit: "2026-01-09", expiry: "2026-12-31" },
  { id: "MNK-0016", name: "Sta. Maria Internet Café",     type: "Internet Café",    barangay: "Poblacion I",    owner: "Sta. Maria Corp.",   status: "registered",   permit: "2026-02-22", expiry: "2026-12-31" },
  { id: "MNK-0017", name: "Unknown Welding (Flagged)",    type: "Welding",          barangay: "Luta Sur",       owner: "Unknown",            status: "unregistered", permit: "—",          expiry: "—"          },
  { id: "MNK-0018", name: "Laguna de Mataasnakahoy Inn",  type: "Lodging",          barangay: "Bts. Aplaya",    owner: "Rosa Laguna",        status: "registered",   permit: "2026-01-30", expiry: "2026-12-31" },
];

const BARANGAYS = ["All Barangays", "Poblacion I", "Poblacion II", "Kinalaglagan", "Nangkaan", "Luta Norte", "Luta Sur", "Bts. Aplaya"];
const STATUSES  = ["All Status", "registered", "expired", "unregistered"];
const PAGE_SIZE = 8;

// ── Status badge config ───────────────────────────────────────────────────
function getStatusVariant(status) {
  return { registered: "green", expired: "gold", unregistered: "red" }[status] ?? "default";
}
function getStatusLabel(status) {
  return { registered: "Registered", expired: "Expired", unregistered: "Unregistered" }[status] ?? status;
}

// ── Upload CSV Modal ──────────────────────────────────────────────────────
function UploadModal({ onClose }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Upload BPLO Registry CSV</h3>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <p style={styles.modalSub}>
          Upload the official BPLO registry CSV file. The system will geocode each entry
          and cross-reference it against the Google Maps dataset.
        </p>

        {/* Drop zone */}
        <div
          style={{ ...styles.dropZone, ...(dragging ? styles.dropZoneActive : {}) }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); setFile(e.dataTransfer.files[0]); }}
        >
          <Icon.Upload />
          {file
            ? <p style={{ color: "var(--color-primary)", fontWeight: 600, marginTop: 8 }}>{file.name}</p>
            : <>
                <p style={{ fontWeight: 600, marginTop: 8, color: "var(--color-ink)" }}>Drag & drop your CSV here</p>
                <p style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>or click to browse</p>
              </>
          }
          <input
            type="file" accept=".csv"
            style={styles.fileInput}
            onChange={e => setFile(e.target.files[0])}
          />
        </div>

        <div style={styles.csvHint}>
          <strong>Required columns:</strong> business_name, owner, type, barangay, permit_no, issue_date, expiry_date
        </div>

        <div style={styles.modalFooter}>
          <button className="ghost-btn" onClick={onClose}>Cancel</button>
          <button
            className="primary-btn"
            disabled={!file}
            style={!file ? { opacity: 0.5, cursor: "not-allowed" } : {}}
          >
            <Icon.Upload /> Process CSV
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function RegistryPage() {
  const [search,   setSearch]   = useState("");
  const [barangay, setBarangay] = useState("All Barangays");
  const [status,   setStatus]   = useState("All Status");
  const [page,     setPage]     = useState(1);
  const [showModal,setShowModal]= useState(false);

  // Filter & search
  const filtered = useMemo(() => {
    return ALL_BUSINESSES.filter(b => {
      const matchSearch   = b.name.toLowerCase().includes(search.toLowerCase()) ||
                            b.owner.toLowerCase().includes(search.toLowerCase()) ||
                            b.id.toLowerCase().includes(search.toLowerCase());
      const matchBarangay = barangay === "All Barangays" || b.barangay === barangay;
      const matchStatus   = status   === "All Status"    || b.status   === status;
      return matchSearch && matchBarangay && matchStatus;
    });
  }, [search, barangay, status]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = () => setPage(1);

  // Summary counts
  const counts = useMemo(() => ({
    total:        ALL_BUSINESSES.length,
    registered:   ALL_BUSINESSES.filter(b => b.status === "registered").length,
    expired:      ALL_BUSINESSES.filter(b => b.status === "expired").length,
    unregistered: ALL_BUSINESSES.filter(b => b.status === "unregistered").length,
  }), []);

  return (
    <DashboardLayout user={{ initials: "JD", name: "J. Dela Cruz" }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Business Registry</h1>
          <p className="page-subtitle">Official BPLO-registered establishments in Mataasnakahoy.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="ghost-btn"><Icon.Download /> Export CSV</button>
          <button className="primary-btn" onClick={() => setShowModal(true)}>
            <Icon.Upload /> Upload CSV
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div style={styles.summaryStrip}>
        {[
          { label: "Total Businesses",  value: counts.total,        color: "var(--color-ink)" },
          { label: "Registered",        value: counts.registered,   color: "var(--color-primary)" },
          { label: "Expired Permits",   value: counts.expired,      color: "var(--color-gold-dark)" },
          { label: "Unregistered",      value: counts.unregistered, color: "var(--color-danger)" },
        ].map(s => (
          <div key={s.label} className="frosted-glass saas-card" style={styles.summaryCard}>
            <span style={{ ...styles.summaryValue, color: s.color }}>{s.value}</span>
            <span style={styles.summaryLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="frosted-glass saas-card" style={styles.filtersBar}>
        {/* Search */}
        <div className="search-bar" style={{ width: 280 }}>
          <Icon.Search />
          <input
            type="text"
            placeholder="Search name, owner, ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage(); }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginLeft: "auto", alignItems: "center" }}>
          <Icon.Filter />

          {/* Barangay filter */}
          <select
            style={styles.select}
            value={barangay}
            onChange={e => { setBarangay(e.target.value); resetPage(); }}
          >
            {BARANGAYS.map(b => <option key={b}>{b}</option>)}
          </select>

          {/* Status filter */}
          <select
            style={styles.select}
            value={status}
            onChange={e => { setStatus(e.target.value); resetPage(); }}
          >
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>

          <span style={styles.resultCount}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Data Table */}
      <div className="frosted-glass saas-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                {["Permit ID", "Business Name", "Type", "Barangay", "Owner", "Issue Date", "Expiry", "Status", ""].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} style={styles.emptyCell}>
                    No businesses match your current filters.
                  </td>
                </tr>
              ) : paginated.map((b, i) => (
                <tr key={b.id} style={{ ...styles.tr, background: i % 2 === 0 ? "rgba(255,255,255,0.5)" : "transparent" }}>
                  <td style={{ ...styles.td, fontFamily: "monospace", fontSize: 12, color: "var(--color-muted)" }}>{b.id}</td>
                  <td style={{ ...styles.td, fontWeight: 600, color: "var(--color-ink)" }}>{b.name}</td>
                  <td style={styles.td}>{b.type}</td>
                  <td style={styles.td}>{b.barangay}</td>
                  <td style={styles.td}>{b.owner}</td>
                  <td style={{ ...styles.td, fontSize: 12 }}>{b.permit}</td>
                  <td style={{ ...styles.td, fontSize: 12, color: b.status === "expired" ? "var(--color-gold-dark)" : "inherit" }}>
                    {b.expiry}
                  </td>
                  <td style={styles.td}>
                    <StatusBadge variant={getStatusVariant(b.status)}>
                      {getStatusLabel(b.status)}
                    </StatusBadge>
                  </td>
                  <td style={styles.td}>
                    <button className="action-btn" style={styles.viewBtn}>
                      <Icon.Eye /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={styles.pagination}>
          <span style={styles.pageInfo}>
            Page {page} of {totalPages || 1} &nbsp;·&nbsp; {filtered.length} entries
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              style={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <Icon.ChevronLeft />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                style={{ ...styles.pageBtn, ...(n === page ? styles.pageBtnActive : {}) }}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              style={styles.pageBtn}
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage(p => p + 1)}
            >
              <Icon.ChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="saas-footer frosted-glass">
        <p>&copy; 2026 Municipality of Mataasnakahoy. All Rights Reserved.</p>
        <p className="footer-links"><span>BPLO Portal</span> • <span>System Settings</span></p>
      </footer>

      {/* Upload Modal */}
      {showModal && <UploadModal onClose={() => setShowModal(false)} />}

    </DashboardLayout>
  );
}

// ── Scoped styles object (no new CSS file needed — layout specific values only) ──
const styles = {
  summaryStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
  },
  summaryCard: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "18px 24px",
    borderRadius: "var(--radius-lg)",
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 800,
    lineHeight: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: "var(--color-muted)",
    fontWeight: 500,
  },
  filtersBar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 20px",
    borderRadius: "var(--radius-lg)",
  },
  select: {
    background: "rgba(248,249,250,0.8)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "8px 12px",
    fontSize: 13,
    color: "var(--color-ink)",
    fontFamily: "var(--font-base)",
    cursor: "pointer",
    outline: "none",
  },
  resultCount: {
    fontSize: 12,
    color: "var(--color-muted)",
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  thead: {
    background: "rgba(248,249,250,0.9)",
    borderBottom: "1px solid var(--color-border)",
  },
  th: {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--color-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid rgba(226,232,240,0.4)",
    transition: "background 0.15s",
  },
  td: {
    padding: "13px 16px",
    color: "var(--color-muted)",
    whiteSpace: "nowrap",
  },
  emptyCell: {
    padding: "48px 16px",
    textAlign: "center",
    color: "var(--color-muted)",
    fontSize: 14,
  },
  viewBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 20px",
    borderTop: "1px solid var(--color-border-soft)",
  },
  pageInfo: {
    fontSize: 12,
    color: "var(--color-muted)",
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    background: "#fff",
    color: "var(--color-muted)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "var(--font-base)",
    transition: "all 0.15s",
  },
  pageBtnActive: {
    background: "var(--color-primary)",
    color: "#fff",
    border: "1px solid var(--color-primary)",
  },
  // Modal
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(26,32,44,0.4)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  modalCard: {
    background: "#fff",
    borderRadius: "var(--radius-xl)",
    padding: 32,
    width: 480,
    boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "var(--color-ink)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 16,
    color: "var(--color-muted)",
    cursor: "pointer",
  },
  modalSub: {
    fontSize: 13,
    color: "var(--color-muted)",
    lineHeight: 1.6,
    marginBottom: 24,
  },
  dropZone: {
    border: "2px dashed var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "32px 24px",
    textAlign: "center",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.2s",
    marginBottom: 16,
  },
  dropZoneActive: {
    borderColor: "var(--color-primary)",
    background: "var(--color-primary-light)",
  },
  fileInput: {
    position: "absolute",
    inset: 0,
    opacity: 0,
    cursor: "pointer",
  },
  csvHint: {
    background: "rgba(248,249,250,0.8)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 14px",
    fontSize: 12,
    color: "var(--color-muted)",
    marginBottom: 24,
    lineHeight: 1.6,
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
};
