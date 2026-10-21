import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { propertyAPI, billingAPI, ticketAPI } from '../../services/api';
import { authAPI } from '../../services/api';
import {
  HiOutlineBuildingOffice2, HiOutlineUsers,
  HiOutlineBanknotes, HiOutlineWrenchScrewdriver,
  HiOutlineShieldCheck, HiOutlineCalendarDays,
} from 'react-icons/hi2';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    properties: { total: 0, occupied: 0, vacant: 0 },
    billing: { totalAmount: 0, collectedAmount: 0, pending: 0, overdue: 0, collectionRate: 0 },
    tickets: { total: 0, open: 0, inProgress: 0, resolved: 0 },
    residents: 0,
  });
  const [recentTickets, setRecentTickets] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [propStats, billStats, ticketStats, users, tickets, pending] = await Promise.all([
        propertyAPI.getStats(),
        billingAPI.getStats(),
        ticketAPI.getStats(),
        authAPI.getAllUsers({ role: 'resident' }),
        ticketAPI.getAll(),
        authAPI.getPendingUsers(),
      ]);

      setStats({
        properties: propStats.data,
        billing: billStats.data,
        tickets: ticketStats.data,
        residents: users.data.length,
      });
      setRecentTickets(tickets.data.slice(0, 5));
      setPendingUsers(pending.data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId, status) => {
    try {
      await authAPI.verifyUser(userId, { status });
      setPendingUsers(prev => prev.filter(u => u._id !== userId));
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      open: 'badge-warning', assigned: 'badge-info',
      'in-progress': 'badge-primary', resolved: 'badge-success', closed: 'badge-neutral',
    };
    return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
  };

  const getPriorityBadge = (priority) => {
    const map = {
      low: 'badge-neutral', medium: 'badge-info',
      high: 'badge-warning', urgent: 'badge-danger',
    };
    return <span className={`badge ${map[priority] || 'badge-neutral'}`}>{priority}</span>;
  };

  if (loading) {
    return (
      <>
        <Navbar title="Dashboard" />
        <div className="page-wrapper">
          <div className="stats-grid">
            {[1,2,3,4].map(i => (
              <div key={i} className="stat-card">
                <div className="skeleton" style={{ width: '100%', height: 60 }} />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar title="Dashboard" subtitle="Society overview at a glance" />
      <div className="page-wrapper">
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card animate-slide-up">
            <div className="stat-info">
              <h3>Total Properties</h3>
              <div className="stat-value">{stats.properties.total}</div>
              <div className="stat-change positive">
                {stats.properties.occupied} occupied · {stats.properties.vacant} vacant
              </div>
            </div>
            <div className="stat-icon primary"><HiOutlineBuildingOffice2 /></div>
          </div>

          <div className="stat-card animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <div className="stat-info">
              <h3>Residents</h3>
              <div className="stat-value">{stats.residents}</div>
              <div className="stat-change positive">
                {pendingUsers.length} pending approval
              </div>
            </div>
            <div className="stat-icon accent"><HiOutlineUsers /></div>
          </div>

          <div className="stat-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="stat-info">
              <h3>Collection Rate</h3>
              <div className="stat-value">{stats.billing.collectionRate}%</div>
              <div className="stat-change positive">
                ₹{(stats.billing.collectedAmount || 0).toLocaleString()} collected
              </div>
            </div>
            <div className="stat-icon warning"><HiOutlineBanknotes /></div>
          </div>

          <div className="stat-card animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <div className="stat-info">
              <h3>Open Tickets</h3>
              <div className="stat-value">{stats.tickets.open}</div>
              <div className="stat-change negative">
                {stats.tickets.inProgress} in progress
              </div>
            </div>
            <div className="stat-icon danger"><HiOutlineWrenchScrewdriver /></div>
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Pending Approvals */}
          <div className="table-container animate-slide-up">
            <div className="table-header">
              <h3>⏳ Pending Approvals</h3>
              <span className="badge badge-warning">{pendingUsers.length}</span>
            </div>
            {pendingUsers.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}>
                <div className="empty-icon">✅</div>
                <p>No pending approvals</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Flat</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map(u => (
                      <tr key={u._id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{u.email}</div>
                        </td>
                        <td>{u.propertyId ? `${u.propertyId.block}-${u.propertyId.flatNumber}` : 'N/A'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-accent btn-sm" onClick={() => handleVerify(u._id, 'approved')}>
                              Approve
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleVerify(u._id, 'rejected')}>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Tickets */}
          <div className="table-container animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="table-header">
              <h3>🔧 Recent Tickets</h3>
            </div>
            {recentTickets.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}>
                <div className="empty-icon">🎉</div>
                <p>No tickets yet</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTickets.map(t => (
                      <tr key={t._id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                            {t.residentId?.name} · {t.propertyId?.block}-{t.propertyId?.flatNumber}
                          </div>
                        </td>
                        <td>{getPriorityBadge(t.priority)}</td>
                        <td>{getStatusBadge(t.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Billing Summary */}
        <div className="table-container animate-slide-up" style={{ marginTop: 20 }}>
          <div className="table-header">
            <h3>💰 Billing Overview - {stats.billing.month || 'Current Month'}</h3>
            <div style={{ display: 'flex', gap: 12, fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Total: </span>
                <span style={{ fontWeight: 700 }}>₹{(stats.billing.totalAmount || 0).toLocaleString()}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Pending: </span>
                <span style={{ fontWeight: 700, color: 'var(--warning-400)' }}>{stats.billing.pending || 0}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Overdue: </span>
                <span style={{ fontWeight: 700, color: 'var(--danger-400)' }}>{stats.billing.overdue || 0}</span>
              </div>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            {/* Collection Progress Bar */}
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Collection Progress</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-400)' }}>{stats.billing.collectionRate}%</span>
            </div>
            <div style={{
              height: 10,
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${stats.billing.collectionRate}%`,
                background: 'var(--gradient-accent)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 1s ease',
              }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
