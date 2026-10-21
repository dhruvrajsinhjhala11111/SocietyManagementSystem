import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { ticketAPI, authAPI } from '../../services/api';

const AdminTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [tab, setTab] = useState('all');
  const [assignModal, setAssignModal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    try {
      const params = {};
      if (tab !== 'all') params.status = tab;
      const [ticketRes, techRes] = await Promise.all([
        ticketAPI.getAll(params),
        authAPI.getAllUsers({ role: 'technician' }),
      ]);
      setTickets(ticketRes.data);
      setTechnicians(techRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAssign = async (ticketId, technicianId) => {
    try {
      await ticketAPI.assign(ticketId, { technicianId });
      setAssignModal(null);
      loadData();
    } catch (err) { alert('Error assigning ticket'); }
  };

  const getStatusBadge = (status) => {
    const map = {
      open: 'badge-warning', assigned: 'badge-info',
      'in-progress': 'badge-primary', resolved: 'badge-success', closed: 'badge-neutral',
    };
    return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
  };

  const getCategoryIcon = (cat) => {
    const icons = {
      plumbing: '🔧', electrical: '⚡', carpentry: '🪚', painting: '🎨',
      cleaning: '🧹', 'pest-control': '🐛', lift: '🛗', security: '🔒',
      parking: '🅿️', other: '📋',
    };
    return icons[cat] || '📋';
  };

  return (
    <>
      <Navbar title="Helpdesk" subtitle="Complaint management" />
      <div className="page-wrapper">
        <div className="page-header">
          <div>
            <h2>Helpdesk & Maintenance</h2>
            <p>View, assign, and track resident complaints</p>
          </div>
        </div>

        <div className="tabs">
          {['all', 'open', 'assigned', 'in-progress', 'resolved', 'closed'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'in-progress' ? 'In Progress' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="table-container">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Title</th>
                  <th>Resident</th>
                  <th>Flat</th>
                  <th>Priority</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t._id}>
                    <td style={{ fontSize: '1.2rem' }}>{getCategoryIcon(t.category)}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.description}
                      </div>
                    </td>
                    <td>{t.residentId?.name}</td>
                    <td>{t.propertyId?.block}-{t.propertyId?.flatNumber}</td>
                    <td>
                      <span className={`badge ${t.priority === 'urgent' ? 'badge-danger' : t.priority === 'high' ? 'badge-warning' : 'badge-info'}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td>{t.assignedTo?.name || '—'}</td>
                    <td>{getStatusBadge(t.status)}</td>
                    <td>
                      {(t.status === 'open' || t.status === 'assigned') && (
                        <button className="btn btn-outline btn-sm" onClick={() => setAssignModal(t)}>
                          Assign
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr><td colSpan={8}>
                    <div className="empty-state"><p>No tickets found</p></div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assign Modal */}
        {assignModal && (
          <div className="modal-overlay" onClick={() => setAssignModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Assign Technician</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setAssignModal(null)}>✕</button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>
                  Assign "<strong>{assignModal.title}</strong>" to a technician
                </p>
                {technicians.length === 0 ? (
                  <div className="empty-state" style={{ padding: 20 }}>
                    <p>No technicians registered yet. Create a technician account first.</p>
                  </div>
                ) : (
                  technicians.map(tech => (
                    <div
                      key={tech._id}
                      onClick={() => handleAssign(assignModal._id, tech._id)}
                      style={{
                        padding: '12px 16px', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-default)', marginBottom: 8,
                        cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-500)'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-full)',
                        background: 'var(--gradient-accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, color: 'white', fontSize: '0.82rem',
                      }}>{tech.name?.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{tech.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{tech.phone}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminTickets;
