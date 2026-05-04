import React, { useState } from "react";
import DashboardLayout from "../components/DashboardLayout";

export default function InspectionsPage() {
  // Mock Data: Kanban-style Task Board
  const [tasks] = useState([
    { id: 101, business: "Aling Nena Sari-Sari", barangay: "Poblacion II", priority: "High", inspector: "Unassigned", status: "Pending" },
    { id: 102, business: "Kinalaglagan Hardware", barangay: "Kinalaglagan", priority: "Medium", inspector: "Juan Dela Cruz", status: "In Transit" },
    { id: 103, business: "Nangkaan Eatery", barangay: "Nangkaan", priority: "Low", inspector: "Maria Santos", status: "In Transit" },
    { id: 104, business: "Talyer ni Mang Boy", barangay: "Poblacion II", priority: "High", inspector: "Juan Dela Cruz", status: "Inspected" },
  ]);

  // Helper function to render cards based on status
  const renderColumn = (columnStatus) => {
    const columnTasks = tasks.filter(task => task.status === columnStatus);
    
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", padding: "0 8px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#1a202c", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {columnStatus} ({columnTasks.length})
          </h3>
        </div>

        {columnTasks.map(task => (
          <div key={task.id} className="saas-card frosted-glass" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px", cursor: "grab" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
               <span className={`badge ${task.priority === "High" ? "red" : ""}`} 
                     style={{ background: task.priority === "Medium" ? "#fef3c7" : task.priority === "Low" ? "#dcfce3" : undefined, 
                              color: task.priority === "Medium" ? "#d97706" : task.priority === "Low" ? "#166534" : undefined }}>
                 {task.priority} Priority
               </span>
               <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600" }}>#{task.id}</span>
            </div>
            
            <div>
              <h4 style={{ fontSize: "16px", fontWeight: "700", color: "#1a202c", margin: "0 0 4px 0" }}>{task.business}</h4>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                {task.barangay}
              </p>
            </div>

            <div style={{ borderTop: "1px solid rgba(226, 232, 240, 0.6)", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: task.inspector === "Unassigned" ? "#e2e8f0" : "#56ab2f", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: "700" }}>
                  {task.inspector === "Unassigned" ? "?" : task.inspector.charAt(0)}
                </div>
                <span style={{ fontSize: "12px", fontWeight: "600", color: task.inspector === "Unassigned" ? "#94a3b8" : "#475569" }}>
                  {task.inspector}
                </span>
              </div>
            </div>

            
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              {task.status === "Pending" && (
                <button className="primary-btn" style={{ flex: 1, padding: "8px", fontSize: "12px", justifyContent: "center" }}>
                  Dispatch
                </button>
              )}
              {task.status === "In Transit" && (
                <button style={{ flex: 1, padding: "8px", fontSize: "12px", background: "white", border: "1px solid #cbd5e1", borderRadius: "8px", fontWeight: "600", color: "#1a202c", cursor: "pointer" }}>
                  Mark Inspected
                </button>
              )}
              {task.status === "Inspected" && (
                <button style={{ flex: 1, padding: "8px", fontSize: "12px", background: "rgba(86, 171, 47, 0.1)", border: "1px solid rgba(86, 171, 47, 0.2)", borderRadius: "8px", fontWeight: "700", color: "#56ab2f", cursor: "pointer" }}>
                  View Report
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      
      <div className="page-header" style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 className="page-title">Inspection Dispatch</h1>
          <p className="page-subtitle">Manage, assign, and track fieldwork progress across Mataasnakahoy.</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button style={{ background: "white", border: "1px solid #e2e8f0", padding: "10px 16px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: "#1a202c", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            Filter Board
          </button>
          <button className="primary-btn">
            + Auto-Assign by Priority
          </button>
        </div>
      </div>

      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", minHeight: "60vh", alignItems: "start" }}>
        {renderColumn("Pending")}
        {renderColumn("In Transit")}
        {renderColumn("Inspected")}
      </div>
    </DashboardLayout>
  );
}