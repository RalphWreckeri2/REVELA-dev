/**
 * DashboardLayout.jsx
 *
 * Reusable shell for every authenticated page.
 * Contains: Sidebar + Top Navbar + ambient background.
 * Usage:
 *   <DashboardLayout user={{ initials: "JD", name: "J. Dela Cruz" }}>
 *     <HomePage />
 *   </DashboardLayout>
 *
 * Props:
 *   children  — page content rendered inside .saas-content
 *   user      — { initials: string, name: string }
 *   logo      — imported logo asset (optional)
 */

import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/global.css";
import Swal from "sweetalert2";
import myLogo from "../assets/logo.png";
import ProfileModal from "../pages/ProfileModal";

// ── Nav config — add new pages here, never touch the layout ──
const NAV_ITEMS = [
  {
    group: "Main",
    items: [
      {
        label: "Overview",
        path: "/home",
        href: "/home",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
      {
        label: "Map & Flags",
        path: "/map",
        href: "/map",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="10" r="3" />
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          </svg>
        ),
      },
      {
        label: "Registry",
        path: "/registry",
        href: "/registry",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
      },
      {
        label: "Analytics",
        path: "/analytics",
        href: "/analytics",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        ),
      },
      {
        label: "Inspections",
        path: "/inspections",
        href: "/inspections",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "Management",
    items: [
      {
        label: "User Management",
        path: "/users",
        href: "/users",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        label: "Export Reports",
        path: "/reports",
        href: "/reports",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "System",
    items: [
      {
        label: "Settings",
        path: "/settings",
        href: "/settings",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2" />
          </svg>
        ),
      },
    ],
  },
];

// ── Sub-components (private to this file) ──────────────────

function NavBadge({ variant = "red", count }) {
  return <span className={`badge badge--${variant}`}>{count}</span>;
}

function Sidebar({ onLogout }) {
  const location = useLocation();

  return (
    <aside className="saas-sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-logo">
          <img src={myLogo} alt="REVELA Logo" className="logo-img" />
        </div>
        <h2>REVELA</h2>
      </div>

      {/* Nav groups */}
      <div className="sidebar-scroll">
        {NAV_ITEMS.map(({ group, items }, gi) => (
          <div key={group}>
            {gi > 0 && <div className="menu-divider" />}
            <span className="menu-group-label">{group}</span>

            {items.map(({ label, href, path, badge, icon }) => {
              const isActive = path && location.pathname === path;
              return path ? (
                <Link
                  key={label}
                  to={path}
                  className={`menu-item${isActive ? " active" : ""}`}
                >
                  {icon}
                  {label}
                  {badge && <NavBadge variant={badge.variant} count={badge.count} />}
                </Link>
              ) : (
                <a key={label} href={href} className="menu-item">
                  {icon}
                  {label}
                  {badge && <NavBadge variant={badge.variant} count={badge.count} />}
                </a>
              );
            })}
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}

function TopNavbar({ user = { initials: "JD", name: "J. Dela Cruz" }, searchPlaceholder = "Search businesses, barangays...", onProfileClick }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationButtonRef = useRef(null);
  const notificationPopoverRef = useRef(null);
  const navigate = useNavigate();

  const notifications = [
    { id: 1, title: "New inspection assigned", body: "Inspector assigned to F-001 in Poblacion I.", time: "2m ago" },
    { id: 2, title: "Flag status updated", body: "F-003 risk now marked as high priority.", time: "12m ago" },
    { id: 3, title: "Report ready", body: "Your weekly compliance summary is available.", time: "1h ago" },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showNotifications &&
        notificationPopoverRef.current &&
        !notificationPopoverRef.current.contains(event.target) &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  return (
    <header className="top-navbar frosted-glass">
      {/*<div className="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input type="text" placeholder={searchPlaceholder} />
      </div>*/}

      <div className="top-nav-right">
        <div className="notification-wrapper">
          <button
            ref={notificationButtonRef}
            className="icon-btn"
            aria-label="Notifications"
            aria-expanded={showNotifications}
            onClick={() => setShowNotifications((prev) => !prev)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="nav-badge" />
          </button>

          {showNotifications && (
            <div className="notification-popover" ref={notificationPopoverRef}>
              <div className="notification-popover__header">Notifications</div>
              <div className="notification-list">
                {notifications.map((note) => (
                  <div key={note.id} className="notification-item">
                    <strong>{note.title}</strong>
                    <p>{note.body}</p>
                    <span>{note.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          className="nav-profile"
          type="button"
          onClick={onProfileClick}
        >
          <div className="nav-avatar">{user.initials}</div>
          <div className="nav-user-info">
            <span className="welcome-text">Welcome</span>
            <span className="user-name">{user.name} ▾</span>
          </div>
        </button>
      </div>
    </header>
  );
}

// ── Public export ──────────────────────────────────────────

/**
 * @param {{ children: React.ReactNode, user?: object, onLogout?: () => void }} props
 */
export default function DashboardLayout({ children, onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();

  const handleLogout = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You will be logged out of the system.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, log out'
    }).then((result) => {
      if (result.isConfirmed) {
        if (typeof onLogout === "function") {
          onLogout();
        } else if (logout) {
          logout();
        }
        navigate("/");
      }
    });
  };

  const displayUser = {
    initials: authUser?.fullName 
      ? authUser.fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() 
      : "?",
    name: authUser?.fullName || "Unknown User"
  };

  return (
    <div className={`saas-root ${isMobileMenuOpen ? "mobile-open" : ""}`}>
      
      <button 
        className="mobile-toggle" 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >

        {isMobileMenuOpen ? "✕" : "☰"}
      
      </button>
      <Sidebar onLogout={handleLogout} />

      <div className="saas-main">
        <div className="ambient-bg-mesh" />
        <TopNavbar user={displayUser} onProfileClick={() => setShowProfileModal(true)} />

        {/* Each page owns its .saas-content padding via this wrapper */}
        <main className="saas-content">
          {children}
        </main>
      </div>

      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
    </div>
  );
}
