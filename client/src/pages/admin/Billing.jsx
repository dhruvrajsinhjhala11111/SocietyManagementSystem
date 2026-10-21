import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { billingAPI, propertyAPI } from '../../services/api';
import societyLogo from '../../assets/logo.png';
import { SiRazorpay } from 'react-icons/si';
import {
  HiOutlinePrinter, HiOutlineCheckCircle,
  HiOutlinePlus, HiOutlineSparkles,
} from 'react-icons/hi2';

const AdminBilling = () => {
  const [bills, setBills] = useState([]);
  const [stats, setStats] = useState({});
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Generate Multiple Bills Modal state
  const [showGenModal, setShowGenModal] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const defaultDueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-25`;

  const [genForm, setGenForm] = useState({
    month: currentMonthStr,
    title: 'Monthly Maintenance',
    billType: 'maintenance',
    amount: 4000,
    dueDate: defaultDueDate,
    allowMultiple: true,
    maintenance: 3000,
    water: 200,
    parking: 500,
    sinkingFund: 300,
  });

  // Single / Custom Bill Modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customLoading, setCustomLoading] = useState(false);
  const [customForm, setCustomForm] = useState({
    propertyId: '',
    title: 'Special Maintenance Assessment',
    billType: 'other',
    month: currentMonthStr,
    amount: 2500,
    dueDate: defaultDueDate,
  });

  useEffect(() => {
    loadData();
    loadProperties();
  }, [tab]);

  const loadData = async () => {
    try {
      const params = {};
      if (tab !== 'all') params.status = tab;
      const [billRes, statsRes] = await Promise.all([
        billingAPI.getAll(params),
        billingAPI.getStats(),
      ]);
      setBills(billRes.data || []);
      setStats(statsRes.data || {});
    } catch (err) {
      console.error('Failed to load admin billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const res = await propertyAPI.getAll();
      setProperties(res.data?.properties || res.data || []);
    } catch (err) {
      console.error('Failed to load properties for billing:', err);
    }
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    setGenLoading(true);
    try {
      const payload = {
        month: genForm.month,
        title: genForm.title,
        billType: genForm.billType,
        amount: Number(genForm.amount),
        dueDate: genForm.dueDate,
        allowMultiple: Boolean(genForm.allowMultiple),
        breakdown: {
          maintenance: Number(genForm.maintenance) || Math.round(Number(genForm.amount) * 0.75),
          water: Number(genForm.water) || 200,
          parking: Number(genForm.parking) || 500,
          sinkingFund: Number(genForm.sinkingFund) || 300,
          other: 0,
        },
      };

      const res = await billingAPI.generate(payload);
      alert(res.data.message || 'Bills generated successfully!');
      setShowGenModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error generating bills');
    } finally {
      setGenLoading(false);
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    setCustomLoading(true);
    try {
      const res = await billingAPI.createCustom({
        ...customForm,
        amount: Number(customForm.amount),
      });
      alert(res.data.message || 'Custom bill created successfully!');
      setShowCustomModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error creating custom bill');
    } finally {
      setCustomLoading(false);
    }
  };

  const handleRemind = async (billId) => {
    try {
      await billingAPI.sendReminder(billId);
      alert('Payment reminder notification sent to resident!');
    } catch (err) {
      alert('Error sending reminder');
    }
  };

  const handleMarkOverdue = async () => {
    try {
      const res = await billingAPI.markOverdue();
      alert(res.data.message);
      loadData();
    } catch (err) {
      alert('Error marking overdue');
    }
  };

  // Month options for dropdown
  const monthOptions = [];
  for (let offset = -3; offset <= 6; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthOptions.push({ val, label: `${label} (${val})` });
  }

  return (
    <>
      <Navbar title="Billing & Accounts" subtitle="Dwarkesh Ratna Society Accounts & Razorpay Transactions" />
      <div className="page-wrapper">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h2>Billing & Payments Management</h2>
            <p>Generate bills for any month, create multiple invoices, and manage Razorpay settlements</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={handleMarkOverdue}>
              Mark Overdue
            </button>
            <button
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setShowCustomModal(true)}
            >
              <HiOutlinePlus /> Custom Flat Bill
            </button>
            <button
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--primary-600)' }}
              onClick={() => setShowGenModal(true)}
            >
              <HiOutlineSparkles /> 📋 Generate Bills
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-info">
              <h3>Total Amount</h3>
              <div className="stat-value">₹{(stats.totalAmount || 0).toLocaleString()}</div>
            </div>
            <div className="stat-icon primary">💰</div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>Collected via Gateway</h3>
              <div className="stat-value" style={{ color: 'var(--accent-400)' }}>
                ₹{(stats.collectedAmount || 0).toLocaleString()}
              </div>
            </div>
            <div className="stat-icon accent">
              <HiOutlineCheckCircle />
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>Pending</h3>
              <div className="stat-value">{stats.pending || 0}</div>
            </div>
            <div className="stat-icon warning">⏳</div>
          </div>
          <div className="stat-card">
            <div className="stat-info">
              <h3>Overdue</h3>
              <div className="stat-value">{stats.overdue || 0}</div>
            </div>
            <div className="stat-icon danger">⚠️</div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="tabs">
          {['all', 'pending', 'paid', 'overdue'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Bills Table */}
        <div className="table-container">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Flat & Resident</th>
                  <th>Bill Description</th>
                  <th>Month</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status & Gateway</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}><span className="loading-spinner" /></td></tr>
                ) : bills.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state">
                      <p>No bills found. Click <strong>"📋 Generate Bills"</strong> above to issue maintenance bills to all residents.</p>
                    </div>
                  </td></tr>
                ) : bills.map(b => (
                  <tr key={b._id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {b.propertyId?.block ? `${b.propertyId.block}-${b.propertyId.flatNumber}` : 'Flat Assigned'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {b.residentId?.name || 'Resident'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                        {b.title || 'Monthly Maintenance'}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                        {b.invoiceNumber || b._id.slice(-6).toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{b.month}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>₹{b.amount?.toLocaleString()}</td>
                    <td>{new Date(b.dueDate).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span className={`badge ${b.status === 'paid' ? 'badge-success' : b.status === 'overdue' ? 'badge-danger' : 'badge-warning'}`}>
                          {b.status}
                        </span>
                        {b.status === 'paid' && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.68rem',
                            color: '#0284c7',
                            fontWeight: 600,
                          }}>
                            <SiRazorpay size={12} /> Razorpay
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {b.status !== 'paid' ? (
                        <button className="btn btn-outline btn-sm" onClick={() => handleRemind(b._id)}>
                          Send Reminder
                        </button>
                      ) : (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={() => setSelectedReceipt(b)}
                        >
                          <HiOutlinePrinter /> Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Generate Bills Modal (Multi-Month & Universal Resident Support) */}
      {showGenModal && (
        <div className="modal-overlay" onClick={() => !genLoading && setShowGenModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.3rem' }}>📋</span>
                <div>
                  <h3 style={{ margin: 0 }}>Generate Society Maintenance Bills</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Issues bills to all residents (both existing and newly registered users)
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowGenModal(false)}>✕</button>
            </div>

            <form onSubmit={handleGenerateSubmit}>
              <div className="form-group">
                <label>Billing Month / Period</label>
                <select
                  className="form-control"
                  value={genForm.month}
                  onChange={(e) => setGenForm({ ...genForm, month: e.target.value })}
                  required
                >
                  {monthOptions.map(m => (
                    <option key={m.val} value={m.val}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Bill Title / Description</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Monthly Maintenance, Festival Fund, Water Charges"
                  value={genForm.title}
                  onChange={(e) => setGenForm({ ...genForm, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Bill Category</label>
                  <select
                    className="form-control"
                    value={genForm.billType}
                    onChange={(e) => setGenForm({ ...genForm, billType: e.target.value })}
                  >
                    <option value="maintenance">Monthly Maintenance</option>
                    <option value="water">Water / Utilities</option>
                    <option value="electricity">Common Electricity</option>
                    <option value="event">Festival / Event Fund</option>
                    <option value="penalty">Late Fee / Penalty</option>
                    <option value="other">Special Assessment</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Total Amount (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={genForm.amount}
                    min="100"
                    onChange={(e) => setGenForm({ ...genForm, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={genForm.dueDate}
                  onChange={(e) => setGenForm({ ...genForm, dueDate: e.target.value })}
                  required
                />
              </div>

              {/* Allow Multiple Bills Checkbox */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: 16,
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}>
                  <input
                    type="checkbox"
                    checked={genForm.allowMultiple}
                    onChange={(e) => setGenForm({ ...genForm, allowMultiple: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: 'var(--primary-500)' }}
                  />
                  <span>Allow generating multiple bills for this month / category</span>
                </label>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 4, marginLeft: 26 }}>
                  Enables creating supplementary or subsequent invoices without blocking.
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowGenModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={genLoading}>
                  {genLoading ? 'Generating...' : `Publish Bills (₹${Number(genForm.amount).toLocaleString()})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Custom / Single Flat Bill Modal */}
      {showCustomModal && (
        <div className="modal-overlay" onClick={() => !customLoading && setShowCustomModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Create Custom Invoice for Flat</h3>
              <button className="modal-close" onClick={() => setShowCustomModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCustomSubmit}>
              <div className="form-group">
                <label>Select Flat</label>
                <select
                  className="form-control"
                  value={customForm.propertyId}
                  onChange={(e) => setCustomForm({ ...customForm, propertyId: e.target.value })}
                  required
                >
                  <option value="">-- Choose Flat --</option>
                  {properties.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.block}-{p.flatNumber} ({p.ownerId?.name ? `Resident: ${p.ownerId.name}` : p.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Invoice Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Water Tank Repair, Clubhouse Charges"
                  value={customForm.title}
                  onChange={(e) => setCustomForm({ ...customForm, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Billing Month</label>
                  <select
                    className="form-control"
                    value={customForm.month}
                    onChange={(e) => setCustomForm({ ...customForm, month: e.target.value })}
                  >
                    {monthOptions.map(m => (
                      <option key={m.val} value={m.val}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={customForm.amount}
                    min="50"
                    onChange={(e) => setCustomForm({ ...customForm, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={customForm.dueDate}
                  onChange={(e) => setCustomForm({ ...customForm, dueDate: e.target.value })}
                  required
                />
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCustomModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={customLoading}>
                  {customLoading ? 'Creating...' : 'Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Printable Receipt Modal */}
      {selectedReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div
            className="modal printable-receipt"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 580,
              padding: '28px',
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2px solid #0f766e',
              paddingBottom: 16,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <img
                  src={societyLogo}
                  alt="Dwarkesh Ratna"
                  style={{
                    height: 52,
                    objectFit: 'contain',
                    background: '#ded7c8',
                    padding: 4,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                  }}
                />
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    Dwarkesh Ratna Co-op Housing Society Ltd.
                  </h2>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                    Registration No: GUJ/AHM/CHS/2024/7821 • Ahmedabad, Gujarat
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#0f766e', fontWeight: 600 }}>
                    Official Maintenance Assessment Receipt (Admin Copy)
                  </div>
                </div>
              </div>
              <button
                className="modal-close no-print"
                onClick={() => setSelectedReceipt(null)}
                style={{ color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Details Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
              background: '#f8fafc',
              padding: 14,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              marginBottom: 16,
              fontSize: '0.8rem',
            }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Receipt Number</span>
                <strong style={{ fontFamily: 'monospace', color: '#0f766e', fontSize: '0.9rem' }}>
                  {selectedReceipt.receiptNumber || `DR-REC-${selectedReceipt._id.slice(-6).toUpperCase()}`}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Payment Date</span>
                <strong>{new Date(selectedReceipt.paidAt || selectedReceipt.updatedAt).toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Resident & Unit</span>
                <strong>
                  {selectedReceipt.residentId?.name || 'Resident'}
                  {selectedReceipt.propertyId?.block ? ` (Flat ${selectedReceipt.propertyId.block}-${selectedReceipt.propertyId.flatNumber})` : ''}
                </strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem' }}>Payment Gateway</span>
                <span style={{ fontFamily: 'monospace', color: '#0284c7' }}>
                  {selectedReceipt.paymentId || 'RAZORPAY_GATEWAY'}
                </span>
              </div>
            </div>

            {/* Total Paid Table */}
            <table style={{ width: '100%', marginBottom: 16, fontSize: '0.82rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '8px 0' }}>Description</th>
                  <th style={{ padding: '8px 0', textAlign: 'center' }}>Month</th>
                  <th style={{ padding: '8px 0', textAlign: 'right' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 0', color: '#1e293b' }}>
                    {selectedReceipt.title || 'Society Maintenance Charges'}
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'center', color: '#64748b' }}>{selectedReceipt.month}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                    ₹{(selectedReceipt.breakdown?.maintenance || selectedReceipt.amount).toLocaleString()}
                  </td>
                </tr>
                {selectedReceipt.breakdown?.water > 0 && (
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 0', color: '#1e293b' }}>Water Charges</td>
                    <td style={{ padding: '8px 0', textAlign: 'center', color: '#64748b' }}>{selectedReceipt.month}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                      ₹{selectedReceipt.breakdown.water.toLocaleString()}
                    </td>
                  </tr>
                )}
                <tr style={{ borderTop: '2px solid #0f172a', fontWeight: 800 }}>
                  <td colSpan={2} style={{ padding: '10px 0', fontSize: '0.95rem' }}>
                    Total Received (via Razorpay):
                  </td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontSize: '1.15rem', color: '#0f766e' }}>
                    ₹{selectedReceipt.amount?.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px dashed #cbd5e1',
              paddingTop: 14,
              fontSize: '0.75rem',
              color: '#64748b',
            }}>
              <span style={{ background: '#10b981', color: '#ffffff', fontWeight: 800, padding: '3px 8px', borderRadius: 4 }}>
                PAID & VERIFIED
              </span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>Dwarkesh Ratna CHS Ltd.</div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Managing Committee</div>
              </div>
            </div>

            <div className="no-print" style={{
              marginTop: 20,
              paddingTop: 14,
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
            }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedReceipt(null)}
                style={{ color: '#475569', borderColor: '#cbd5e1' }}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0f766e', borderColor: '#0f766e' }}
                onClick={() => window.print()}
              >
                <HiOutlinePrinter /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminBilling;
