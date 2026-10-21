import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { billingAPI, visitorAPI, ticketAPI, noticeAPI } from '../../services/api';
import {
  HiOutlineCreditCard, HiOutlineQrCode, HiOutlineTicket,
  HiOutlineMegaphone, HiOutlineCalendarDays, HiOutlineUserGroup,
  HiOutlineCheckCircle, HiOutlineClock, HiOutlineXCircle,
} from 'react-icons/hi2';

const ResidentDashboard = () => {
  const { user } = useAuth();
  const { visitorApproval, clearVisitorApproval } = useSocket();
  const [bills, setBills] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [pendingVisitorFromDB, setPendingVisitorFromDB] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [billsRes, visitorsRes, ticketsRes, noticesRes] = await Promise.all([
        billingAPI.getMyBills(),
        visitorAPI.getAll({ limit: 10 }),
        ticketAPI.getAll({ limit: 5 }),
        noticeAPI.getAll({ limit: 3 }),
      ]);
      setBills(billsRes.data || []);
      setVisitors(visitorsRes.data || []);
      setTickets(ticketsRes.data || []);
      setNotices(noticesRes.data || []);

      const pending = (visitorsRes.data || []).find(v => v.status === 'pending');
      setPendingVisitorFromDB(pending || null);
    } catch (err) {
      console.error('Error loading resident dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeApproval = visitorApproval || (pendingVisitorFromDB ? {
    visitor: pendingVisitorFromDB,
    visitorId: pendingVisitorFromDB._id,
    message: `${pendingVisitorFromDB.visitorName || pendingVisitorFromDB.name} is waiting for entry approval at the gate.`,
  } : null);

  const handleVisitorResponse = async (targetId, action) => {
    const id = targetId || activeApproval?.visitorId || activeApproval?.visitor?._id;
    if (!id) {
      alert('Could not determine visitor ID');
      return;
    }
    setApprovalLoading(true);
    try {
      await visitorAPI.respond(id, { action });
      alert(`Visitor entry ${action === 'approve' ? 'approved' : 'denied'} successfully!`);
      clearVisitorApproval();
      setPendingVisitorFromDB(null);
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to respond to visitor:', err);
      alert(err.response?.data?.message || 'Failed to update visitor approval');
    } finally {
      setApprovalLoading(false);
    }
  };

  const pendingBills = bills.filter(b => b.status === 'pending' || b.status === 'overdue');
  const totalDue = pendingBills.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const activeTickets = tickets.filter(t => t.status !== 'resolved');

  return (
    <div className="page-wrapper">
      <Navbar
        title={`Welcome back, ${user?.name || 'Resident'}`}
        subtitle={`Flat: ${user?.propertyId?.block || 'A'}-${user?.propertyId?.flatNumber || '101'}`}
      />

      {/* Visitor Approval Alert Banner if visitor is at gate */}
      {activeApproval && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.2))',
          border: '1px solid rgba(245, 158, 11, 0.5)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          boxShadow: 'var(--shadow-glow)',
        }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--warning-400)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.4rem' }}>🚪</span> Visitor Request at Gate!
            </h3>
            <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}>
              {activeApproval.message || 'A visitor is requesting entry to your apartment.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              style={{ background: 'var(--accent-500)', borderColor: 'var(--accent-500)' }}
              disabled={approvalLoading}
              onClick={() => handleVisitorResponse(activeApproval.visitorId || activeApproval.visitor?._id, 'approve')}
            >
              <HiOutlineCheckCircle /> Allow Entry
            </button>
            <button
              className="btn btn-outline"
              style={{ borderColor: 'var(--danger-400)', color: 'var(--danger-400)' }}
              disabled={approvalLoading}
              onClick={() => handleVisitorResponse(activeApproval.visitorId || activeApproval.visitor?._id, 'deny')}
            >
              <HiOutlineXCircle /> Deny
            </button>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <h3>Pending Dues</h3>
            <div className="stat-value" style={{ color: totalDue > 0 ? 'var(--warning-400)' : 'var(--accent-400)' }}>
              ₹{totalDue.toLocaleString()}
            </div>
            <div className="stat-change">
              {pendingBills.length} unpaid bill{pendingBills.length === 1 ? '' : 's'}
            </div>
          </div>
          <div className="stat-icon warning">
            <HiOutlineCreditCard />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <h3>Active Complaints</h3>
            <div className="stat-value">{activeTickets.length}</div>
            <div className="stat-change">In progress or open</div>
          </div>
          <div className="stat-icon info">
            <HiOutlineTicket />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <h3>Recent Visitors</h3>
            <div className="stat-value">{visitors.length}</div>
            <div className="stat-change">Total visitor logs</div>
          </div>
          <div className="stat-icon accent">
            <HiOutlineQrCode />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <h3>Family Members</h3>
            <div className="stat-value">{user?.familyMembers?.length || 0}</div>
            <div className="stat-change">Registered contacts</div>
          </div>
          <div className="stat-icon primary">
            <HiOutlineUserGroup />
          </div>
        </div>
      </div>

      {/* Quick Action Grid */}
      <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '24px 0 16px', color: 'var(--text-primary)' }}>
        Quick Actions
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 28,
      }}>
        <Link to="/resident/visitors" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: '20px 16px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8, color: 'var(--primary-400)' }}><HiOutlineQrCode /></div>
          <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem' }}>Invite Visitor</h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Generate QR / Passcode</span>
        </Link>
        <Link to="/resident/bills" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: '20px 16px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8, color: 'var(--accent-400)' }}><HiOutlineCreditCard /></div>
          <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem' }}>Pay Maintenance</h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Instant online receipt</span>
        </Link>
        <Link to="/resident/complaints" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: '20px 16px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8, color: 'var(--warning-400)' }}><HiOutlineTicket /></div>
          <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem' }}>Raise Complaint</h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Electric, plumbing, etc.</span>
        </Link>
        <Link to="/resident/bookings" className="card" style={{ textDecoration: 'none', textAlign: 'center', padding: '20px 16px' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8, color: 'var(--info-400)' }}><HiOutlineCalendarDays /></div>
          <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem' }}>Book Facility</h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Clubhouse, pool, gym</span>
        </Link>
      </div>

      {/* Two Column Section: Recent Notices & Recent Visitors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        {/* Notices */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlineMegaphone style={{ color: 'var(--primary-400)' }} /> Society Notices
            </h3>
            <Link to="/resident/notices" style={{ fontSize: '0.8rem', color: 'var(--primary-400)' }}>View all →</Link>
          </div>
          {notices.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No active notices.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {notices.map((n) => (
                <div key={n._id} style={{
                  padding: '12px 14px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <h5 style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{n.title}</h5>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {n.content?.slice(0, 120)}...
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Visitors */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlineQrCode style={{ color: 'var(--accent-400)' }} /> Recent Visitors
            </h3>
            <Link to="/resident/visitors" style={{ fontSize: '0.8rem', color: 'var(--primary-400)' }}>Manage →</Link>
          </div>
          {visitors.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No visitors recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {visitors.map((v) => (
                <div key={v._id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                }}>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {v.visitorName || v.name}
                    </h5>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {v.purpose || 'Visit'} • {v.visitorPhone || v.phone}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {v.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'var(--accent-500)', borderColor: 'var(--accent-500)' }}
                          disabled={approvalLoading}
                          onClick={() => handleVisitorResponse(v._id, 'approve')}
                        >
                          Allow
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: 'var(--danger-400)', color: 'var(--danger-400)' }}
                          disabled={approvalLoading}
                          onClick={() => handleVisitorResponse(v._id, 'deny')}
                        >
                          Deny
                        </button>
                      </div>
                    ) : (
                      <span className={`badge badge-${
                        v.status === 'checked-in' || v.status === 'checked_in' ? 'success' :
                        v.status === 'approved' ? 'info' :
                        v.status === 'denied' ? 'danger' : 'neutral'
                      }`}>
                        {v.status?.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResidentDashboard;
