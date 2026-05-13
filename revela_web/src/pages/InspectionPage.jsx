/**
 * InspectionPage.jsx
 * Wired to /api/inspections — admin kanban + assign modal + verify action.
 * Inspectors only see their own tasks via the same page (role-gated views).
 */

import { useState, useEffect, useCallback, useContext } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { AuthContext } from "../context/AuthContext";
import {
  getInspectionsRequest,
  getInspectorTasksRequest,
  assignInspectionRequest,
  verifyInspectionRequest,
} from "../services/api";

// ── Icons ──────────────────────────────────────────────────────────────────────
const Icon = {
  MapPin: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="10" r="3"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    </svg>
  ),
  User: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Check: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  X: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  AlertCircle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Send: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Clock: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  RefreshCw: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  Flag: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  ),
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
};

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_COLS = ["Assigned", "Reassigned", "Submitted", "Verified"];

const FLAG_COLOR = {
  Red:    { bg: "var(--color-danger-light)",  text: "var(--color-danger)" },
  Yellow: { bg: "var(--color-gold-light)",    text: "var(--color-gold-dark)" },
  Green:  { bg: "var(--color-primary-light)", text: "var(--color-primary)" },
  Black:  { bg: "#1e1e1e22",                  text: "#1a1a1a" },
};

const STATUS_COLOR = {
  Assigned:   { bg: "#eff6ff", text: "#3b82f6" },
  Reassigned: { bg: "#fefce8", text: "#ca8a04" },
  Submitted:  { bg: "#f0fdf4", text: "#16a34a" },
  Verified:   { bg: "#f8fafc", text: "#64748b" },
};

