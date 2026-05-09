import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { requestOtpRequest, resetPasswordRequest, verify2faRequest } from "../services/api";
import "../styles/LoginPage.css";
import sealImg from "../assets/seal.png";

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icon = {
  Eye: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  EyeOff: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
};

// ── Reusable alert banner ─────────────────────────────────────────────────────
function Alert({ type, message }) {
  if (!message) return null;
  const isError = type === "error";
  return (
    <div className={`message-alert message-alert--${type}`}>
      {isError ? (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="7" />
          <path d="M8 5v3M8 11h.01" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="7" />
          <path d="M5 8l2 2 4-4" />
        </svg>
      )}
      {message}
    </div>
  );
}

// ── Forgot Password Modal ─────────────────────────────────────────────────────
function ForgotPasswordModal({ onClose, onSuccess }) {
  return (
    <div className="forgot-modal">
      <div className="forgot-modal-content">
        <h3>Forgot Password</h3>
        <p>This feature is under development.</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login, completeLogin } = useAuth();
  const navigate = useNavigate();

  // -- 2FA
  const [loginStep, setLoginStep] = useState("credentials"); 
  const [tempToken, setTempToken] = useState(null); 
  const [totpCode, setTotpCode] = useState("");

  // ── Login state ──
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Forgot password state ──
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = email, 2 = otp, 3 = new password
  const [identifier, setIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState(null);
  const [forgotSuccess, setForgotSuccess] = useState(null);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    if (!username || !password) {
      setLoginError("Please enter your email and password.");
      return;
    }
    setLoginError(null);
    setLoginLoading(true);

    try {
      const response = await login(username, password);
      
      // Check if the backend says 2FA is needed
      if (response?.status === "2fa_required") {
        setTempToken(response.tempToken);
        setLoginStep("2fa"); // Change the UI to show OTP input
      } else {
        navigate("/home");
      }
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!identifier) {
      setForgotError("Please enter your email or phone number.");
      return;
    }
    setForgotError(null);
    setForgotLoading(true);
    try {
      await requestOtpRequest(identifier);
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    if (!otpCode || otpCode.length < 5) {
      setForgotError("Please enter the 5-digit OTP sent to you.");
      return;
    }
    setForgotError(null);
    setForgotStep(3); // OTP is verified on final submit, not separately
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setForgotError("Please fill in both password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setForgotError("Password must be at least 8 characters.");
      return;
    }
    setForgotError(null);
    setForgotLoading(true);
    try {
      await resetPasswordRequest(identifier, otpCode, newPassword);
      setForgotSuccess("Password reset successful! You can now log in.");
      // Reset everything after 2 seconds then close
      setTimeout(() => {
        setShowForgot(false);
        setForgotStep(1);
        setIdentifier("");
        setOtpCode("");
        setNewPassword("");
        setConfirmPassword("");
        setForgotSuccess(null);
      }, 2500);
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotClose = () => {
    setShowForgot(false);
    setForgotStep(1);
    setIdentifier("");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotError(null);
    setForgotSuccess(null);
  };

const handleVerify2FA = async () => {
    if (!totpCode || totpCode.length < 6) {
      setLoginError("Please enter your 6-digit Authenticator code.");
      return;
    }
    setLoginError(null);
    setLoginLoading(true);
    try {
      const response = await verify2faRequest(tempToken, totpCode);
      await completeLogin(response.access_token);
      navigate("/home");
    } catch (err) {
      setLoginError(err.message || "Invalid code. Please try again.");
    } finally {
      setLoginLoading(false);
    }
};

  // ── Step labels ───────────────────────────────────────────────────────────────
  const stepLabel = ["", "Step 1 of 3 — Identify Account", "Step 2 of 3 — Enter OTP", "Step 3 of 3 — New Password"];

  return (
    <div className="login-root">
      <div className="topo-overlay" />
      <div className="orb orb-tl" />
      <div className="orb orb-br" />
      <div className="orb orb-mid" />

      <div className="login-card">

        {/* ── LEFT PANEL — unchanged ── */}
        <div className="left-panel">
          <div className="left-inner-orb" />
          <div className="seal-row">
            <img src={sealImg} alt="Seal of Mataasnakahoy" className="seal" />
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
            <p className="tagline">Geospatial Business<br />Intelligence System</p>
            <div className="brand-divider" />
            <p className="brand-desc">Compliance Monitoring &amp;<br />Non-Registered Business Detection</p>
          </div>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div className="right-panel">
          <div className="portal-pill">
            <span className="portal-dot" />
            <span className="portal-label">BPLO Admin Portal</span>
          </div>

        <h2 className="form-heading">{loginStep === "credentials" ? "Welcome back" : "Two-Step Verification"}</h2>
        <p className="form-sub">{loginStep === "credentials" ? "Sign in to access the compliance dashboard" : "Secure your account"}</p>

          <Alert type="error" message={loginError} />

        {loginStep === "credentials" && (
          <>
            {/* ── Username ── */}
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
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            {/* ── Password ── */}
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
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button className="pw-toggle" onClick={() => setShowPassword(!showPassword)} type="button">
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

            {/* ── Forgot password toggle ── */}
            <div className="forgot-row">
              <button className="forgot-btn" type="button" onClick={() => setShowForgot(!showForgot)}>
                Forgot password?
              </button>
            </div>

            {/* ── Password Reset Flow ── */}
            {showForgot && (
              <div className="otp-box">

                {/* Step indicator + close */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#56ab2f", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {stepLabel[forgotStep]}
                  </span>
                  <button onClick={handleForgotClose} type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(26,58,26,0.4)", fontSize: "18px", lineHeight: 1 }}>
                    ✕
                  </button>
                </div>

                <Alert type="error" message={forgotError} />
                <Alert type="success" message={forgotSuccess} />

                {/* ── Step 1: Enter email/phone ── */}
                {forgotStep === 1 && (
                  <>
                    <p className="otp-desc">Enter your registered email or phone number to receive a one-time password.</p>
                    <div className="otp-action-row">
                      <input
                        type="text"
                        className="glass-input glass-input--otp"
                        placeholder="Email or phone number"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                      />
                      <button className="otp-send-btn" type="button" onClick={handleSendOtp} disabled={forgotLoading}>
                        {forgotLoading ? "Sending..." : "Send OTP"}
                      </button>
                    </div>
                  </>
                )}

                {/* ── Step 2: Enter OTP ── */}
                {forgotStep === 2 && (
                  <>
                    <p className="otp-desc">Enter the 5-digit OTP sent to <strong>{identifier}</strong>.</p>
                    <div className="otp-action-row">
                      <input
                        type="text"
                        className="glass-input glass-input--otp"
                        placeholder="e.g. 48291"
                        maxLength={5}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      />
                      <button className="otp-send-btn" type="button" onClick={handleVerifyOtp}>
                        Verify
                      </button>
                    </div>
                    <button type="button" onClick={() => setForgotStep(1)}
                      style={{ marginTop: "10px", background: "none", border: "none", fontSize: "12px", color: "#56ab2f", cursor: "pointer" }}>
                      ← Back / Resend OTP
                    </button>
                  </>
                )}

                {/* ── Step 3: New password ── */}
                {forgotStep === 3 && (
                  <>
                    <p className="otp-desc">Choose a strong new password for your account.</p>
                    <div className="field" style={{ marginBottom: "12px" }}>
                      <label className="field-label">New Password</label>
                      <div className="input-wrap">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          className="glass-input glass-input--pw"
                          placeholder="Min. 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button className="pw-toggle" type="button" onClick={() => setShowNewPassword(!showNewPassword)}>
                          {showNewPassword ? (
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
                    <div className="field" style={{ marginBottom: "14px" }}>
                      <label className="field-label">Confirm Password</label>
                      <div className="input-wrap">
                        <input
                          type="password"
                          className="glass-input"
                          placeholder="Repeat new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <button className="otp-send-btn" type="button" onClick={handleResetPassword}
                      disabled={forgotLoading} style={{ width: "100%", padding: "12px" }}>
                      {forgotLoading ? "Resetting..." : "Reset Password"}
                    </button>
                  </>
                )}

              </div>
            )}
          </>
          )}

        {/* ── 2FA Code Flow ── */}
        {loginStep === "2fa" && (
          <div className="otp-box" style={{ marginTop: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#56ab2f", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Authenticator Code
              </span>
            </div>
            <p className="otp-desc">Enter the 6-digit code from your Authenticator app.</p>
            <div className="otp-action-row">
              <input
                type="text"
                className="glass-input glass-input--otp"
                placeholder="e.g. 123456"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleVerify2FA()}
              />
            </div>
            <button type="button" onClick={() => setLoginStep("credentials")}
              style={{ marginTop: "10px", background: "none", border: "none", fontSize: "12px", color: "#56ab2f", cursor: "pointer" }}>
              ← Back to Login
            </button>
          </div>
        )}

          {/* ── Primary CTA ── */}
          <button 
            className="signin-btn" 
            type="button" 
          onClick={loginStep === "credentials" ? handleLogin : handleVerify2FA} 
            disabled={loginLoading}
          >
            {loginLoading ? (
              <div className="btn-loader-container">
                <span className="spinner"></span>
                Signing in...
              </div>
            ) : (
            loginStep === "credentials" ? "Secure Login" : "Verify Code"
            )}
          </button>

          <p className="legal-note">
            RESTRICTED ACCESS: Authorized BPLO personnel only.<br />
            Violators will be prosecuted under RA 10175.
          </p>
        </div>
      </div>
    </div>
  );
}