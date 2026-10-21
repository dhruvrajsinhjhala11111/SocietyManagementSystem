import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { visitorAPI } from '../../services/api';
import {
  HiOutlineQrCode, HiOutlinePlus,
  HiOutlineCheckBadge,
} from 'react-icons/hi2';

const ResidentVisitors = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    visitorName: '', visitorPhone: '', purpose: 'guest', validHours: 24,
  });
  const [createdPass, setCreatedPass] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadVisitors();
  }, []);

  const loadVisitors = async () => {
    try {
      const res = await visitorAPI.getAll();
      setVisitors(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePass = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        visitorName: form.visitorName,
        visitorPhone: form.visitorPhone,
        name: form.visitorName,
        phone: form.visitorPhone,
        purpose: form.purpose,
        validHours: Number(form.validHours) || 24,
      };
      const res = await visitorAPI.createPass(payload);
      setCreatedPass(res.data);
      setForm({ visitorName: '', visitorPhone: '', purpose: 'guest', validHours: 24 });
      loadVisitors();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create pass');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (visitorId, action) => {
    try {
      await visitorAPI.respond(visitorId, { action });
      alert(`Visitor entry ${action === 'approve' ? 'approved' : 'denied'} successfully!`);
      loadVisitors();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update visitor approval');
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar title="Visitor Passes" subtitle="Invite guests and pre-approve gate entry" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>My Visitor Passes</h2>
        <button className="btn btn-primary" onClick={() => { setCreatedPass(null); setShowModal(true); }}>
          <HiOutlinePlus /> Create New Pass
        </button>
      </div>

      {/* Created Pass Modal / Card Banner */}
      {createdPass && (
        <div className="card" style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(16, 185, 129, 0.1))',
          border: '1px solid var(--primary-500)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: 24,
        }}>
          <HiOutlineCheckBadge style={{ fontSize: '3rem', color: 'var(--accent-400)', marginBottom: 8 }} />
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Visitor Pass Generated!</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 16px' }}>
            Share this entry pass with <strong>{createdPass.visitorName || createdPass.name}</strong>
          </p>

          {(createdPass.qrCodeData || createdPass.qrCode) && (
            <img
              src={createdPass.qrCodeData || createdPass.qrCode}
              alt="QR Code"
              style={{
                width: 160,
                height: 160,
                borderRadius: 'var(--radius-md)',
                background: 'white',
                padding: 8,
                marginBottom: 16,
              }}
            />
          )}

          <div style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            letterSpacing: '4px',
            color: 'var(--primary-300)',
            background: 'var(--bg-secondary)',
            padding: '8px 20px',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--primary-400)',
            marginBottom: 12,
          }}>
            {createdPass.passCode}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
            Tell your visitor to show this 6-digit passcode or QR code to security at the gate.
          </span>
        </div>
      )}

      {/* Visitor List Table */}
      <div className="table-container">
        <div className="table-header">
          <h3>Visitor History & Passes ({visitors.length})</h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Phone</th>
                <th>Purpose</th>
                <th>Pass Code</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visitors.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>
                    No visitor passes found. Click "Create New Pass" above!
                  </td>
                </tr>
              ) : (
                visitors.map((v) => {
                  const vName = v.visitorName || v.name;
                  const vPhone = v.visitorPhone || v.phone;
                  return (
                    <tr key={v._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: 'var(--primary-400)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.8rem',
                          }}>
                            {vName?.charAt(0) || 'V'}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vName}</span>
                        </div>
                      </td>
                      <td>{vPhone}</td>
                      <td><span style={{ textTransform: 'capitalize' }}>{v.purpose}</span></td>
                      <td>
                        <code style={{
                          background: 'var(--bg-secondary)',
                          padding: '3px 8px',
                          borderRadius: 4,
                          color: 'var(--primary-400)',
                          fontWeight: 700,
                          letterSpacing: 1,
                        }}>
                          {v.passCode || '—'}
                        </code>
                      </td>
                      <td>
                        <span className={`badge badge-${
                          v.status === 'checked-in' || v.status === 'checked_in' ? 'success' :
                          v.status === 'approved' ? 'info' :
                          v.status === 'checked-out' || v.status === 'checked_out' ? 'neutral' :
                          v.status === 'denied' ? 'danger' : 'warning'
                        }`}>
                          {v.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                        {new Date(v.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        {v.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'var(--accent-500)', borderColor: 'var(--accent-500)' }}
                              onClick={() => handleRespond(v._id, 'approve')}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--danger-400)', color: 'var(--danger-400)' }}
                              onClick={() => handleRespond(v._id, 'deny')}
                            >
                              Deny
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Creating Pass */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3>Create Visitor Pass</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreatePass}>
              <div className="form-group">
                <label>Visitor Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Verma"
                  value={form.visitorName}
                  onChange={(e) => setForm({ ...form, visitorName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Visitor Mobile Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={form.visitorPhone}
                  onChange={(e) => setForm({ ...form, visitorPhone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Purpose of Visit</label>
                <select
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                >
                  <option value="guest">Guest / Personal</option>
                  <option value="delivery">Delivery / Courier</option>
                  <option value="cab">Cab / Taxi</option>
                  <option value="service">Home Service / Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="modal-footer" style={{ padding: '16px 0 0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Generating...' : 'Generate Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentVisitors;
