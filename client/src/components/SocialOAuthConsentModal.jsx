import { useState } from 'react';
import societyLogo from '../assets/logo.png';
import { FaGithub, FaApple } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { BsMicrosoft } from 'react-icons/bs';
import {
  HiOutlineShieldCheck, HiOutlineCheck, HiOutlineLockClosed,
  HiOutlineUser, HiOutlineBuildingOffice2, HiOutlineKey,
  HiOutlineExclamationCircle,
} from 'react-icons/hi2';

const SocialOAuthConsentModal = ({
  isOpen,
  onClose,
  provider = 'github', // 'github' | 'google' | 'microsoft' | 'apple'
  portal = 'resident', // 'resident' | 'admin'
  onAuthorize,
}) => {
  const [authorizing, setAuthorizing] = useState(false);
  const [authStep, setAuthStep] = useState('consent'); // 'consent' | 'authorizing' | 'success'
  const [error, setError] = useState('');

  // Selected or customized user account details
  const [customHandle, setCustomHandle] = useState(
    portal === 'admin' ? 'admin_committee' : 'resident_amit'
  );
  const [customEmail, setCustomEmail] = useState(
    portal === 'admin' ? 'admin@society.com' : 'resident@society.com'
  );
  const [customName, setCustomName] = useState(
    portal === 'admin' ? 'Society Management Admin' : 'Amit Sharma (Flat A-402)'
  );
  const [editingAccount, setEditingAccount] = useState(false);

  if (!isOpen) return null;

  const handleAuthorizeClick = async () => {
    setAuthorizing(true);
    setAuthStep('authorizing');
    setError('');

    try {
      // Simulate realistic OAuth handshake latency
      await new Promise((r) => setTimeout(r, 900));

      const payload = {
        provider,
        email: customEmail.trim(),
        name: customName.trim(),
        username: customHandle.trim(),
        avatar: '',
        providerId: `${provider}_${customHandle}_${Date.now().toString(36)}`,
        portal,
      };

      await onAuthorize(payload);
      setAuthStep('success');
    } catch (err) {
      console.error('OAuth authorization error:', err);
      setAuthStep('consent');
      setError(err.response?.data?.message || err.message || 'OAuth authorization failed. Please try again.');
    } finally {
      setAuthorizing(false);
    }
  };

  const getBrowserUrl = () => {
    return `${window.location.protocol}//${window.location.hostname}:5000/auth/${provider}`;
  };

  const providerThemes = {
    github: {
      brandName: 'GitHub',
      headerBg: '#161b22',
      cardBg: '#0d1117',
      borderColor: '#30363d',
      buttonBg: '#238636',
      buttonHover: '#2ea043',
      buttonText: '#ffffff',
      icon: <FaGithub style={{ fontSize: '1.4rem', color: '#ffffff' }} />,
      orgScope: 'Dwarkesh Ratna Co-op Housing Society (verified)',
      scopes: [
        { title: 'Personal user data', desc: 'Read access to public profile info (name, handle, avatar)' },
        { title: 'Email addresses', desc: 'Read access to your verified primary email address' },
        { title: 'Dwarkesh Society Identity', desc: 'Grant single sign-on access to society member services' },
      ],
    },
    google: {
      brandName: 'Google Workspace',
      headerBg: '#ffffff',
      cardBg: '#ffffff',
      borderColor: '#dadce0',
      textColor: '#202124',
      buttonBg: '#1a73e8',
      buttonHover: '#1557b0',
      buttonText: '#ffffff',
      icon: <FcGoogle style={{ fontSize: '1.4rem' }} />,
      orgScope: 'dwarkeshratna.org (verified Google Cloud App)',
      scopes: [
        { title: 'See your primary Google Account email address', desc: 'Confirm your registered society identity' },
        { title: 'See your personal info', desc: 'View full name and profile picture' },
        { title: 'Associate your Google account', desc: 'Secure token authentication with Dwarkesh Portal' },
      ],
    },
    microsoft: {
      brandName: 'Microsoft Entra ID',
      headerBg: '#242424',
      cardBg: '#1b1b1b',
      borderColor: '#383838',
      buttonBg: '#0078d4',
      buttonHover: '#106ebe',
      buttonText: '#ffffff',
      icon: <BsMicrosoft style={{ fontSize: '1.25rem', color: '#00a4ef' }} />,
      orgScope: 'Dwarkesh Ratna Society Directory (Tenant #DRCHS-2026)',
      scopes: [
        { title: 'Sign you in and read your profile', desc: 'View basic organization and profile details' },
        { title: 'Maintain access to data you have given it access to', desc: 'OAuth token refresh' },
      ],
    },
    apple: {
      brandName: 'Apple ID',
      headerBg: '#000000',
      cardBg: '#161617',
      borderColor: '#333336',
      buttonBg: '#ffffff',
      buttonHover: '#e5e5e7',
      buttonText: '#000000',
      icon: <FaApple style={{ fontSize: '1.4rem', color: '#ffffff' }} />,
      orgScope: 'Dwarkesh Ratna Housing App (Apple Developer Team)',
      scopes: [
        { title: 'Name and Email Address', desc: 'Share your Apple ID contact card with Dwarkesh Ratna' },
        { title: 'Biometric Credential Relay', desc: 'Face ID / Touch ID signed assertions' },
      ],
    },
  };

  const meta = providerThemes[provider] || providerThemes.github;
  const isGoogleLight = provider === 'google';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 540,
          padding: 0,
          background: meta.cardBg,
          color: isGoogleLight ? '#202124' : '#f0f6fc',
          borderRadius: 14,
          overflow: 'hidden',
          border: `1px solid ${meta.borderColor}`,
          boxShadow: '0 30px 60px rgba(0,0,0,0.7)',
        }}
      >
        {/* Mock Browser Chrome / URL Bar */}
        <div style={{
          background: isGoogleLight ? '#f1f3f4' : meta.headerBg,
          borderBottom: `1px solid ${meta.borderColor}`,
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          {/* Window dots */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f', display: 'inline-block' }} />
          </div>

          {/* URL Pill */}
          <div style={{
            flex: 1,
            background: isGoogleLight ? '#ffffff' : 'rgba(0,0,0,0.3)',
            border: `1px solid ${meta.borderColor}`,
            borderRadius: 6,
            padding: '3px 10px',
            fontSize: '0.72rem',
            color: isGoogleLight ? '#5f6368' : '#8b949e',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
          }}>
            <HiOutlineLockClosed style={{ color: '#2da44e', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{getBrowserUrl()}</span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: isGoogleLight ? '#5f6368' : '#8b949e',
              cursor: 'pointer',
              fontSize: '1rem',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Main Content */}
        <div style={{ padding: '24px 28px' }}>
          {error && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: '0.84rem',
              color: '#fb7185',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}>
              <HiOutlineExclamationCircle style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: 1 }} />
              <div>{error}</div>
            </div>
          )}

          {/* Connected Badges (GitHub <---> Dwarkesh CHS) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            margin: '8px 0 20px',
          }}>
            {/* Identity Provider Logo */}
            <div style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: isGoogleLight ? '#f8f9fa' : 'rgba(255,255,255,0.08)',
              border: `2px solid ${meta.borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
            }}>
              {meta.icon}
            </div>

            {/* Connecting Line with bidirectional arrows */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: '#238636',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}>
                <span style={{ fontSize: '1.1rem' }}>⟷</span>
              </div>
              <span style={{
                fontSize: '0.66rem',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                padding: '2px 8px',
                borderRadius: 10,
                background: isGoogleLight ? '#e6f4ea' : 'rgba(35, 134, 54, 0.18)',
                color: isGoogleLight ? '#137333' : '#3fb950',
                border: '1px solid rgba(35, 134, 54, 0.3)',
                fontWeight: 600,
              }}>
                Authorize OAuth
              </span>
            </div>

            {/* Society Crest Logo */}
            <div style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: '#ded7c8',
              border: '2px solid rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
              padding: 6,
            }}>
              <img
                src={societyLogo}
                alt="Dwarkesh Ratna"
                style={{ width: '85%', height: '85%', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h2 style={{
              margin: '0 0 6px',
              fontSize: '1.35rem',
              fontWeight: 700,
              color: isGoogleLight ? '#202124' : '#f0f6fc',
            }}>
              Authorize Dwarkesh Ratna CHS
            </h2>
            <p style={{
              margin: 0,
              fontSize: '0.84rem',
              color: isGoogleLight ? '#5f6368' : '#8b949e',
              lineHeight: 1.4,
            }}>
              <strong style={{ color: isGoogleLight ? '#1a73e8' : '#58a6ff' }}>Dwarkesh Ratna CHS</strong>{' '}
              by Dwarkesh Society Management Committee wants to access your {meta.brandName} account.
            </p>
          </div>

          {/* User Identity / Account Card */}
          <div style={{
            background: isGoogleLight ? '#f8f9fa' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${meta.borderColor}`,
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#0f766e',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1rem',
              }}>
                {customName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: isGoogleLight ? '#202124' : '#f0f6fc',
                }}>
                  {customName}
                </div>
                <div style={{
                  fontSize: '0.76rem',
                  color: isGoogleLight ? '#5f6368' : '#8b949e',
                }}>
                  Signed in as <strong>@{customHandle}</strong> ({customEmail})
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEditingAccount(!editingAccount)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isGoogleLight ? '#1a73e8' : '#58a6ff',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontWeight: 500,
                textDecoration: 'underline',
              }}
            >
              {editingAccount ? 'Done' : 'Switch Identity'}
            </button>
          </div>

          {/* Quick Identity Switcher Drawer */}
          {editingAccount && (
            <div style={{
              background: isGoogleLight ? '#edf2f7' : '#161b22',
              border: `1px solid ${meta.borderColor}`,
              borderRadius: 8,
              padding: '12px 14px',
              marginBottom: 20,
            }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 600, marginBottom: 8, color: isGoogleLight ? '#333' : '#c9d1d9' }}>
                Select Simulation Account:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                  onClick={() => {
                    setCustomName('Amit Sharma (Flat A-402)');
                    setCustomEmail('resident@society.com');
                    setCustomHandle('amit_resident');
                  }}
                >
                  🏡 Resident (Amit)
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                  onClick={() => {
                    setCustomName('Priya Patel (Flat B-201)');
                    setCustomEmail('priya.patel@gmail.com');
                    setCustomHandle('priya_chs');
                  }}
                >
                  🏡 Resident (Priya)
                </button>
                {portal === 'admin' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                      onClick={() => {
                        setCustomName('Society Management Admin');
                        setCustomEmail('admin@society.com');
                        setCustomHandle('admin_committee');
                      }}
                    >
                      👑 Admin Officer
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                      onClick={() => {
                        setCustomName('Rajesh Kumar (Gatekeeper)');
                        setCustomEmail('guard@society.com');
                        setCustomHandle('rajesh_guard');
                      }}
                    >
                      🛡️ Security Guard
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                      onClick={() => {
                        setCustomName('Suresh Tech (Maintenance)');
                        setCustomEmail('tech@society.com');
                        setCustomHandle('suresh_tech');
                      }}
                    >
                      🔧 Technician
                    </button>
                  </>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: 2 }}>Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      fontSize: '0.78rem',
                      borderRadius: 4,
                      border: `1px solid ${meta.borderColor}`,
                      background: isGoogleLight ? '#fff' : '#0d1117',
                      color: isGoogleLight ? '#202124' : '#fff',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: 2 }}>Email</label>
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      fontSize: '0.78rem',
                      borderRadius: 4,
                      border: `1px solid ${meta.borderColor}`,
                      background: isGoogleLight ? '#fff' : '#0d1117',
                      color: isGoogleLight ? '#202124' : '#fff',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Requested Scopes Section (GitHub style) */}
          <div style={{
            borderTop: `1px solid ${meta.borderColor}`,
            borderBottom: `1px solid ${meta.borderColor}`,
            padding: '16px 0',
            marginBottom: 20,
          }}>
            <div style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: isGoogleLight ? '#5f6368' : '#8b949e',
              marginBottom: 12,
            }}>
              Permissions Requested:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {meta.scopes.map((s, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: isGoogleLight ? '#e6f4ea' : 'rgba(35, 134, 54, 0.2)',
                    color: isGoogleLight ? '#137333' : '#3fb950',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    flexShrink: 0,
                    marginTop: 1,
                  }}>
                    <HiOutlineCheck />
                  </div>
                  <div>
                    <div style={{
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      color: isGoogleLight ? '#202124' : '#e6edf3',
                    }}>
                      {s.title}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: isGoogleLight ? '#5f6368' : '#8b949e',
                    }}>
                      {s.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Disclaimer */}
          <div style={{
            fontSize: '0.75rem',
            color: isGoogleLight ? '#5f6368' : '#8b949e',
            lineHeight: 1.45,
            marginBottom: 20,
            padding: '10px 12px',
            background: isGoogleLight ? '#f1f3f4' : 'rgba(255, 255, 255, 0.04)',
            borderRadius: 6,
          }}>
            🔒 <strong>Live OAuth Endpoint:</strong> <code>{getBrowserUrl()}</code>
            <br />
            Authorizing will grant single sign-on access to Dwarkesh Ratna CHS and return directly to your dashboard.
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={authorizing}
              style={{
                background: 'transparent',
                border: `1px solid ${meta.borderColor}`,
                color: isGoogleLight ? '#3c4043' : '#c9d1d9',
                padding: '9px 16px',
                borderRadius: 6,
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <a
              href={getBrowserUrl()}
              style={{
                background: 'transparent',
                border: `1px solid ${meta.buttonBg}`,
                color: meta.buttonBg,
                padding: '9px 16px',
                borderRadius: 6,
                fontSize: '0.86rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>⚡ Live {meta.brandName} OAuth</span>
            </a>

            <button
              type="button"
              onClick={handleAuthorizeClick}
              disabled={authorizing}
              style={{
                background: meta.buttonBg,
                color: meta.buttonText,
                border: 'none',
                padding: '9px 20px',
                borderRadius: 6,
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: authorizing ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                transition: 'background 0.2s',
              }}
            >
              {authStep === 'authorizing' ? (
                <>
                  <span className="loading-spinner" style={{ width: 16, height: 16, borderColor: '#fff', borderTopColor: 'transparent' }} />
                  <span>Authorizing {meta.brandName}...</span>
                </>
              ) : authStep === 'success' ? (
                <>
                  <HiOutlineCheck style={{ fontSize: '1.2rem' }} />
                  <span>Authorized! Redirecting...</span>
                </>
              ) : (
                <>
                  <span>🧪 Instant Sign-In</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialOAuthConsentModal;
