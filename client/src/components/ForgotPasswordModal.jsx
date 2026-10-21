import { useState } from 'react';
import { authAPI } from '../services/api';
import {
  HiOutlineKey, HiOutlineEnvelope, HiOutlineCheckCircle,
  HiOutlineExclamationCircle, HiOutlineEye, HiOutlineEyeSlash,
  HiOutlineShieldCheck, HiOutlineArrowPath,
} from 'react-icons/hi2';

const ForgotPasswordModal = ({ isOpen, onClose, initialEmail = '', onSuccess }) => {
  const [step, setStep] = useState('request'); // 'request' | 'reset' | 'completed'
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  if (!isOpen) return null;

  const startResendTimer = () => {
    setResendTimer(45);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await authAPI.forgotPassword(email.trim());
      setSuccessMsg(res.data.message || 'Verification code sent to your email.');
      if (res.data.otp) {
        setDevOtp(res.data.otp);
      }
      setStep('reset');
      startResendTimer();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password with OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the valid 6-digit verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });

      setSuccessMsg(res.data.message || 'Password updated successfully!');
      setStep('completed');
      if (onSuccess) {
        onSuccess(email);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed. Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="modal animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 460,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
        }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(20, 184, 166, 0.15)',
              border: '1px solid rgba(20, 184, 166, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-400)',
              fontSize: '1.25rem',
            }}>
              <HiOutlineKey />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                {step === 'completed' ? 'Password Reset Complete' : 'Reset Your Password'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                Dwarkesh Ratna Co-op Housing Society
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '20px 0 10px' }}>
          {error && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: '0.82rem',
              color: 'var(--danger-400)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}>
              <HiOutlineExclamationCircle style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: 1 }} />
              <div>{error}</div>
            </div>
          )}

          {/* STEP 1: Request OTP */}
          {step === 'request' && (
            <form onSubmit={handleRequestOtp}>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 18 }}>
                Enter the email address registered with your Dwarkesh Ratna CHS account. We will dispatch a secure 6-digit verification code.
              </p>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Registered Email Address</label>
                <div style={{ position: 'relative' }}>
                  <HiOutlineEnvelope style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-tertiary)',
                    fontSize: '1.1rem',
                  }} />
                  <input
                    type="email"
                    className="form-control"
                    style={{ paddingLeft: 38 }}
                    placeholder="e.g. resident@society.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ minWidth: 150 }}
                >
                  {loading ? <span className="loading-spinner" /> : 'Send Reset Code'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Verify OTP & Set New Password */}
          {step === 'reset' && (
            <form onSubmit={handleResetPassword}>
              <div style={{
                background: 'rgba(20, 184, 166, 0.08)',
                border: '1px solid rgba(20, 184, 166, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-400)', fontWeight: 600 }}>
                  <HiOutlineCheckCircle /> Verification code sent!
                </div>
                <div>Code sent to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. It expires in 15 minutes.</div>
              </div>

              {devOtp && (
                <div style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px dashed rgba(99, 102, 241, 0.4)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  marginBottom: 16,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: 'var(--primary-300)',
                }}>
                  <span>⚡ Quick Demo Code: <strong>{devOtp}</strong></span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                    onClick={() => setOtp(devOtp)}
                  >
                    Auto-Fill Code
                  </button>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  className="form-control"
                  style={{
                    letterSpacing: '6px',
                    fontSize: '1.25rem',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                  }}
                  placeholder="------"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/[^0-9]/g, ''));
                    setError('');
                  }}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  New Password (min 6 characters)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-tertiary)',
                      cursor: 'pointer',
                      display: 'flex',
                    }}
                  >
                    {showPassword ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 18 }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                fontSize: '0.8rem',
              }}>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => setStep('request')}
                >
                  ← Change Email
                </button>

                {resendTimer > 0 ? (
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    Resend code in {resendTimer}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary-400)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: 600,
                    }}
                  >
                    <HiOutlineArrowPath size={14} /> Resend Code
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ minWidth: 150 }}
                >
                  {loading ? <span className="loading-spinner" /> : 'Set New Password'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Completed */}
          {step === 'completed' && (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div style={{
                width: 64,
                height: 64,
                margin: '0 auto 16px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '2px solid rgba(34, 197, 94, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4ade80',
                fontSize: '2rem',
              }}>
                <HiOutlineShieldCheck />
              </div>

              <h4 style={{ color: 'var(--text-primary)', marginBottom: 8, fontSize: '1.2rem' }}>
                Password Updated!
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 24 }}>
                Your account password has been successfully reset. You can now log into Dwarkesh Ratna CHS with your new password.
              </p>

              <button
                type="button"
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={onClose}
              >
                Sign In With New Password
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
