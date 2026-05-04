import { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";

const USERS = [
  { id: 1, name: "Maria Santos", role: "BPLO Officer", email: "maria.santos@mataasnakahoy.gov.ph", status: "Active" },
  { id: 2, name: "Erik Reyes", role: "Field Inspector", email: "erik.reyes@mataasnakahoy.gov.ph", status: "Active" },
  { id: 3, name: "Luca Dela Cruz", role: "GIS Analyst", email: "luca.delacruz@mataasnakahoy.gov.ph", status: "Inactive" },
  { id: 4, name: "Amelia Tan", role: "Compliance Lead", email: "amelia.tan@mataasnakahoy.gov.ph", status: "Active" },
];

export default function UserManagementPage() {
  const [users, setUsers] = useState(USERS);

  const handleInviteUser = () => {
    window.alert("Invite user dialog would open here.");
  };

  const handleEditUser = (name) => {
    window.alert(`Edit profile for ${name}`);
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage BPLO personnel access and profile assignments.</p>
        </div>
        <button className="primary-btn" type="button" onClick={handleInviteUser}>Invite New User</button>
      </div>

      <div className="saas-card frosted-glass" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--color-muted)", fontSize: 12, textTransform: "uppercase" }}>
              <th style={{ padding: 16, minWidth: 180 }}>Name</th>
              <th style={{ padding: 16, minWidth: 160 }}>Role</th>
              <th style={{ padding: 16, minWidth: 220 }}>Email</th>
              <th style={{ padding: 16, minWidth: 120 }}>Status</th>
              <th style={{ padding: 16, minWidth: 140 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {USERS.map((user) => (
              <tr key={user.id} style={{ borderTop: "1px solid rgba(226, 232, 240, 0.7)" }}>
                <td style={{ padding: 16, fontWeight: 600, color: "var(--color-ink)" }}>{user.name}</td>
                <td style={{ padding: 16, color: "var(--color-muted)" }}>{user.role}</td>
                <td style={{ padding: 16, color: "var(--color-muted)" }}>{user.email}</td>
                <td style={{ padding: 16 }}>
                  <span className={`badge badge--${user.status === "Active" ? "green" : "orange"}`}>
                    {user.status}
                  </span>
                </td>
                <td style={{ padding: 16 }}>
                  <button className="ghost-btn" type="button" style={{ padding: "8px 12px" }} onClick={() => handleEditUser(user.name)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
