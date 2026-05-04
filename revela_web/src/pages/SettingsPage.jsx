import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import DashboardLayout from "../components/DashboardLayout";

export default function SettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const { isDark, setTheme, toggleTheme } = useTheme();

  const handleSave = () => {
    window.alert("Settings saved successfully.");
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure dashboard preferences and system behavior.</p>
        </div>
        <button className="primary-btn" type="button" onClick={handleSave}>Save Settings</button>
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
              <input type="checkbox" checked={isDark} onChange={() => setTheme(isDark ? "light" : "dark")} />
            </label>
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
              <button className="ghost-btn" type="button" style={{ padding: "8px 12px" }} onClick={() => window.alert("Password update flow not implemented yet.")}>Update</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, color: "var(--color-ink)" }}>Two-factor auth</div>
                <div style={{ color: "var(--color-muted)", fontSize: 12 }}>Protect your account with one-time codes.</div>
              </div>
              <button className="ghost-btn" type="button" style={{ padding: "8px 12px" }} onClick={() => window.alert("Two-factor authentication is now enabled.")}>Enable</button>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
