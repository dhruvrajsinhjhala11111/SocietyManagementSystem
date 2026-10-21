import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { seedAPI } from '../services/api';
import societyLogo from '../assets/logo.png';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import SocialOAuthConsentModal from '../components/SocialOAuthConsentModal';
import { FcGoogle } from 'react-icons/fc';
import { BsMicrosoft } from 'react-icons/bs';
import { FaGithub, FaApple } from 'react-icons/fa';
import {
  HiOutlineHomeModern, HiOutlineEnvelope, HiOutlineUser,
  HiOutlineKey, HiOutlineArrowRight, HiOutlineShieldCheck,
  HiOutlineExclamationCircle, HiOutlineEye, HiOutlineEyeSlash,
} from 'react-icons/hi2';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Modals
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [socialModalProvider, setSocialModalProvider] = useState(null); // 'github' | 'google' | 'microsoft' | 'apple'

  const { login, register, oauthLogin } = useAuth();
  const navigate = useNavigate();

  // Handle incoming OAuth token from Google / GitHub / Microsoft handshake redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('oauth_token');
    const oauthRole = params.get('oauth_role');
    const oauthError = params.get('error');

    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      return;
    }

    if (oauthToken) {
      const stored = localStorage.getItem('user');
      let targetRole = oauthRole || 'resident';
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          targetRole = parsed.role || targetRole;
        } catch (e) {}
      }
      // Clean query parameters from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      handleRoleRedirect(targetRole);
    }
  }, []);

  // Registration form
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'resident',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setRegSuccess('');
  };

  const handleRoleRedirect = (role) => {
    switch (role) {
      case 'admin': navigate('/admin'); break;
      case 'resident': navigate('/resident'); break;
      case 'guard': navigate('/guard'); break;
      case 'technician': navigate('/technician'); break;
      default: navigate('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRegSuccess('');

    try {
      let userData;
      if (isLogin) {
        userData = await login(form.email.trim(), form.password);
      } else {
        // Enforce resident role on public registration
        userData = await register({
          ...form,
          role: 'resident',
        });
        setRegSuccess(`Registration confirmed! An official welcome & verification email has been dispatched to ${form.email}.`);
        await new Promise((r) => setTimeout(r, 1500));
      }

      handleRoleRedirect(userData.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthAuthorize = async (payload) => {
    const userData = await oauthLogin({
      ...payload,
      portal: 'resident',
    });
    setSocialModalProvider(null);
    handleRoleRedirect(userData.role);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedAPI.seed();
      setForm((prev) => ({
        ...prev,
        email: 'resident@society.com',
        password: 'resident123',
      }));
      setIsLogin(true);
    } catch (err) {
      setError('Seeding demo data failed.');
    } finally {
      setSeeding(false);
    }
  };

  const fillQuickResident = () => {
    setForm((prev) => ({
      ...prev,
      email: 'resident@society.com',
      password: 'resident123',
    }));
    setIsLogin(true);
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card animate-slide-up">
          {/* Logo & Resident Portal Badge */}
          <div className="login-logo" style={{ marginBottom: 20 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ded7c8',
              padding: '10px 18px',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.15)',
              marginBottom: 12,
            }}>
              <img
                src={societyLogo}
                alt="Dwarkesh Ratna"
                style={{
                  height: 54,
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(20, 184, 166, 0.12)',
              color: '#2dd4bf',
              border: '1px solid rgba(20, 184, 166, 0.3)',
              borderRadius: 20,
              padding: '3px 12px',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              <HiOutlineHomeModern style={{ fontSize: '0.95rem' }} /> Resident & Member Portal
            </div>

            <h1>Dwarkesh Ratna</h1>
            <p>Co-op Housing Society Resident Services</p>
          </div>

          {/* Sign In vs Register Tabs */}
          <div className="login-tabs">
            <button
              className={`login-tab ${isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(true); setError(''); setRegSuccess(''); }}
            >
              Sign In
            </button>
            <button
              className={`login-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(false); setError(''); setRegSuccess(''); }}
            >
              Register (Resident)
            </button>
          </div>

          {error && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '0.82rem',
              color: 'var(--danger-400)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <HiOutlineExclamationCircle style={{ fontSize: '1.1rem', flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {regSuccess && (
            <div style={{
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              color: '#86efac',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              lineHeight: 1.4,
            }}>
              <span style={{ fontSize: '1.2rem' }}>✉️</span>
              <span>{regSuccess}</span>
            </div>
          )}

          {/* Social Sign-In Buttons */}
          {isLogin && (
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: '0.74rem',
                color: 'var(--text-tertiary)',
                marginBottom: 8,
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontWeight: 600,
              }}>
                Instant Sign In / Sign Up With:
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 10,
                marginBottom: 16,
              }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setSocialModalProvider('github')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '9px 12px',
                    fontSize: '0.85rem',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <FaGithub style={{ fontSize: '1.15rem', color: '#f0f6fc' }} /> GitHub
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setSocialModalProvider('google')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '9px 12px',
                    fontSize: '0.85rem',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <FcGoogle style={{ fontSize: '1.15rem' }} /> Google
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setSocialModalProvider('microsoft')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '9px 12px',
                    fontSize: '0.85rem',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <BsMicrosoft style={{ fontSize: '1.05rem', color: '#00a4ef' }} /> Microsoft
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setSocialModalProvider('apple')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '9px 12px',
                    fontSize: '0.85rem',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <FaApple style={{ fontSize: '1.2rem', color: '#f5f5f7' }} /> Apple ID
                </button>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                margin: '14px 0',
                color: 'var(--text-tertiary)',
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                <span style={{ padding: '0 10px' }}>Or With Password</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
              </div>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(20, 184, 166, 0.1)',
                  border: '1px solid rgba(20, 184, 166, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                }}>
                  <strong style={{ color: 'var(--primary-300)', display: 'block', marginBottom: 2 }}>
                    Account Type: Resident / Flat Member
                  </strong>
                  <span>Admin, Gatekeeper, and Technician staff accounts must be provisioned via the Management Office.</span>
                </div>

                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    placeholder="e.g. Amit Sharma"
                    value={form.name}
                    onChange={handleChange}
                    required={!isLogin}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    className="form-control"
                    placeholder="10-digit mobile number"
                    value={form.phone}
                    onChange={handleChange}
                    required={!isLogin}
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Email Address</label>
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
                  name="email"
                  className="form-control"
                  style={{ paddingLeft: 38 }}
                  placeholder="resident@society.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ margin: 0 }}>Password</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(true)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary-400)',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <HiOutlineKey style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                  fontSize: '1.1rem',
                }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-control"
                  style={{ paddingLeft: 38, paddingRight: 38 }}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
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
                  {showPassword ? <HiOutlineEyeSlash size={16} /> : <HiOutlineEye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading}
            >
              {loading ? <span className="loading-spinner" /> : (isLogin ? 'Sign In as Resident' : 'Create Resident Account')}
            </button>
          </form>

          {/* Social Single Sign-On (OAuth 2.0) Section */}
          <div style={{ margin: '20px 0 14px', position: 'relative', textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'var(--border-color)' }} />
            <span style={{ position: 'relative', background: 'var(--surface-color)', padding: '0 12px', fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Or Continue With Social ID
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
            <a
              href="http://localhost:5000/auth/google"
              className="btn btn-outline"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: '0.84rem',
                padding: '9px 10px',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                background: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'var(--border-color)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <FcGoogle size={18} />
              <span>Google</span>
            </a>

            <a
              href="http://localhost:5000/auth/github"
              className="btn btn-outline"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: '0.84rem',
                padding: '9px 10px',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                background: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'var(--border-color)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <FaGithub size={18} />
              <span>GitHub</span>
            </a>

            <a
              href="http://localhost:5000/auth/microsoft"
              className="btn btn-outline"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: '0.84rem',
                padding: '9px 10px',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                background: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'var(--border-color)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <BsMicrosoft size={16} color="#00a4ef" />
              <span>Microsoft</span>
            </a>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setSocialModalProvider('google')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: '0.84rem',
                padding: '9px 10px',
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.06)',
                borderColor: 'rgba(56, 189, 248, 0.3)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <HiOutlineShieldCheck size={18} />
              <span>Custom ID</span>
            </button>
          </div>

          {/* Quick Demo Fill & Seed */}
          <div style={{
            marginTop: 18,
            padding: '10px 14px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={fillQuickResident}
              style={{ fontSize: '0.74rem', padding: '4px 10px' }}
            >
              🏡 Fill Resident Demo
            </button>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleSeed}
              disabled={seeding}
              style={{ fontSize: '0.74rem', padding: '4px 10px' }}
            >
              {seeding ? 'Seeding...' : '🌱 Seed Data'}
            </button>
          </div>

          {/* Dedicated Portal Switcher to Admin / Staff Login */}
          <div style={{
            marginTop: 22,
            paddingTop: 16,
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Are you a Society Administrator, Guard or Technician?
            </p>
            <Link
              to="/admin/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#38bdf8',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <HiOutlineShieldCheck style={{ fontSize: '1.1rem' }} />
              <span>Go to Staff & Admin Portal</span>
              <HiOutlineArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        initialEmail={form.email}
        onSuccess={(resetEmail) => {
          setForm((prev) => ({ ...prev, email: resetEmail, password: '' }));
          setIsLogin(true);
        }}
      />

      {/* Social OAuth Enterprise Consent Modal */}
      <SocialOAuthConsentModal
        isOpen={!!socialModalProvider}
        provider={socialModalProvider || 'github'}
        portal="resident"
        onClose={() => setSocialModalProvider(null)}
        onAuthorize={handleOAuthAuthorize}
      />
    </div>
  );
};

export default Login;
