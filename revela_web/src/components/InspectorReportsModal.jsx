import React, { useState } from 'react';
import ReactDOM from 'react-dom';

const FLAG_COLORS = {
  Red: { marker: "#ef4444", bg: "var(--flag-red-bg)", text: "var(--flag-red-text)", label: "Detected Unregistered" },
  Yellow: { marker: "#f59e0b", bg: "var(--flag-yellow-bg)", text: "var(--flag-yellow-text)", label: "Suspected Unregistered" },
  Yellow_Inspector: { marker: "#f59e0b", bg: "var(--flag-yellow-bg)", text: "var(--flag-yellow-text)", label: "Suspected Unregistered from Inspectors" },
  Orange: { marker: "#e65100", bg: "var(--flag-orange-bg)", text: "var(--flag-orange-text)", label: "1st/2nd Warning / 3rd Notice Closure" },
  Black: { marker: "#000000", bg: "var(--flag-black-bg)", text: "var(--flag-black-text)", label: "Closed / Nonconforming" },
  Green: { marker: "#22c55e", bg: "var(--flag-green-bg)", text: "var(--flag-green-text)", label: "Active Business" },
};

function parseColor(flag) {
  if (flag.color) return flag.color;
  if (flag.flagColor) return flag.flagColor;
  return "Unknown";
}

function getFlagColor(colorName) {
  return FLAG_COLORS[colorName] || { bg: "var(--color-hover)", text: "var(--color-ink)", label: "Unknown", marker: "gray" };
}

function shortBarangay(b) {
  if (!b) return "";
  return b.replace(/Barangay\s+/i, "Brgy. ");
}

export default function InspectorReportsModal({ isOpen, onClose, flags, inspectors, navigate }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterColor, setFilterColor] = useState("Yellow_Inspector");

  if (!isOpen) return null;

  const filteredFlags = flags.filter(f => {
    let matchColor = false;
    
    if (filterColor === "all") {
      matchColor = true;
    } else if (filterColor === "Yellow_Inspector") {
      matchColor = parseColor(f) === "Yellow" && f.reportedByUserID;
    } else {
      matchColor = parseColor(f) === filterColor;
    }
    
    const matchSearch = (f.detectedName || f.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.barangayName || f.barangay || "").toLowerCase().includes(searchTerm.toLowerCase());
      
    return matchColor && matchSearch;
  });

  return ReactDOM.createPortal(
    <div className="modal-backdrop" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="modal-panel modal-content saas-card" onClick={e => e.stopPropagation()} style={{ width: 1040, maxWidth: "95vw", height: "85vh", display: "flex", flexDirection: "column", padding: 32, borderRadius: 24, background: "var(--color-modal-bg)", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
        
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
          {/* Top Row: Title + Search/Close */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--color-ink)", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: filterColor === "Yellow_Inspector" ? "#10b981" : (FLAG_COLORS[filterColor]?.marker || "#10b981"), display: "inline-block" }}></span>
              {filterColor === "Yellow_Inspector" ? "Submitted Backlog" : filterColor === "all" ? "All Flags" : FLAG_COLORS[filterColor]?.label || "Flags"} <span style={{ color: "var(--color-muted)", fontSize: 16, fontWeight: 600 }}>({filteredFlags.length})</span>
            </h2>
            
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input 
                  type="text" 
                  placeholder="Search name or barangay..." 
                  className="saas-input" 
                  style={{ padding: "8px 14px 8px 36px", width: 260, borderRadius: 8, background: "transparent" }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              
              <button className="modal-close-btn" onClick={onClose}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
          
          {/* Color filter pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["all", "Green", "Yellow", "Yellow_Inspector", "Orange", "Red", "Black"].map(c => (
              <button
                key={c}
                onClick={() => setFilterColor(c)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "1px solid",
                  background: filterColor === c ? (c === "all" ? "var(--color-ink)" : FLAG_COLORS[c]?.marker ?? "var(--color-ink)") : "var(--color-hover)",
                  color: filterColor === c ? (c === "all" ? "var(--color-surface)" : "#fff") : "var(--color-muted)",
                  borderColor: filterColor === c ? "transparent" : "var(--color-border-soft)",
                }}
              >
                {c === "all" ? "All" : (FLAG_COLORS[c]?.label ?? c)}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Content */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: 16 }}>
          {filteredFlags.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-muted)", fontSize: 15, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <img src="/searching.png" alt="No items found" style={{ height: 100, objectFit: "contain", opacity: 0.9 }} />
              No items found matching your criteria.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {filteredFlags.map(f => {
                const fc = getFlagColor(parseColor(f));
                
                return (
                  <div 
                    key={f.logID || f.id}
                    onClick={() => { onClose(); navigate('?flag=' + (f.logID || f.id)); }}
                    style={{ 
                      background: "var(--color-surface)", 
                      border: "1px solid var(--color-border-soft)", 
                      borderRadius: 16, 
                      padding: 20, 
                      display: "flex", 
                      flexDirection: "column", 
                      justifyContent: "space-between",
                      cursor: "pointer",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                      transition: "transform 0.15s, box-shadow 0.15s",
                      minHeight: 120
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)'; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 12, background: fc.bg || "var(--color-hover)", color: fc.text || "var(--color-ink)", display: "flex", alignItems: "center", gap: 6 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                          {fc.label}
                        </span>
                        {f.noticeLevel && (
                          <>
                            <span style={{ color: "var(--color-muted)", fontSize: 12 }}>&gt;</span>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 12, background: "var(--flag-orange-bg)", color: "var(--flag-orange-text)" }}>
                              {f.noticeLevel}
                            </span>
                          </>
                        )}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-muted)" }}>#{f.logID || f.id}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <div style={{ flex: 1, paddingRight: 16 }}>
                        <h4 style={{ margin: "0 0 8px 0", fontSize: 16, fontWeight: 800, color: "var(--color-ink)", lineHeight: 1.3 }}>{f.detectedName || f.name || "Unknown Establishment"}</h4>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--color-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                          {shortBarangay(f.barangayName || f.barangay || "—")}
                        </p>
                      </div>
                      
                      <button style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--color-border-soft)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--color-ink)", flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
