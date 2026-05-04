import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css";
import sealImg from "../assets/seal.png";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!username || !password) {
      window.alert("Please enter your username and password.");
      return;
    }
    navigate("/home");
  };

  const handleSendOtp = () => {
    if (!username) {
      window.alert("Enter your username or email first to receive an OTP.");
      return;
    }
    window.alert("One-time password sent to your registered contact.");
    setShowOtp(true);
  };

  return (
    <div className="login-root">
      {/* Topographic Map Overlay */}
      <div className="topo-overlay" />

      {/* Animated Fluid Orbs */}
      <div className="orb orb-tl" />
      <div className="orb orb-br" />
      <div className="orb orb-mid" />

      <div className="login-card">
        {/* ── LEFT PANEL ── */}
        <div className="left-panel">
          <div className="left-inner-orb" />

          <div className="seal-row">
            <img 
              src={sealImg} 
              alt="Seal of Mataasnakahoy" 
              className="seal" 
            />
            <div>
              <p className="muni-pre">Municipality of</p>
              <p className="muni-name">Mataasnakahoy</p>
              <p className="muni-loc">Batangas, Philippines</p>
            </div>
          </div>

          <div className="left-brand">
            <div className="gold-bar" />
            <p className="powered-by">Powered by</p>
            <h1 className="wordmark">REVELA</h1>
            <p className="tagline">
              Geospatial Business<br />Intelligence System
            </p>
            <div className="brand-divider" />
            <p className="brand-desc">
              Compliance Monitoring &amp;<br />
              Non-Registered Business Detection
            </p>
          </div>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div className="right-panel">
          <div className="portal-pill">
            <span className="portal-dot" />
            <span className="portal-label">BPLO Admin Portal</span>
          </div>

          <h2 className="form-heading">Welcome back</h2>
          <p className="form-sub">
            Sign in to access the compliance dashboard
          </p>

          {/* Username */}
          <div className="field">
            <label className="field-label">Username or Email</label>
            <div className="input-wrap">
              <svg className="input-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="8" cy="5" r="3"/>
                <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
              </svg>
              <input
                type="text"
                className="glass-input"
                placeholder="admin@mataasnakahoy.gov.ph"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          {/* Password */}
          <div className="field">
             <label className="field-label">Password</label>
            <div className="input-wrap">
              <svg className="input-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="7" width="10" height="8" rx="1.5"/>
                <path d="M5 7V5a3 3 0 016 0v2"/>
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                className="glass-input glass-input--pw"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                className="pw-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
                type="button"
              >
                {showPassword ? (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 2l12 12M6.5 6.7A2 2 0 009.3 9.5"/>
                    <path d="M4.2 4.4C2.4 5.5 1 8 1 8s2.5 5 7 5c1.4 0 2.7-.4 3.8-1M7 3.1C7.3 3 7.7 3 8 3c4.5 0 7 5 7 5s-.7 1.4-1.9 2.7"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/>
                    <circle cx="8" cy="8" r="2"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div className="forgot-row">
            <button className="forgot-btn" type="button" onClick={() => setShowOtp(!showOtp)}>
              Forgot password?
            </button>
          </div>

          {/* OTP recovery */}
          {showOtp && (
            <div className="otp-box">
              <p className="otp-desc">
                Enter your registered email or phone number to receive a one-time password.
              </p>
              <div className="otp-action-row">
                <input
                  type="text"
                  className="glass-input glass-input--otp"
                  placeholder="Email or phone"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                />
                <button className="otp-send-btn" type="button" onClick={handleSendOtp}>Send OTP</button>
              </div>
            </div>
          )}

          {/* Primary CTA */}
          <button className="signin-btn" type="button" onClick={handleLogin}>Secure Login</button>

          <p className="legal-note">
            RESTRICTED ACCESS: Authorized BPLO personnel only.<br />
            Violators will be prosecuted under RA 10175.
          </p>
        </div>
      </div>
    </div>
  );
}