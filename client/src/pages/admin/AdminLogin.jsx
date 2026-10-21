import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { seedAPI } from '../../services/api';
import societyLogo from '../../assets/logo.png';
import ForgotPasswordModal from '../../components/ForgotPasswordModal';
import SocialOAuthConsentModal from '../../components/SocialOAuthConsentModal';
import { FcGoogle } from 'react-icons/fc';
import { BsMicrosoft } from 'react-icons/bs';
import { FaGithub, FaApple } from 'react-icons/fa';
import {
  HiOutlineShieldCheck, HiOutlineLockClosed, HiOutlineEnvelope,
  HiOutlineUserGroup, HiOutlineKey, HiOutlineArrowRight,
  HiOutlineExclamationCircle, HiOutlineSparkles,
} from 'react-icons/hi2';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);

  // Modals
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [socialModalProvider, setSocialModalProvider] = useState(null); // 'github' | 'google' | 'microsoft' | 'apple'

  const { login, oauthLogin } = useAuth();
  const navigate = useNavigate();

  // Check incoming OAuth token
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
      let targetRole = oauthRole || 'admin';
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          targetRole = parsed.role || targetRole;
        } catch (e) {}
      }
      window.history.replaceState({}, document.title, window.location.pathname);
      handleRoleRedirect(targetRole);
    }
  }, []);

  const handleRoleRedirect = (role) => {
    switch (role) {
      case 'admin': navigate('/admin'); break;
      case 'guard': navigate('/guard'); break;
      case 'technician': navigate('/technician'); break;
      case 'resident':
        // If resident logged in on admin portal, guide them to resident dashboard
        navigate('/resident');
        break;
      default: navigate('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userData = await login(email.trim(), password);

      // Verify role
      if (userData.role === 'resident') {
        setError('This is a Resident account. Please use the Resident Portal.');
        return;
      }

      handleRoleRedirect(userData.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid administrative credentials. Please check email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthAuthorize = async (payload) => {
    const userData = await oauthLogin({
      ...payload,
      portal: 'admin',
    });
    setSocialModalProvider(null);
    handleRoleRedirect(userData.role);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedAPI.seed();
      setEmail('admin@society.com');
      setPassword('admin123');
    } catch (err) {
      setError('Seeding demo data failed.');
    } finally {
      setSeeding(false);
    }
  };

  const fillQuickCredentials = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError('');
  };

  return (
    <div className="login-page" style={{
      background: 'radial-gradient(ellipse at top, #0f172a 0%, #030712 100%)',
    }}>
      <div className="login-container" style={{ maxWidth: 450 }}>
        <div
          className="login-card animate-slide-up"
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)',
          }}
        >
          {/* Logo & Portal Branding */}
          <div className="login-logo" style={{ marginBottom: 22 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ded7c8',
              padding: '10px 18px',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.2)',
              marginBottom: 14,
            }}>
              <img
                src={societyLogo}
                alt="Dwarkesh Ratna"
                style={{
                  height: 52,
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
              background: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 20,
              padding: '3px 12px',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              <HiOutlineShieldCheck style={{ fontSize: '0.95rem' }} /> Staff & Management Portal
            </div>

            <h1 style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              margin: '2px 0 4px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Dwarkesh Ratna CHS
            </h1>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              Administrative, Security & Operations Console
            </p>
          </div>

          {/* Access Policy Notice */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: 20,
            fontSize: '0.78rem',
            color: '#cbd5e1',
            lineHeight: 1.45,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}>
            <HiOutlineLockClosed style={{ fontSize: '1.25rem', color: '#38bdf8', flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong style={{ color: '#f1f5f9', display: 'block', marginBottom: 2 }}>
                Restricted Administrative Portal
              </strong>
              Staff accounts (Admin, Guard, Technician) are provisioned directly by the Society Management Committee.
            </div>
          </div>

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
              alignItems: 'center',
              gap: 8,
            }}>
              <HiOutlineExclamationCircle style={{ fontSize: '1.1rem', flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Social Sign-In for Bound Staff Accounts */}
          <div style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: '0.74rem',
              color: 'var(--text-tertiary)',
              marginBottom: 8,
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              fontWeight: 600,
            }}>
              Sign In with Bound Enterprise Account:
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              marginBottom: 16,
            }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSocialModalProvider('github')}
                title="GitHub Enterprise Single Sign-On"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '9px 0',
                  borderColor: 'rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <FaGithub style={{ fontSize: '1.25rem', color: '#f0f6fc' }} />
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSocialModalProvider('google')}
                title="Google Workspace"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '9px 0',
                  borderColor: 'rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <FcGoogle style={{ fontSize: '1.25rem' }} />
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSocialModalProvider('microsoft')}
                title="Microsoft Entra ID"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '9px 0',
                  borderColor: 'rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <BsMicrosoft style={{ fontSize: '1.15rem', color: '#00a4ef' }} />
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSocialModalProvider('apple')}
                title="Apple ID"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '9px 0',
                  borderColor: 'rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                <FaApple style={{ fontSize: '1.25rem', color: '#f5f5f7' }} />
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
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ padding: '0 10px' }}>Or Staff Credentials</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>Staff Email Address</label>
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
                  placeholder="admin@society.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Forgot Password?
                </button>
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
                  className="form-control"
                  style={{ paddingLeft: 38 }}
                  placeholder="Enter staff password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{
                width: '100%',
                marginTop: 14,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                borderColor: '#0284c7',
              }}
              disabled={loading}
            >
              {loading ? <span className="loading-spinner" /> : 'Sign In to Management Console'}
            </button>
          </form>

          {/* Social Single Sign-On (OAuth 2.0) Section */}
          <div style={{ margin: '18px 0 12px', position: 'relative', textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ position: 'relative', background: '#0f172a', padding: '0 10px', fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Or Staff Single Sign-On
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
                color: '#f8fafc',
                background: 'rgba(255, 255, 255, 0.04)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
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
                color: '#f8fafc',
                background: 'rgba(255, 255, 255, 0.04)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
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
                color: '#f8fafc',
                background: 'rgba(255, 255, 255, 0.04)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
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
                background: 'rgba(56, 189, 248, 0.08)',
                borderColor: 'rgba(56, 189, 248, 0.3)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <HiOutlineShieldCheck size={18} />
              <span>Custom ID</span>
            </button>
          </div>

          {/* Quick Demo Staff Credentials Selector */}
          <div style={{
            marginTop: 20,
            padding: '12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed rgba(255,255,255,0.15)',
          }}>
            <div style={{
              fontSize: '0.74rem',
              color: '#94a3b8',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span>⚡ Quick Demo Staff Sign-In:</span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                onClick={handleSeed}
                disabled={seeding}
              >
                {seeding ? 'Seeding...' : '🌱 Seed Data'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.74rem', padding: '6px 4px', textAlign: 'center' }}
                onClick={() => fillQuickCredentials('admin@society.com', 'admin123')}
              >
                👑 Admin
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.74rem', padding: '6px 4px', textAlign: 'center' }}
                onClick={() => fillQuickCredentials('guard@society.com', 'guard123')}
              >
                🛡️ Gate Guard
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.74rem', padding: '6px 4px', textAlign: 'center' }}
                onClick={() => fillQuickCredentials('tech@society.com', 'tech123')}
              >
                🔧 Technician
              </button>
            </div>
          </div>

          {/* Switcher back to Resident Portal */}
          <div style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: '#94a3b8' }}>
              Looking for Society Resident Services?
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#34d399',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <span>Switch to Resident Portal</span>
              <HiOutlineArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        initialEmail={email}
        onSuccess={(resetEmail) => {
          setEmail(resetEmail);
          setPassword('');
        }}
      />

      {/* Social OAuth Enterprise Consent Modal */}
      <SocialOAuthConsentModal
        isOpen={!!socialModalProvider}
        provider={socialModalProvider || 'github'}
        portal="admin"
        onClose={() => setSocialModalProvider(null)}
        onAuthorize={handleOAuthAuthorize}
      />
    </div>
  );
};

export default AdminLogin;
