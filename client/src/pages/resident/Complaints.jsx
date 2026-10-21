import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { ticketAPI } from '../../services/api';
import {
  HiOutlineWrenchScrewdriver, HiOutlinePlus,
  HiOutlineCheckCircle, HiOutlineClock,
} from 'react-icons/hi2';

const ResidentComplaints = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'electricity', priority: 'medium',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const res = await ticketAPI.getAll();
      setTickets(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('category', form.category);
      formData.append('priority', form.priority);

      await ticketAPI.create(formData);
      setForm({ title: '', description: '', category: 'electricity', priority: 'medium' });
      setShowModal(false);
      loadTickets();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to raise complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar title="Maintenance Complaints" subtitle="Raise tickets for electricity, plumbing, or repairs" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>My Complaints & Tickets</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <HiOutlinePlus /> Raise New Complaint
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3>Tickets History ({tickets.length})</h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Issue</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned Tech</th>
                <th>Raised On</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>
                    No complaints registered. Everything looks good!
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t._id}>
                    <td>
                      <code style={{ color: 'var(--primary-400)', fontWeight: 700 }}>
                        #{t._id.slice(-5).toUpperCase()}
                      </code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                        {t.description?.slice(0, 60)}...
                      </div>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize' }}>{t.category}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${
                        t.priority === 'urgent' ? 'danger' :
                        t.priority === 'high' ? 'warning' : 'neutral'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${
                        t.status === 'resolved' ? 'success' :
                        t.status === 'in_progress' ? 'info' :
                        t.status === 'open' ? 'warning' : 'neutral'
                      }`}>
                        {t.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {t.assignedTo ? (
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          {t.assignedTo.name || 'Technician'}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Complaint Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Raise Maintenance Complaint</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTicket}>
              <div className="form-group">
                <label>Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kitchen tap leaking"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="electricity">Electricity</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="carpentry">Carpentry</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="security">Security</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description of Issue</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Please describe the issue in detail..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="modal-footer" style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentComplaints;
