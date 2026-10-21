import { useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import societyLogo from '../assets/logo.png';
import { FcGoogle } from 'react-icons/fc';
import { BsMicrosoft } from 'react-icons/bs';
import { FaGithub, FaApple } from 'react-icons/fa';
import {
  HiOutlineUser, HiOutlineEnvelope, HiOutlinePhone,
  HiOutlineCamera, HiOutlineKey, HiOutlineCheckCircle,
  HiOutlineExclamationCircle, HiOutlineBuildingOffice2,
  HiOutlineShieldCheck, HiOutlineTrash, HiOutlineSparkles,
  HiOutlineEye, HiOutlineEyeSlash, HiOutlineLink,
} from 'react-icons/hi2';

const API_STATIC_URL = 'http://localhost:5000';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  // Profile fields state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');

  // Photo state
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // OAuth Account Binding states
  const [bindModalProvider, setBindModalProvider] = useState(null);
  const [bindEmail, setBindEmail] = useState('');
  const [bindUsername, setBindUsername] = useState('');
  const [bindingLoading, setBindingLoading] = useState(false);

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Feedback state
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Get current avatar source
  const getAvatarSrc = () => {
    if (previewAvatar) return previewAvatar;
    if (user?.avatar) {
      if (user.avatar.startsWith('http') || user.avatar.startsWith('data:')) {
        return user.avatar;
      }
      return `${API_STATIC_URL}${user.avatar}`;
    }
    return null;
  };

  // Handle file selection for avatar
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'Please select a valid image file (JPG, PNG, WEBP).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Image size should not exceed 5MB.' });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewAvatar(reader.result);
      setStatusMessage({ type: 'info', text: 'Photo selected. Click "Save Profile" to update.' });
    };
    reader.readAsDataURL(file);
  };

  // Direct quick upload photo
  const handleDirectUploadPhoto = async () => {
    if (!selectedFile) return;
    setUploadingPhoto(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('avatar', selectedFile);

      const res = await authAPI.uploadAvatar(formData);
      updateUser(res.data.user);
      setSelectedFile(null);
      setPreviewAvatar(null);
      setStatusMessage({ type: 'success', text: 'Profile photo updated successfully!' });
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to upload photo',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Remove avatar photo
  const handleRemoveAvatar = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    setSaving(true);
    try {
      const res = await authAPI.updateProfile({ avatar: '' });
      updateUser(res.data);
      setPreviewAvatar(null);
      setSelectedFile(null);
      setStatusMessage({ type: 'success', text: 'Profile photo removed.' });
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Failed to remove photo.' });
    } finally {
      setSaving(false);
    }
  };

  // Submit profile details & password changes
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });

    if (!name.trim()) {
      setStatusMessage({ type: 'error', text: 'Full Name cannot be empty.' });
      return;
    }

    if (!phone.trim()) {
      setStatusMessage({ type: 'error', text: 'Phone Number cannot be empty.' });
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        setStatusMessage({ type: 'error', text: 'Current password is required to set a new password.' });
        return;
      }
      if (newPassword.length < 6) {
        setStatusMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setStatusMessage({ type: 'error', text: 'New passwords do not match.' });
        return;
      }
    }

    setSaving(true);

    try {
      let updatedUserData;

      // If a file was selected, send as multipart FormData
      if (selectedFile) {
        const formData = new FormData();
        formData.append('name', name.trim());
        formData.append('phone', phone.trim());
        formData.append('email', email.trim());
        formData.append('avatar', selectedFile);
        if (newPassword) {
          formData.append('currentPassword', currentPassword);
          formData.append('newPassword', newPassword);
        }

        const res = await authAPI.updateProfile(formData);
        updatedUserData = res.data;
        setSelectedFile(null);
        setPreviewAvatar(null);
      } else {
        // Send JSON payload
        const payload = {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
        };
        if (newPassword) {
          payload.currentPassword = currentPassword;
          payload.newPassword = newPassword;
        }

        const res = await authAPI.updateProfile(payload);
        updatedUserData = res.data;
      }

      updateUser(updatedUserData);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatusMessage({ type: 'success', text: 'Profile details saved successfully!' });
    } catch (err) {
      console.error('Failed to update profile:', err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Could not update profile details. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Open modal to bind an OAuth provider
  const handleOpenBind = (provider) => {
    setBindModalProvider(provider);
    setBindEmail(user?.email || '');
    setBindUsername(user?.name ? user.name.toLowerCase().replace(/\s+/g, '') : '');
  };

  // Submit binding
  const handleSaveBind = async (e) => {
    e.preventDefault();
    if (!bindModalProvider || !bindEmail.trim()) return;
    setBindingLoading(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const res = await authAPI.bindOAuth({
        provider: bindModalProvider,
        email: bindEmail.trim(),
        username: bindUsername.trim(),
        providerId: `${bindModalProvider}_bind_${Date.now().toString(36)}`,
      });

      updateUser(res.data.user);
      setBindModalProvider(null);
      setStatusMessage({
        type: 'success',
        text: `Successfully connected ${bindModalProvider.toUpperCase()} account (${bindEmail})! You can now use it for 1-click login.`,
      });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to bind account');
    } finally {
      setBindingLoading(false);
    }
  };

  // Submit unbinding
  const handleUnbind = async (provider) => {
    const provName = provider.toUpperCase();
    if (!window.confirm(`Are you sure you want to disconnect your ${provName} account? You will no longer be able to log in with 1-click via ${provName}.`)) {
      return;
    }

    try {
      const res = await authAPI.unbindOAuth(provider);
      updateUser(res.data.user);
      setStatusMessage({
        type: 'info',
        text: `Disconnected ${provName} account from your society profile.`,
      });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to unbind account');
    }
  };

  const renderProviderRow = (key, title, icon, color) => {
    const isBound = Boolean(user?.oauthProviders?.[key]?.id);
    const boundEmail = user?.oauthProviders?.[key]?.email;
    const boundAt = user?.oauthProviders?.[key]?.boundAt;

    return (
      <div
        key={key}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${isBound ? 'rgba(34, 197, 94, 0.3)' : 'var(--border-color)'}`,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-color)',
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              {title}
            </div>
            <div style={{ fontSize: '0.78rem', color: isBound ? 'var(--success-400, #4ade80)' : 'var(--text-tertiary)' }}>
              {isBound ? (
                <>
                  <span style={{ fontWeight: 600 }}>Connected:</span> {boundEmail || 'Linked'}{' '}
                  {boundAt ? `(${new Date(boundAt).toLocaleDateString()})` : ''}
                </>
              ) : (
                'Not connected'
              )}
            </div>
          </div>
        </div>

        <div>
          {isBound ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--danger-400)', borderColor: 'rgba(239, 68, 68, 0.4)', fontSize: '0.78rem' }}
              onClick={() => handleUnbind(key)}
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ fontSize: '0.78rem' }}
              onClick={() => handleOpenBind(key)}
            >
              Connect {title}
            </button>
          )}
        </div>
      </div>
    );
  };

  const avatarSrc = getAvatarSrc();

  return (
    <div className="page-wrapper">
      <Navbar title="My Profile" subtitle="Manage your account information and society credentials" />

      {/* Society Header Card */}
      <div className="card" style={{
        marginBottom: 24,
        background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.15) 0%, rgba(20, 184, 166, 0.05) 100%)',
        border: '1px solid rgba(20, 184, 166, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img
            src={societyLogo}
            alt="Dwarkesh Ratna Logo"
            style={{
              width: 54,
              height: 44,
              objectFit: 'contain',
              background: '#ffffff',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 4px',
              boxShadow: 'var(--shadow-sm)',
            }}
          />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Dwarkesh Ratna CHS
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Official Society Resident & Member Portal
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span className="badge badge-primary" style={{ textTransform: 'capitalize', padding: '6px 14px', fontSize: '0.82rem' }}>
            Role: {user?.role}
          </span>
          {user?.isVerified && (
            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', fontSize: '0.82rem' }}>
              <HiOutlineCheckCircle /> Verified Member
            </span>
          )}
        </div>
      </div>

      {/* Status banner */}
      {statusMessage.text && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 24,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: statusMessage.type === 'success'
              ? 'rgba(34, 197, 94, 0.15)'
              : statusMessage.type === 'error'
              ? 'rgba(239, 68, 68, 0.15)'
              : 'rgba(59, 130, 246, 0.15)',
            border: `1px solid ${
              statusMessage.type === 'success'
                ? 'var(--success-500, #22c55e)'
                : statusMessage.type === 'error'
                ? 'var(--danger-500, #ef4444)'
                : 'var(--primary-400)'
            }`,
            color: statusMessage.type === 'success'
              ? '#86efac'
              : statusMessage.type === 'error'
              ? '#fca5a5'
              : '#93c5fd',
          }}
        >
          {statusMessage.type === 'success' ? <HiOutlineCheckCircle style={{ fontSize: '1.2rem', flexShrink: 0 }} /> : <HiOutlineExclamationCircle style={{ fontSize: '1.2rem', flexShrink: 0 }} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* Left Column: Photo & Identity card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Avatar Card */}
          <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ position: 'relative', width: 130, height: 130, margin: '0 auto 20px' }}>
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={user?.name || 'Profile'}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 'var(--radius-full)',
                    objectFit: 'cover',
                    border: '4px solid var(--primary-500)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--gradient-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  border: '4px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: 'var(--shadow-md)',
                }}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}

              {/* Camera Icon Overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload Photo"
                style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  background: 'var(--primary-500)',
                  color: 'white',
                  border: '2px solid var(--bg-card)',
                  borderRadius: 'var(--radius-full)',
                  width: 38,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <HiOutlineCamera style={{ fontSize: '1.2rem' }} />
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>

            <h3 style={{ margin: '0 0 6px', fontSize: '1.3rem', color: 'var(--text-primary)' }}>
              {user?.name}
            </h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              {user?.email}
            </p>

            {/* Quick Actions for Avatar */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <HiOutlineCamera /> Change Photo
              </button>

              {selectedFile && (
                <button
                  type="button"
                  className="btn btn-accent btn-sm"
                  onClick={handleDirectUploadPhoto}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? 'Uploading...' : 'Save Photo Now'}
                </button>
              )}

              {(user?.avatar || previewAvatar) && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ color: 'var(--danger-400)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  onClick={handleRemoveAvatar}
                  disabled={saving}
                >
                  <HiOutlineTrash /> Remove
                </button>
              )}
            </div>

            <div style={{
              marginTop: 20,
              padding: '12px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              color: 'var(--text-tertiary)',
            }}>
              Supports JPG, PNG, WEBP (Max 5MB). Photo updates automatically across your profile, navbar, and society records.
            </div>
          </div>

          {/* Society Flat & Membership Info */}
          <div className="card">
            <h4 style={{ margin: '0 0 16px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <HiOutlineBuildingOffice2 style={{ color: 'var(--primary-400)' }} /> Society Residence Details
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Society:</span>
                <strong style={{ color: 'var(--text-primary)' }}>Dwarkesh Ratna CHS</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Assigned Flat:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {user?.propertyId ? `${user.propertyId.block}-${user.propertyId.flatNumber}` : 'Not Assigned'}
                </strong>
              </div>
              {user?.propertyId?.type && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Flat Type:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{user.propertyId.type}</span>
                </div>
              )}
              {user?.propertyId?.sqFt ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Carpet Area:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{user.propertyId.sqFt} Sq.Ft.</span>
                </div>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Verification Status:</span>
                <span className={`badge ${user?.isVerified ? 'badge-success' : 'badge-warning'}`}>
                  {user?.verificationStatus || 'approved'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Member Since:</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', day: 'numeric' }) : '2026'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Profile Details & Password Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Personal Details Form */}
          <div className="card">
            <h4 style={{ margin: '0 0 20px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <HiOutlineUser style={{ color: 'var(--primary-400)' }} /> Personal & Account Details
            </h4>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <HiOutlineUser /> Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <HiOutlinePhone /> Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <HiOutlineEnvelope /> Email Address (Society Login ID)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                />
                <span style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                  Used for society notifications, receipts, and account authentication.
                </span>
              </div>

              {/* Change Password Section */}
              <div style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid var(--border-color)',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h5 style={{ margin: 0, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
                    <HiOutlineKey style={{ color: 'var(--primary-400)' }} /> Security & Password
                  </h5>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ fontSize: '0.78rem' }}
                  >
                    {showPassword ? <><HiOutlineEyeSlash /> Hide</> : <><HiOutlineEye /> Show</>}
                  </button>
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label>Current Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password (to change)"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || uploadingPhoto}
                  style={{ minWidth: 150 }}
                >
                  {saving ? 'Saving Changes...' : <><HiOutlineCheckCircle /> Save Profile</>}
                </button>
              </div>
            </form>
          </div>

          {/* Connected Social Accounts & SSO Binding */}
          <div className="card">
            <h4 style={{ margin: '0 0 8px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
              <HiOutlineLink style={{ color: 'var(--primary-400)' }} /> Connected Accounts & OAuth Single Sign-On
            </h4>
            <p style={{ margin: '0 0 20px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Link your Google, Microsoft, GitHub, or Apple ID to sign in to your Dwarkesh Ratna account with a single click. You can bind or unbind accounts anytime based on your personal preference.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Google */}
              {renderProviderRow('google', 'Google', <FcGoogle style={{ fontSize: '1.4rem' }} />, '#4285F4')}
              {/* Microsoft */}
              {renderProviderRow('microsoft', 'Microsoft', <BsMicrosoft style={{ fontSize: '1.2rem', color: '#00a4ef' }} />, '#00a4ef')}
              {/* GitHub */}
              {renderProviderRow('github', 'GitHub', <FaGithub style={{ fontSize: '1.3rem', color: '#f0f6fc' }} />, '#6e5494')}
              {/* Apple */}
              {renderProviderRow('apple', 'Apple ID', <FaApple style={{ fontSize: '1.35rem', color: '#f5f5f7' }} />, '#a2aaad')}
            </div>
          </div>
        </div>
      </div>

      {/* Account Binding Modal */}
      {bindModalProvider && (
        <div className="modal-overlay" onClick={() => setBindModalProvider(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ textTransform: 'capitalize' }}>
                Connect {bindModalProvider} Account
              </h3>
              <button className="modal-close" onClick={() => setBindModalProvider(null)}>✕</button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              Enter the email address or account ID associated with your {bindModalProvider.toUpperCase()} account to bind it with your Dwarkesh Ratna profile.
            </p>

            <form onSubmit={handleSaveBind}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ textTransform: 'capitalize' }}>{bindModalProvider} Email / Account *</label>
                <input
                  type="email"
                  value={bindEmail}
                  onChange={(e) => setBindEmail(e.target.value)}
                  placeholder={`e.g. user@${bindModalProvider === 'google' ? 'gmail.com' : bindModalProvider === 'microsoft' ? 'outlook.com' : bindModalProvider === 'apple' ? 'icloud.com' : 'example.com'}`}
                  required
                />
              </div>

              {bindModalProvider === 'github' && (
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label>GitHub Username (Optional)</label>
                  <input
                    type="text"
                    value={bindUsername}
                    onChange={(e) => setBindUsername(e.target.value)}
                    placeholder="e.g. octocat"
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.78rem', padding: 0 }}
                  onClick={() => setBindEmail(user?.email || '')}
                >
                  Use my current email ({user?.email})
                </button>
              </div>

              <div className="modal-footer" style={{ padding: '8px 0 0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setBindModalProvider(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={bindingLoading}
                  style={{ minWidth: 140 }}
                >
                  {bindingLoading ? 'Linking...' : `Connect ${bindModalProvider.charAt(0).toUpperCase() + bindModalProvider.slice(1)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
