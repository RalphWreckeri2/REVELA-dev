import { useState, useEffect } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import {
  getUsersRequest,
  createUserRequest,
  updateUserRequest,
  deleteUserRequest,
} from "../services/api";

// ── Role badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const styles = {
    SUPER_ADMIN: { background: "#fef3c7", color: "#92400e" },
    Admin:       { background: "#dcfce7", color: "#15803d" },
  };
  const s = styles[role] ?? { background: "#f1f5f9", color: "#64748b" };
  return (
    <span style={{ ...s, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 12 }}>
      {role}
    </span>
  );
}

// ── Create Modal ──────────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onSuccess, onSuccessMsg, token }) {
  const [formData, setFormData] = useState({ fullName: "", email: "", role: "Admin", phone: "" });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await createUserRequest(formData, token);
      onSuccess();
      onSuccessMsg(`User "${formData.fullName}" created successfully. Temporary password: admin123`);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>✕</button>
        <h3 style={styles.modalTitle}>Create New User</h3>

        {error && <p style={styles.errorBanner}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: "Full Name",  key: "fullName", type: "text",  placeholder: "Juan Dela Cruz"                  },
            { label: "Email",      key: "email",    type: "email", placeholder: "juan@mataasnakahoy.gov.ph"        },
            { label: "Phone",      key: "phone",    type: "text",  placeholder: "+63 9XX XXX XXXX (optional)"     },
          ].map(f => (
            <div key={f.key}>
              <label style={styles.label}>{f.label}</label>
              <input
                type={f.type}
                required={f.key !== "phone"}
                placeholder={f.placeholder}
                value={formData[f.key]}
                onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                style={styles.input}
              />
            </div>
          ))}

          <div>
            <label style={styles.label}>Temporary Password</label>
            <input disabled value="admin123" style={{ ...styles.input, background: "rgba(240,240,240,0.8)", color: "var(--color-muted)", cursor: "not-allowed" }} />
            <span style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 4, display: "block" }}>
              User will be required to change this on first login.
            </span>
          </div>

          <div>
            <label style={styles.label}>Role</label>
            <select
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              style={styles.input}
            >
              <option value="Admin">Admin</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSuccess, token }) {
  const [formData, setFormData] = useState({
    fullName: user.fullName,
    email:    user.email,
    role:     user.userRole,
    phone:    user.phone ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await updateUserRequest(user.userID, formData, token);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>✕</button>
        <h3 style={styles.modalTitle}>Edit User</h3>

        {error && <p style={styles.errorBanner}>{error}</p>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: "Full Name", key: "fullName", type: "text"  },
            { label: "Email",     key: "email",    type: "email" },
            { label: "Phone",     key: "phone",    type: "text"  },
          ].map(f => (
            <div key={f.key}>
              <label style={styles.label}>{f.label}</label>
              <input
                type={f.type}
                required={f.key !== "phone"}
                value={formData[f.key]}
                onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                style={styles.input}
              />
            </div>
          ))}

          {user.userRole !== "SUPER_ADMIN" ? (
            <div>
              <label style={styles.label}>Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                style={styles.input}
              >
                <option value="Admin">Admin</option>
              </select>
            </div>
          ) : (
            <div>
              <label style={styles.label}>Role</label>
              <input
                disabled
                value="SUPER_ADMIN"
                style={{ ...styles.input, background: "rgba(240,240,240,0.8)", color: "var(--color-muted)", cursor: "not-allowed" }}
              />
              <span style={{ fontSize: 11, color: "var(--color-muted)", marginTop: 4, display: "block" }}>
                🔒 This role is permanently locked and cannot be changed.
              </span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteUserModal({ targetUser, onClose, onSuccess, token }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      await deleteUserRequest(targetUser.userID, token);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to remove user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>✕</button>
        <h3 style={styles.modalTitle}>Remove User</h3>

        {error && <p style={styles.errorBanner}>{error}</p>}

        <p style={{ fontSize: 14, color: "var(--color-ink)", marginBottom: 24, lineHeight: 1.5 }}>
          Are you sure you want to permanently remove <strong>{targetUser.fullName}</strong>? This action cannot be undone.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-btn" style={{ background: "var(--color-danger)", borderColor: "var(--color-danger)" }} onClick={handleConfirm} disabled={loading}>
            {loading ? "Removing…" : "Remove User"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UserManagementPage() {
  const { token, user } = useAuth();
  const [users,          setUsers]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [showCreate,     setShowCreate]     = useState(false);
  const [editingUser,    setEditingUser]    = useState(null);
  const [userToDelete,   setUserToDelete]   = useState(null);
  const [successMsg,     setSuccessMsg]     = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getUsersRequest(token);
      setUsers(data);
    } catch (err) {
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [token]);

  // ── Access control ────────────────────────────────────────────────────────
  if (user?.role !== "SUPER_ADMIN") {
    return (
      <DashboardLayout>
        <div className="page-header">
          <h1 className="page-title">User Management</h1>
        </div>
        <div className="saas-card frosted-glass" style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 20, color: "var(--color-ink)", marginBottom: 8 }}>Access Restricted</h2>
          <p style={{ color: "var(--color-muted)", maxWidth: 400, margin: "0 auto" }}>
            User management is strictly reserved for Super Administrators.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={{ initials: user?.fullName?.charAt(0) ?? "?", name: user?.fullName ?? "" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage system access and administrator accounts.</p>
        </div>
        <button className="primary-btn" type="button" onClick={() => setShowCreate(true)}>
          + Create User
        </button>
      </div>

      {error && <p style={styles.errorBanner}>{error}</p>}
      {successMsg && <p style={styles.successBanner}>{successMsg}</p>}

      <div className="saas-card frosted-glass" style={{ overflowX: "auto", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--color-muted)", fontSize: 12, textTransform: "uppercase", background: "rgba(248,249,250,0.9)", borderBottom: "1px solid var(--color-border)" }}>
              {["Name", "Role", "Email", "Phone", "Last Login", "Status", "Actions"].map(h => (
                <th key={h} style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: "48px 20px", textAlign: "center", color: "var(--color-muted)" }}>
                  Loading users…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "48px 20px", textAlign: "center", color: "var(--color-muted)", fontSize: 14 }}>
                  No users found. Click "Create User" to add an administrator.
                </td>
              </tr>
            ) : users.map((u, i) => (
              <tr key={u.userID} style={{ borderBottom: "1px solid rgba(226,232,240,0.4)", background: i % 2 === 0 ? "rgba(255,255,255,0.5)" : "transparent" }}>
                <td style={{ padding: "14px 20px", fontWeight: 600, color: "var(--color-ink)" }}>
                  {u.fullName}
                  {u.userID === user.userID && (
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "var(--color-primary)", background: "var(--color-primary-light)", padding: "2px 6px", borderRadius: 8 }}>
                      You
                    </span>
                  )}
                </td>
                <td style={{ padding: "14px 20px" }}><RoleBadge role={u.userRole} /></td>
                <td style={{ padding: "14px 20px", color: "var(--color-muted)", fontSize: 13 }}>{u.email}</td>
                <td style={{ padding: "14px 20px", color: "var(--color-muted)", fontSize: 13 }}>{u.phone ?? "—"}</td>
                <td style={{ padding: "14px 20px", color: "var(--color-muted)", fontSize: 12 }}>
                  {u.lastLoginAt ? u.lastLoginAt.slice(0, 10) : "Never"}
                </td>
                <td style={{ padding: "14px 20px" }}>
                  {u.mustChangePassword ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e", background: "#fef3c7", padding: "3px 8px", borderRadius: 10 }}>
                      Temp Password
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d", background: "#dcfce7", padding: "3px 8px", borderRadius: 10 }}>
                      Active
                    </span>
                  )}
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="ghost-btn"
                      type="button"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                      onClick={() => setEditingUser(u)}
                    >
                      Edit
                    </button>
                    {u.userID !== user.userID && (
                      <button
                        className="ghost-btn"
                        type="button"
                        style={{ padding: "6px 12px", fontSize: 12, color: "var(--color-danger)", borderColor: "var(--color-danger-light)" }}
                        onClick={() => setUserToDelete(u)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="saas-footer frosted-glass">
        <p>&copy; 2026 Municipality of Mataasnakahoy. All Rights Reserved.</p>
      </footer>

      {showCreate && (
        <CreateUserModal
          token={token}
          onClose={() => setShowCreate(false)}
          onSuccess={fetchUsers}
          onSuccessMsg={(msg) => {
            setSuccessMsg(msg);
            setTimeout(() => setSuccessMsg(""), 6000);
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          token={token}
          onClose={() => setEditingUser(null)}
          onSuccess={fetchUsers}
        />
      )}

      {userToDelete && (
        <DeleteUserModal
          targetUser={userToDelete}
          token={token}
          onClose={() => setUserToDelete(null)}
          onSuccess={() => {
            fetchUsers();
            setSuccessMsg(`User "${userToDelete.fullName}" was removed.`);
            setTimeout(() => setSuccessMsg(""), 6000);
          }}
        />
      )}
    </DashboardLayout>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  backdrop:    { position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  modal:       { background: "#fff", borderRadius: 20, padding: 32, width: "min(100%, 440px)", position: "relative", boxShadow: "0 24px 60px rgba(15,23,42,0.18)" },
  modalTitle:  { fontSize: 20, fontWeight: 700, color: "var(--color-ink)", marginBottom: 20 },
  closeBtn:    { position: "absolute", top: 16, right: 16, background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: 18 },
  label:       { display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-muted)", marginBottom: 6 },
  input:       { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "rgba(255,255,255,0.8)", fontSize: 14, fontFamily: "var(--font-base)", boxSizing: "border-box" },
  errorBanner: { background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--color-danger)", marginBottom: 16 },
  successBanner: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#15803d", marginBottom: 16 },
};