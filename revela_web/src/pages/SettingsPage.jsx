import { useState, useEffect, useRef, useContext } from "react";
import { useTheme } from "../context/ThemeContext";
import DashboardLayout from "../components/DashboardLayout";
import { AuthContext } from "../context/AuthContext";
import { changePasswordRequest, setup2faRequest, verify2faSetupRequest } from "../services/authService";
import Swal from "sweetalert2";
import { QRCodeSVG } from "qrcode.react";
import { getWlcConfigRequest, updateWlcConfigRequest } from "../services/api";

// ── Icons ─────────────────────────────────────────────────────────────────────
const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// ── Change Password Modal ─────────────────────────────────────────────────────
function ChangePasswordModal({ onClose, token }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await changePasswordRequest({ oldPassword, newPassword }, token);

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Password changed successfully!',
        confirmButtonColor: '#56ab2f'
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div className="saas-card frosted-glass" style={{ width: "min(100%, 400px)", padding: 32, position: "relative", background: "#fff", boxShadow: "0 24px 60px rgba(15,23,42,0.18)" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: 20 }}>✕</button>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 18, color: "var(--color-ink)" }}>Change Password</h3>
        
        {error && <p style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--color-danger)", marginBottom: 16 }}>{error}</p>}
        
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-muted)", marginBottom: 6 }}>Current Password</label>
            <div style={{ position: "relative" }}>
              <input type={showOldPassword ? "text" : "password"} value={oldPassword} onChange={e => setOldPassword(e.target.value)} required style={{ width: "100%", padding: "10px 36px 10px 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "rgba(255,255,255,0.8)", fontSize: 14, boxSizing: "border-box" }} />
              <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", display: "flex", padding: 0 }}>
                {showOldPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-muted)", marginBottom: 6 }}>New Password</label>
            <div style={{ position: "relative" }}>
              <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} style={{ width: "100%", padding: "10px 36px 10px 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "rgba(255,255,255,0.8)", fontSize: 14, boxSizing: "border-box" }} />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", display: "flex", padding: 0 }}>
                {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading}>{loading ? "Updating..." : "Update Password"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Setup 2FA Modal ───────────────────────────────────────────────────────────
function Setup2FAModal({ onClose, token, onSuccess }) {
  const [secret, setSecret] = useState("");
  const [otpUri, setOtpUri] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const initSetup = async () => {
      try {
        // Fetch the Base32 secret and URI from your backend
        const data = await setup2faRequest(token);
        if (cancelled) return;
        setSecret(data.secret);
        setOtpUri(data.otpUri);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Failed to initialize 2FA setup.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    initSetup();
    return () => { cancelled = true; };
  }, [token]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setError("");
    try {
      await verify2faSetupRequest({ code }, token);
      Swal.fire({ icon: 'success', title: '2FA Enabled', text: 'Two-factor authentication is now active.', confirmButtonColor: '#56ab2f'});
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div className="saas-card frosted-glass" style={{ width: "min(100%, 400px)", padding: 32, position: "relative", background: "#fff", boxShadow: "0 24px 60px rgba(15,23,42,0.18)" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: 20 }}>✕</button>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 18, color: "var(--color-ink)" }}>Set up Two-Factor Auth</h3>
        {error && <p style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--color-danger)", marginBottom: 16 }}>{error}</p>}
        
        {loading ? (
          <p style={{ fontSize: 14, color: "var(--color-muted)" }}>Generating secure keys...</p>
        ) : (
          <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>1. Scan this QR code with Google Authenticator or Authy:</p>
            <div style={{ display: "flex", justifyContent: "center", background: "#fff", padding: "16px", borderRadius: "8px", border: "1px dashed var(--color-border)" }}>
              {otpUri && <QRCodeSVG value={otpUri} size={150} level="M" />}
            </div>
            <p style={{ fontSize: 12, color: "var(--color-muted)", textAlign: "center", margin: 0 }}>Or enter this setup key manually:</p>
            <div style={{ background: "rgba(248,249,250,0.8)", padding: "8px 12px", borderRadius: "8px", textAlign: "center", fontWeight: "700", letterSpacing: "2px", color: "var(--color-primary)", wordBreak: "break-word", fontFamily: "monospace", fontSize: 14 }}>{secret.match(/.{1,4}/g)?.join(' ') || secret}</div>
            <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>2. Enter the 6-digit code generated by the app to verify.</p>
            <input type="text" placeholder="123456" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} required style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "rgba(255,255,255,0.8)", fontSize: 16, textAlign: "center", letterSpacing: "4px" }} />
            
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button type="button" className="ghost-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="primary-btn" disabled={verifying || code.length < 6}>{verifying ? "Verifying..." : "Verify & Enable"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { token, user, refreshUser } = useContext(AuthContext);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const { isDark, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [wlcConfig, setWlcConfig] = useState({ w1_risk: 40, w2_sector: 40, w3_distance: 20, bplo_lat: 13.9667, bplo_lng: 121.1167 });
  const [sectors, setSectors] = useState([]);

  const SECTOR_OPTIONS = ["Food Service", "Retail", "Manufacturing", "Healthcare", "Education", "Real Estate", "Logistics", "Other"];

  // Load initial settings on mount
  useEffect(() => {
    const savedEmailAlerts = localStorage.getItem("revela_emailAlerts");
    const savedAutoSync = localStorage.getItem("revela_autoSync");
    if (savedEmailAlerts !== null) setEmailAlerts(savedEmailAlerts === "true");
    if (savedAutoSync !== null) setAutoSync(savedAutoSync === "true");

    getWlcConfigRequest(token).then(data => {
      if(data) {
        setWlcConfig(data);
        if (data.sectors) {
          const loadedSectors = Object.entries(data.sectors).map(([name, score]) => ({ name, score }));
          setSectors(loadedSectors);
        }
      }
    }).catch(console.error);
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    // Example: Save to local storage (or replace with API call)
    localStorage.setItem("revela_emailAlerts", emailAlerts);
    localStorage.setItem("revela_autoSync", autoSync);
    
    try {
      const sectorObj = {};
      sectors.forEach(s => { if (s.name) sectorObj[s.name] = Number(s.score); });
      
      await updateWlcConfigRequest({ ...wlcConfig, sectors: sectorObj }, token);
      Swal.fire({ icon: 'success', title: 'Saved', text: 'Settings updated successfully.', timer: 2000, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Error', err.message || "Failed to update WLC config", 'error');
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 600));
    
    setSaving(false);
  };

  const handleToggle2FA = async () => {
    if (user?.is_2fa_enabled) {
      Swal.fire({
        title: 'Disable 2FA?',
        text: "Are you sure you want to disable Two-Factor Authentication?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, disable it'
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const res = await fetch("http://127.0.0.1:5000/api/auth/disable-2fa", {
              method: "POST",
              headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || "Failed to disable 2FA");
            }
            Swal.fire('Disabled!', '2FA has been disabled.', 'success');
            if (refreshUser) refreshUser();
          } catch (err) {
            Swal.fire('Error', err.message, 'error');
          }
        }
      });
    } else {
      setShow2FAModal(true);
    }
  };

  const handleWeightChange = (changedKey, newValue) => {
    let val = Math.min(100, Math.max(0, parseInt(newValue || 0, 10)));
    const otherKeys = ["w1_risk", "w2_sector", "w3_distance"].filter(k => k !== changedKey);
    let remaining = 100 - val;
    
    let k1 = otherKeys[0];
    let k2 = otherKeys[1];
    let sumOthers = wlcConfig[k1] + wlcConfig[k2];
    
    let newWlc = { ...wlcConfig, [changedKey]: val };
    if (sumOthers === 0) {
      newWlc[k1] = Math.floor(remaining / 2);
      newWlc[k2] = remaining - newWlc[k1];
    } else {
      newWlc[k1] = Math.round((wlcConfig[k1] / sumOthers) * remaining);
      newWlc[k2] = remaining - newWlc[k1];
    }
    setWlcConfig(newWlc);
  };

  const applyPreset = (preset) => {
    if (preset === "health") setWlcConfig({ ...wlcConfig, w1_risk: 20, w2_sector: 70, w3_distance: 10 });
    if (preset === "renewal") setWlcConfig({ ...wlcConfig, w1_risk: 70, w2_sector: 20, w3_distance: 10 });
  };

  const addSector = () => setSectors([...sectors, { name: "", score: 50 }]);
  const updateSector = (index, field, value) => {
    const newSectors = [...sectors];
    newSectors[index][field] = value;
    setSectors(newSectors);
  };
  const removeSector = (index) => setSectors(sectors.filter((_, i) => i !== index));

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure dashboard preferences and system behavior.</p>
        </div>
        <button className="primary-btn" type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div className="saas-card frosted-glass" style={{ display: "grid", gap: 20 }}>
        <section>
          <h3 style={{ margin: "0 0 10px", color: "var(--color-ink)", fontSize: 16 }}>Notifications</h3>
          <p style={{ margin: 0, color: "var(--color-muted)", fontSize: 13 }}>Control how the system alerts you about new inspections and reports.</p>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
              <span>Email notifications</span>
              <input type="checkbox" checked={emailAlerts} onChange={() => setEmailAlerts((prev) => !prev)} />
            </label>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
              <span>Auto-sync data</span>
              <input type="checkbox" checked={autoSync} onChange={() => setAutoSync((prev) => !prev)} />
            </label>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
              <span>Dark mode</span>
              <input type="checkbox" checked={!!isDark} onChange={() => setTheme(isDark ? "light" : "dark")} />
            </label>
          </div>
        </section>

        <section>
          <h3 style={{ margin: "0 0 10px", color: "var(--color-ink)", fontSize: 16 }}>Policy Configuration (WLC)</h3>
          <p style={{ margin: 0, color: "var(--color-muted)", fontSize: 13 }}>Set up priority score scenarios, linked weights, and dynamic sector rules.</p>
          
          <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
            {/* Scenario Presets */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
              <button type="button" className="ghost-btn" style={{ padding: "6px 12px", fontSize: 12, background: "rgba(245,158,11,0.1)", color: "#b45309", borderColor: "rgba(245,158,11,0.4)" }} onClick={() => applyPreset("health")}>
                🚑 Health Crisis Mode (Focus: Sector)
              </button>
              <button type="button" className="ghost-btn" style={{ padding: "6px 12px", fontSize: 12, background: "rgba(239,68,68,0.1)", color: "#b91c1c", borderColor: "rgba(239,68,68,0.4)" }} onClick={() => applyPreset("renewal")}>
                📈 Business Renewal Peak (Focus: Risk)
              </button>
            </div>

            {/* Linked Sliders */}
            <div style={{ background: "rgba(248,249,250,0.8)", padding: "16px", borderRadius: 8, border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)" }}>Linked Priority Weights</label>
              {[
                { key: "w1_risk", label: "Risk Volume (W1)", color: "var(--color-danger)" },
                { key: "w2_sector", label: "Sector Impact (W2)", color: "var(--color-gold)" },
                { key: "w3_distance", label: "Travel Distance (W3)", color: "var(--color-primary)" }
              ].map(w => (
                <div key={w.key} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ width: 140, fontSize: 12, fontWeight: 600, color: "var(--color-muted)" }}>{w.label}</span>
                  <input type="range" min="0" max="100" value={wlcConfig[w.key]} onChange={e => handleWeightChange(w.key, e.target.value)} style={{ flex: 1, accentColor: w.color }} />
                  <div style={{ width: 30, textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--color-ink)" }}>{wlcConfig[w.key]}%</div>
                </div>
              ))}
            </div>
            
            {/* Dynamic Sector List */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)" }}>Sector Severity Settings</label>
                <button type="button" className="ghost-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={addSector}>+ Add Sector</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sectors.length === 0 && <p style={{ fontSize: 12, color: "var(--color-muted)" }}>No sector policies defined. Click "Add Sector" to set custom severities.</p>}
                {sectors.map((sec, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.6)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                    <select value={sec.name} onChange={e => updateSector(i, "name", e.target.value)} style={{ padding: "6px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: 13, width: 160, background: "#fff" }}>
                      <option value="">Select Sector ▾</option>
                      {SECTOR_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-muted)" }}>Severity:</span>
                    <input type="range" min="0" max="100" value={sec.score} onChange={e => updateSector(i, "score", e.target.value)} style={{ flex: 1 }} />
                    <span style={{ width: 36, fontSize: 12, fontWeight: 700, color: "var(--color-ink)", textAlign: "right" }}>{(sec.score / 100).toFixed(1)}</span>
                    <button type="button" onClick={() => removeSector(i)} style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer", padding: 4, fontSize: 14, marginLeft: 8 }} title="Remove Sector">✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* BPLO Location */}
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-muted)", marginBottom: 6 }}>BPLO Latitude</label>
                <input type="number" step="any" value={wlcConfig.bplo_lat || ""} onChange={e => setWlcConfig({...wlcConfig, bplo_lat: parseFloat(e.target.value)})} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 14 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-muted)", marginBottom: 6 }}>BPLO Longitude</label>
                <input type="number" step="any" value={wlcConfig.bplo_lng || ""} onChange={e => setWlcConfig({...wlcConfig, bplo_lng: parseFloat(e.target.value)})} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 14 }} />
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 style={{ margin: "0 0 10px", color: "var(--color-ink)", fontSize: 16 }}>Security</h3>
          <p style={{ margin: 0, color: "var(--color-muted)", fontSize: 13 }}>Manage sign-in protection and admin access controls.</p>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, color: "var(--color-ink)" }}>Change password</div>
                <div style={{ color: "var(--color-muted)", fontSize: 12 }}>Update your account password with a strong passphrase.</div>
              </div>
              <button className="ghost-btn" type="button" style={{ padding: "8px 12px" }} onClick={() => setShowPasswordModal(true)}>Update</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, color: "var(--color-ink)" }}>Two-factor auth</div>
                <div style={{ color: "var(--color-muted)", fontSize: 12 }}>Protect your account with one-time codes.</div>
              </div>
              <button 
                className="ghost-btn" 
                type="button" 
                style={{ padding: "8px 12px", color: user?.is_2fa_enabled ? "var(--color-danger)" : "inherit" }} 
                onClick={handleToggle2FA}
              >
                {user?.is_2fa_enabled ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        </section>
      </div>
      
      {showPasswordModal && <ChangePasswordModal token={token} onClose={() => setShowPasswordModal(false)} />}
      {show2FAModal && <Setup2FAModal token={token} onClose={() => setShow2FAModal(false)} onSuccess={refreshUser} />}
    </DashboardLayout>
  );
}
