import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineBell, HiOutlineBars3, HiOutlineUser } from 'react-icons/hi2';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { notificationAPI } from '../services/api';

const Navbar = ({ title, subtitle }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications: socketNotifs } = useSocket();
  const [showPanel, setShowPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // Silent fail
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    // Merge socket notifications with server ones
    if (socketNotifs.length > 0) {
      setUnreadCount(prev => prev + 1);
    }
  }, [socketNotifs]);

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      // Silent fail
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'visitor': return '🚪';
      case 'billing': return '💰';
      case 'ticket': return '🔧';
      case 'notice': return '📢';
      case 'booking': return '📅';
      default: return '🔔';
    }
  };

  const allNotifs = [
    ...socketNotifs.map(n => ({
      ...n, _id: n.id, createdAt: n.time,
    })),
    ...notifications,
  ];

  return (
    <>
      <header className="navbar">
        <div className="navbar-left">
          <div>
            <h1>{title}</h1>
            {subtitle && <div className="breadcrumb">{subtitle}</div>}
          </div>
        </div>
        <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="navbar-btn"
            onClick={() => { setShowPanel(!showPanel); loadNotifications(); }}
            id="notification-btn"
            title="Notifications"
          >
            <HiOutlineBell />
            {unreadCount > 0 && <span className="notification-dot" />}
          </button>

          {/* User Profile Quick Link */}
          <button
            type="button"
            onClick={() => navigate('/profile')}
            title="My Profile & Settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 12px 4px 4px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary-400)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
          >
            <div style={{
              width: 30,
              height: 30,
              borderRadius: 'var(--radius-full)',
              background: 'var(--gradient-primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 700,
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              {user?.avatar ? (
                <img
                  src={user.avatar.startsWith('http') || user.avatar.startsWith('data:') ? user.avatar : `http://localhost:5000${user.avatar}`}
                  alt={user?.name || 'User'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, maxWidth: 110, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name?.split(' ')[0] || 'Profile'}
            </span>
          </button>
        </div>
      </header>

      {/* Notification Panel */}
      <div className={`notification-panel ${showPanel ? 'open' : ''}`}>
        <div className="notification-panel-header">
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
            Notifications {unreadCount > 0 && <span className="badge badge-primary" style={{ marginLeft: 8 }}>{unreadCount}</span>}
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {unreadCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>Mark all read</button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setShowPanel(false)}>✕</button>
          </div>
        </div>
        <div className="notification-list">
          {allNotifs.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-icon">🔔</div>
              <h4>No notifications</h4>
              <p>You're all caught up!</p>
            </div>
          ) : (
            allNotifs.map((notif) => (
              <div
                key={notif._id || notif.id}
                className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
              >
                <div className="notif-title">
                  {getNotifIcon(notif.type)} {notif.title}
                </div>
                <div className="notif-message">{notif.message}</div>
                <div className="notif-time">{formatTime(notif.createdAt)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Overlay */}
      {showPanel && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 199,
            background: 'rgba(0,0,0,0.3)',
          }}
          onClick={() => setShowPanel(false)}
        />
      )}
    </>
  );
};

export default Navbar;
