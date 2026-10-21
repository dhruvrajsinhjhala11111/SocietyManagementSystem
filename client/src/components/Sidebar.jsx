import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import societyLogo from '../assets/logo.png';
import {
  HiOutlineHome, HiOutlineBuildingOffice2, HiOutlineUsers,
  HiOutlineShieldCheck, HiOutlineBanknotes, HiOutlineWrenchScrewdriver,
  HiOutlineMegaphone, HiOutlineCalendarDays, HiOutlineArrowRightOnRectangle,
  HiOutlineQrCode, HiOutlineCreditCard, HiOutlineChatBubbleLeftRight,
  HiOutlineTicket, HiOutlineUserGroup, HiOutlineClipboardDocumentCheck,
  HiOutlineUserCircle,
} from 'react-icons/hi2';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    const isStaff = user?.role === 'admin' || user?.role === 'guard' || user?.role === 'technician';
    logout();
    if (isStaff) {
      navigate('/admin/login');
    } else {
      navigate('/login');
    }
  };

  const adminNav = [
    { section: 'Overview' },
    { path: '/admin', icon: <HiOutlineHome />, label: 'Dashboard' },
    { section: 'Management' },
    { path: '/admin/properties', icon: <HiOutlineBuildingOffice2 />, label: 'Properties' },
    { path: '/admin/residents', icon: <HiOutlineUsers />, label: 'Users & Residents' },
    { section: 'Security' },
    { path: '/admin/visitors', icon: <HiOutlineShieldCheck />, label: 'Visitor Log' },
    { section: 'Finance' },
    { path: '/admin/billing', icon: <HiOutlineBanknotes />, label: 'Billing' },
    { section: 'Support' },
    { path: '/admin/tickets', icon: <HiOutlineWrenchScrewdriver />, label: 'Helpdesk' },
    { section: 'Community' },
    { path: '/admin/notices', icon: <HiOutlineMegaphone />, label: 'Notices' },
    { path: '/admin/bookings', icon: <HiOutlineCalendarDays />, label: 'Facilities' },
    { section: 'Account' },
    { path: '/profile', icon: <HiOutlineUserCircle />, label: 'My Profile' },
  ];

  const residentNav = [
    { section: 'Home' },
    { path: '/resident', icon: <HiOutlineHome />, label: 'Dashboard' },
    { section: 'Security' },
    { path: '/resident/visitors', icon: <HiOutlineQrCode />, label: 'Visitor Pass' },
    { section: 'Finance' },
    { path: '/resident/bills', icon: <HiOutlineCreditCard />, label: 'My Bills' },
    { section: 'Support' },
    { path: '/resident/complaints', icon: <HiOutlineTicket />, label: 'Complaints' },
    { section: 'Community' },
    { path: '/resident/notices', icon: <HiOutlineMegaphone />, label: 'Notices' },
    { path: '/resident/bookings', icon: <HiOutlineCalendarDays />, label: 'Book Facility' },
    { path: '/resident/family', icon: <HiOutlineUserGroup />, label: 'My Family' },
    { section: 'Account' },
    { path: '/profile', icon: <HiOutlineUserCircle />, label: 'My Profile' },
  ];

  const guardNav = [
    { section: 'Gate Management' },
    { path: '/guard', icon: <HiOutlineShieldCheck />, label: 'Gate Screen' },
    { path: '/guard/log', icon: <HiOutlineClipboardDocumentCheck />, label: 'Visitor Log' },
    { section: 'Account' },
    { path: '/profile', icon: <HiOutlineUserCircle />, label: 'My Profile' },
  ];

  const techNav = [
    { section: 'My Tasks' },
    { path: '/technician', icon: <HiOutlineWrenchScrewdriver />, label: 'Assigned Tasks' },
    { section: 'Account' },
    { path: '/profile', icon: <HiOutlineUserCircle />, label: 'My Profile' },
  ];

  const getNav = () => {
    switch (user?.role) {
      case 'admin': return adminNav;
      case 'resident': return residentNav;
      case 'guard': return guardNav;
      case 'technician': return techNav;
      default: return [];
    }
  };

  const navItems = getNav();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img
          src={societyLogo}
          alt="Dwarkesh Ratna"
          style={{
            height: 38,
            width: 48,
            objectFit: 'contain',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '2px 4px',
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0,
          }}
        />
        <div style={{ overflow: 'hidden' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, whiteSpace: 'nowrap' }}>Dwarkesh Ratna</h2>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>Co-op Housing Society</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if (item.section) {
            return <div key={i} className="nav-section-title">{item.section}</div>;
          }
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin' || item.path === '/resident' || item.path === '/guard' || item.path === '/technician'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div
          className="sidebar-user"
          onClick={() => navigate('/profile')}
          title="Click to view & edit My Profile"
          style={{ cursor: 'pointer' }}
        >
          <div className="user-avatar" style={{ overflow: 'hidden' }}>
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
          <div className="user-info">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-role" style={{ textTransform: 'capitalize' }}>{user?.role || 'Member'}</div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }}
            title="Log Out"
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <HiOutlineArrowRightOnRectangle style={{ fontSize: '1.2rem' }} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
