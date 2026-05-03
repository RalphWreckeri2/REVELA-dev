import "../styles/HomePage.css";

export default function HomePage() {
  return (
    <div className="saas-root">
      
      {/* ── MINIMAL GLASS SIDEBAR ── */}
      <aside className="saas-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          <h2>REVELA</h2>
        </div>

        <div className="sidebar-scroll">
          
          <div className="menu-group">
            <a href="#" className="menu-item active">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>
              Overview
            </a>
            <a href="#" className="menu-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Heatmap
              <span className="badge">7</span>
            </a>
            <a href="#" className="menu-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
              Flag Registry
              <span className="badge red">24</span>
            </a>
          </div>

          <div className="menu-divider" />

          <div className="menu-group">
            <a href="#" className="menu-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              Inspection Tasks
            </a>
            <a href="#" className="menu-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
              Mobile App
            </a>
          </div>

          <div className="menu-divider" />

          <div className="menu-group">
            <a href="#" className="menu-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              Analytics
            </a>
            <a href="#" className="menu-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              Business Registry
            </a>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN LAYOUT WITH AMBIENT BACKGROUND ── */}
      <div className="saas-main">
        {/* Ambient mesh gradient so the glass cards have something to blur against */}
        <div className="ambient-bg-mesh"></div>
        
        {/* FROSTED TOP NAVBAR */}
        <header className="top-navbar frosted-glass">
          <div className="search-bar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Search..." />
          </div>

          <div className="top-nav-right">
            <button className="icon-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              <span className="nav-badge"></span>
            </button>
            <div className="nav-profile">
              <div className="nav-avatar">JD</div>
              <div className="nav-user-info">
                <span className="welcome-text">Welcome</span>
                <span className="user-name">J. Dela Cruz ▾</span>
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="saas-content">
          
          {/* 1. HALF-SCREEN HERO BANNER */}
          <section className="saas-hero">
            <div className="saas-topo-overlay"></div>
            <div className="hero-inner">
              <div className="hero-text-content">
                <span className="hero-tag">Mataasnakahoy Portal</span>
                <h1>Geospatial Business Intelligence</h1>
                <p>
                  REVELA automates compliance monitoring and detects non-registered business entities 
                  through spatial data mapping. A unified dashboard for the Business Permits and Licensing Office.
                </p>
                <button className="saas-primary-btn">Start Evaluation</button>
              </div>
            </div>
          </section>

          {/* 2. WHAT IS REVELA SECTION */}
          <section className="saas-section">
            <h2 className="section-title">What is REVELA?</h2>
            
            <div className="saas-card frosted-glass">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
              <br/>
              <p>
                Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula eu tempor congue, eros est euismod turpis, id tincidunt sapien risus a quam.
              </p>
            </div>
          </section>

          {/* 3. INSTRUCTIONS SECTION */}
          <section className="saas-section">
            <h2 className="section-title">Instructions to Use</h2>
            
            <div className="saas-grid">
              
              <div className="saas-card step-card frosted-glass">
                <div className="step-header">
                  <span className="step-num">01</span>
                  <h3>Access the Map</h3>
                </div>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet.</p>
              </div>

              <div className="saas-card step-card frosted-glass">
                <div className="step-header">
                  <span className="step-num">02</span>
                  <h3>Verify Records</h3>
                </div>
                <p>Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora.</p>
              </div>

              <div className="saas-card step-card frosted-glass">
                <div className="step-header">
                  <span className="step-num">03</span>
                  <h3>Generate Reports</h3>
                </div>
                <p>Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor maecenas mattis.</p>
              </div>

            </div>
          </section>

          {/* 4. FOOTER */}
          <footer className="saas-footer frosted-glass">
            <p>&copy; 2026 Municipality of Mataasnakahoy. All Rights Reserved.</p>
            <p className="footer-links">
              <span>BPLO Portal</span> • <span>Terms of Service</span> • <span>Privacy Policy</span>
            </p>
          </footer>

        </main>
      </div>

    </div>
  );
}