// ── Assign Modal ───────────────────────────────────────────────────────────────
function AssignModal({ report, token, onClose, onSuccess }) {
  const [inspectors, setInspectors] = useState([]);
  const [selectedUID, setSelectedUID] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch inspectors from users endpoint
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
      await assignInspectionRequest(
        { logID: report.logID, userID: parseInt(selectedUID, 10) },
        token
      );
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Assignment failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.backdrop} onClick={!loading ? onClose : undefined}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Assign Inspector</h3>
          {!loading && <button style={s.closeBtn} onClick={onClose}><Icon.X /></button>}
        </div>

        <div style={s.flagPreview}>
          <span style={{
            ...s.flagPill,
            background: FLAG_COLOR[report.flagColor]?.bg,
            color: FLAG_COLOR[report.flagColor]?.text,
          }}>{report.flagColor}</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: "var(--color-ink)", marginBottom: 2 }}>
              {report.detectedName}
            </p>
            <p style={{ fontSize: 12, color: "var(--color-muted)" }}>
              {report.barangayName} · Log #{report.logID}
            </p>
          </div>
        </div>

        {error && (
          <div style={s.errorBanner}><Icon.AlertCircle /> &nbsp;{error}</div>
        )}

        <label style={s.fieldLabel}>Select Inspector</label>
        {fetching ? (
          <p style={{ fontSize: 13, color: "var(--color-muted)" }}>Loading inspectors…</p>
        ) : (
          <select
            style={s.fieldSelect}
            value={selectedUID}
            onChange={e => setSelectedUID(e.target.value)}
          >
            <option value="">Choose an inspector…</option>
            {inspectors.map(u => (
              <option key={u.userID} value={u.userID}>{u.fullName}</option>
            ))}
          </select>
        )}

        <div style={s.modalFooter}>
          <button className="ghost-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="primary-btn" onClick={handleAssign} disabled={loading || fetching}>
            {loading ? "Assigning…" : <><Icon.Send /> Dispatch</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Verify Modal ───────────────────────────────────────────────────────────────
function VerifyModal({ report, token, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleVerify = async () => {
    setLoading(true);
    setError("");
    try {
      await verifyInspectionRequest(report.reportID, token);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.backdrop} onClick={!loading ? onClose : undefined}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Verify Inspection</h3>
          {!loading && <button style={s.closeBtn} onClick={onClose}><Icon.X /></button>}
        </div>

        <div style={s.flagPreview}>
          <span style={{
            ...s.flagPill,
            background: FLAG_COLOR[report.inspectionResult]?.bg ?? "#f1f5f9",
            color: FLAG_COLOR[report.inspectionResult]?.text ?? "#64748b",
          }}>{report.inspectionResult ?? "No result"}</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: "var(--color-ink)", marginBottom: 2 }}>
              {report.detectedName}
            </p>
            <p style={{ fontSize: 12, color: "var(--color-muted)" }}>
              Inspector: {report.inspectorName} · Report #{report.reportID}
            </p>
          </div>
        </div>

        {report.remarks && (
          <div style={s.remarksBox}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted)", marginBottom: 4, textTransform: "uppercase" }}>
              Inspector Notes
            </p>
            <p style={{ fontSize: 13, color: "var(--color-ink)", lineHeight: 1.6 }}>{report.remarks}</p>
          </div>
        )}

        {report.resolutionTime && (
          <p style={{ fontSize: 12, color: "var(--color-muted)", marginBottom: 16, display: "flex", alignItems: "center", gap: 5 }}>
            <Icon.Clock /> Resolved in {report.resolutionTime} min
          </p>
        )}

        {error && (
          <div style={s.errorBanner}><Icon.AlertCircle /> &nbsp;{error}</div>
        )}

        <p style={{ fontSize: 13, color: "var(--color-ink)", marginBottom: 20, lineHeight: 1.6 }}>
          Confirming will update the flag color to&nbsp;
          <strong>{report.inspectionResult}</strong> on the map.
          This action cannot be undone.
        </p>

        <div style={s.modalFooter}>
          <button className="ghost-btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="primary-btn" onClick={handleVerify} disabled={loading}>
            {loading ? "Verifying…" : <><Icon.Check /> Confirm & Verify</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inspection Card ────────────────────────────────────────────────────────────
function InspectionCard({ report, isAdmin, onAssign, onVerify }) {
  const flagMeta   = FLAG_COLOR[report.flagColor]   ?? FLAG_COLOR.Red;
  const statusMeta = STATUS_COLOR[report.verificationStatus] ?? STATUS_COLOR.Assigned;

  return (
    <div style={s.card}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ ...s.flagPill, background: flagMeta.bg, color: flagMeta.text }}>
          <Icon.Flag /> {report.flagColor}
        </span>
        <span style={{ fontSize: 11, color: "var(--color-muted)", fontWeight: 600 }}>
          #{report.reportID ?? report.logID}
        </span>
      </div>

      {/* Business name */}
      <p style={s.cardName}>{report.detectedName}</p>
      <p style={s.cardMeta}>
        <Icon.MapPin /> {report.barangayName ?? "Unknown barangay"}
      </p>

      {/* Inspector */}
      <div style={s.cardInspector}>
        <div style={{
          ...s.avatar,
          background: report.inspectorName ? "var(--color-primary)" : "var(--color-border)",
        }}>
          {report.inspectorName ? report.inspectorName.charAt(0).toUpperCase() : "?"}
        </div>
        <span style={{ fontSize: 12, color: report.inspectorName ? "var(--color-ink)" : "var(--color-muted)", fontWeight: 600 }}>
          {report.inspectorName ?? "Unassigned"}
        </span>
        <span style={{ ...s.statusPill, background: statusMeta.bg, color: statusMeta.text, marginLeft: "auto" }}>
          {report.verificationStatus}
        </span>
      </div>

      {/* Remarks preview */}
      {report.remarks && (
        <p style={s.remarksPreview}>"{report.remarks}"</p>
      )}

      {/* Resolution time */}
      {report.resolutionTime && (
        <p style={{ fontSize: 11, color: "var(--color-muted)", display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
          <Icon.Clock /> {report.resolutionTime} min
        </p>
      )}

      {/* Actions */}
      {isAdmin && (
        <div style={s.cardActions}>
          {report.verificationStatus === "Assigned" && (
            <button className="ghost-btn" style={{ fontSize: 12, padding: "7px 12px" }}
              onClick={() => onAssign(report)}>
              Reassign
            </button>
          )}
          {report.verificationStatus === "Submitted" && (
            <button className="primary-btn" style={{ fontSize: 12, padding: "7px 14px" }}
              onClick={() => onVerify(report)}>
              <Icon.Check /> Verify
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Column ─────────────────────────────────────────────────────────────────────
function KanbanColumn({ status, reports, isAdmin, onAssign, onVerify }) {
  const statusMeta = STATUS_COLOR[status] ?? STATUS_COLOR.Assigned;
  return (
    <div style={s.column}>
      <div style={s.columnHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusMeta.text }} />
          <span style={s.columnTitle}>{status}</span>
        </div>
        <span style={{ ...s.statusPill, background: statusMeta.bg, color: statusMeta.text }}>
          {reports.length}
        </span>
      </div>
      <div style={s.columnBody}>
        {reports.length === 0 ? (
          <div style={s.emptyCol}>No reports</div>
        ) : reports.map(r => (
          <InspectionCard
            key={r.reportID ?? `log-${r.logID}`}
            report={r}
            isAdmin={isAdmin}
            onAssign={onAssign}
            onVerify={onVerify}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function InspectionPage() {
  const { token, user } = useContext(AuthContext);
  const isAdmin = ["Admin", "SUPER_ADMIN", "System Administrator"].includes(user?.role);

  const [reports,  setReports]  = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  // Modal state
  const [assignTarget, setAssignTarget] = useState(null);
  const [verifyTarget, setVerifyTarget] = useState(null);

  // Filter state (admin only)
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      let result;
      if (isAdmin) {
        result = await getInspectionsRequest(
          { status: filterStatus || undefined, limit: 100 },
          token
        );
        setReports(result.data ?? []);
        setTotal(result.total ?? 0);
      } else {
        result = await getInspectorTasksRequest(token);
        setReports(result.data ?? []);
        setTotal(result.total ?? 0);
      }
    } catch (err) {
      setError(err.message || "Failed to load inspections.");
    } finally {
      setLoading(false);
    }
  }, [token, isAdmin, filterStatus]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const byStatus = (status) => reports.filter(r => r.verificationStatus === status);

  // Admin sees all 4 columns; inspectors only see Assigned + Reassigned
  const visibleCols = isAdmin
    ? STATUS_COLS
    : ["Assigned", "Reassigned"];

  return (
    <DashboardLayout user={{ initials: user?.fullName?.charAt(0) ?? "?", name: user?.fullName ?? "" }}>

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inspection Dispatch</h1>
          <p className="page-subtitle">
            {isAdmin
              ? "Assign, track, and verify field inspections across Mataasnakahoy."
              : "Your active inspection assignments."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Total badge */}
          {!loading && (
            <span style={s.totalPill}>
              {total} report{total !== 1 ? "s" : ""}
            </span>
          )}

          {/* Status filter — admin only */}
          {isAdmin && (
            <select
              style={s.filterSelect}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUS_COLS.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          )}

          {/* Live Search Bar */}
          <div className="search-bar" style={{ width: 240 }}>
            <Icon.Search />
            <input
              type="text"
              placeholder="Search name, ID, or area..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <button className="ghost-btn" onClick={fetchReports} style={{ fontSize: 13 }}>
            <Icon.RefreshCw /> Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={s.errorBanner}>
          <Icon.AlertCircle /> &nbsp;{error}
        </div>
      )}

      {/* Kanban board */}
      {loading ? (
        <div style={s.loadingState}>Loading inspections…</div>
      ) : (
        <div style={{ ...s.board, gridTemplateColumns: `repeat(${visibleCols.length}, 1fr)` }}>
          {visibleCols.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              reports={byStatus(status)}
              isAdmin={isAdmin}
              onAssign={setAssignTarget}
              onVerify={setVerifyTarget}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <footer className="saas-footer frosted-glass">
        <p>&copy; 2026 Municipality of Mataasnakahoy. All Rights Reserved.</p>
        <p className="footer-links"><span>BPLO Portal</span> • <span>System Settings</span></p>
      </footer>

      {/* Assign Modal */}
      {assignTarget && (
        <AssignModal
          report={assignTarget}
          token={token}
          onClose={() => setAssignTarget(null)}
          onSuccess={fetchReports}
        />
      )}

      {/* Verify Modal */}
      {verifyTarget && (
        <VerifyModal
          report={verifyTarget}
          token={token}
          onClose={() => setVerifyTarget(null)}
          onSuccess={fetchReports}
        />
      )}

    </DashboardLayout>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = {
  board: {
    display: "grid",
    gap: 16,
    alignItems: "start",
  },
  column: {
    background: "rgba(248,249,250,0.7)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
  },
  columnHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px",
    borderBottom: "1px solid var(--color-border)",
    background: "rgba(255,255,255,0.6)",
  },
  columnTitle: {
    fontSize: 13, fontWeight: 700, color: "var(--color-ink)",
    textTransform: "uppercase", letterSpacing: "0.05em",
  },
  columnBody: {
    padding: 12, display: "flex", flexDirection: "column", gap: 10,
    minHeight: 120,
    maxHeight: "calc(100vh - 240px)",
    overflowY: "auto",
  },
  emptyCol: {
    textAlign: "center", padding: "24px 0",
    fontSize: 12, color: "var(--color-muted)",
  },

  // Card
  card: {
    background: "rgba(255,255,255,0.85)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: 14,
    backdropFilter: "blur(8px)",
  },
  cardName: {
    fontSize: 14, fontWeight: 700, color: "var(--color-ink)",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12, color: "var(--color-muted)",
    display: "flex", alignItems: "center", gap: 4, marginBottom: 10,
  },
  cardInspector: {
    display: "flex", alignItems: "center", gap: 8,
    paddingTop: 10, borderTop: "1px solid var(--color-border-soft)",
    marginBottom: 6,
  },
  avatar: {
    width: 24, height: 24, borderRadius: "50%",
    color: "#fff", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0,
  },
  cardActions: {
    display: "flex", gap: 8, marginTop: 10,
    paddingTop: 10, borderTop: "1px solid var(--color-border-soft)",
  },
  remarksPreview: {
    fontSize: 11, color: "var(--color-muted)",
    fontStyle: "italic", marginTop: 6, lineHeight: 1.5,
    display: "-webkit-box", WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical", overflow: "hidden",
  },

  // Pills
  flagPill: {
    display: "inline-flex", alignItems: "center", gap: 4,
    fontSize: 10, fontWeight: 800, padding: "3px 8px",
    borderRadius: 10, letterSpacing: "0.05em",
  },
  statusPill: {
    fontSize: 10, fontWeight: 700, padding: "3px 8px",
    borderRadius: 10, letterSpacing: "0.05em",
  },
  totalPill: {
    fontSize: 12, fontWeight: 600, color: "var(--color-muted)",
    background: "rgba(248,249,250,0.9)",
    border: "1px solid var(--color-border)",
    padding: "6px 12px", borderRadius: 20,
  },

  // Filter
  filterSelect: {
    padding: "8px 12px", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)", fontSize: 13,
    fontFamily: "var(--font-base)", color: "var(--color-ink)",
    background: "#fff", cursor: "pointer",
  },

  // Loading / error
  loadingState: {
    textAlign: "center", padding: "48px 0",
    fontSize: 14, color: "var(--color-muted)",
  },
  errorBanner: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#fff5f5", border: "1px solid #fed7d7",
    borderRadius: "var(--radius-sm)", padding: "10px 14px",
    fontSize: 13, color: "var(--color-danger)", marginBottom: 16,
  },

  // Modal
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(26,32,44,0.45)",
    backdropFilter: "blur(4px)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 100,
  },
  modal: {
    background: "#fff", borderRadius: "var(--radius-xl)",
    padding: 32, width: 440,
    boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
  },
  modalHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 700, color: "var(--color-ink)" },
  closeBtn: {
    background: "none", border: "none",
    color: "var(--color-muted)", cursor: "pointer", display: "flex",
  },
  modalFooter: {
    display: "flex", justifyContent: "flex-end",
    gap: 10, marginTop: 24,
  },
  flagPreview: {
    display: "flex", alignItems: "center", gap: 12,
    background: "rgba(248,249,250,0.8)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)", padding: "12px 14px", marginBottom: 20,
  },
  fieldLabel: {
    display: "block", fontSize: 11, fontWeight: 600,
    color: "var(--color-ink)", marginBottom: 8,
    textTransform: "uppercase", letterSpacing: "0.05em",
  },
  fieldSelect: {
    width: "100%", padding: "10px 12px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)", fontSize: 14,
    fontFamily: "var(--font-base)", color: "var(--color-ink)",
    background: "#fff", cursor: "pointer", marginBottom: 4,
  },
  remarksBox: {
    background: "rgba(248,249,250,0.8)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 14px", marginBottom: 14,
  },
};
