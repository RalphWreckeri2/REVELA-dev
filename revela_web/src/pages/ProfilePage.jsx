import DashboardLayout from "../components/DashboardLayout";

export default function ProfilePage() {
  const handleManageSecurity = () => {
    window.alert("Opening security settings...");
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Review and update your administrator profile details.</p>
        </div>
      </div>

      <div className="saas-card frosted-glass" style={{ display: "grid", gap: 24 }}>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, background: "var(--color-primary)", display: "grid", placeItems: "center", color: "#fff", fontSize: 28, fontWeight: 700 }}>
              JD
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, color: "var(--color-ink)" }}>J. Dela Cruz</h2>
              <p style={{ margin: "8px 0 0", color: "var(--color-muted)", fontSize: 13 }}>BPLO Admin</p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontWeight: 700, color: "var(--color-ink)" }}>Email</span>
              <span style={{ color: "var(--color-muted)" }}>jdela.cruz@mataasnakahoy.gov.ph</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontWeight: 700, color: "var(--color-ink)" }}>Role</span>
              <span style={{ color: "var(--color-muted)" }}>BPLO Administrator</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontWeight: 700, color: "var(--color-ink)" }}>Office</span>
              <span style={{ color: "var(--color-muted)" }}>Mataasnakahoy BPLO</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontWeight: 700, color: "var(--color-ink)" }}>Last sign in</span>
              <span style={{ color: "var(--color-muted)" }}>Today, 09:05</span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="saas-card frosted-glass" style={{ padding: 18 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "var(--color-ink)" }}>Contact</h3>
            <p style={{ margin: "12px 0 0", color: "var(--color-muted)", fontSize: 13 }}>+63 939 123 4567</p>
            <p style={{ margin: "6px 0 0", color: "var(--color-muted)", fontSize: 13 }}>123 Rizal St., Poblacion I</p>
          </div>
          <div className="saas-card frosted-glass" style={{ padding: 18 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "var(--color-ink)" }}>Security</h3>
            <p style={{ margin: "12px 0 0", color: "var(--color-muted)", fontSize: 13 }}>2-factor authentication is enabled for your account.</p>
            <button className="ghost-btn" type="button" style={{ marginTop: 14, padding: "8px 12px" }} onClick={handleManageSecurity}>Manage Security</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
