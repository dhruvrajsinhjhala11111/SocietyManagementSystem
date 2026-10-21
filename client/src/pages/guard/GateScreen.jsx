import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { visitorAPI, propertyAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import {
  HiOutlineShieldCheck,
  HiOutlineUserPlus, HiOutlineArrowRightEndOnRectangle,
} from 'react-icons/hi2';

const GuardGateScreen = () => {
  const { latestVisitorResponse } = useSocket();
  const [passCode, setPassCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedVisitor, setVerifiedVisitor] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Walk-in visitor state
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [properties, setProperties] = useState([]);
  const [walkinForm, setWalkinForm] = useState({
    visitorName: '', visitorPhone: '', propertyId: '', purpose: 'guest',
  });
  const [walkinLoading, setWalkinLoading] = useState(false);

  useEffect(() => {
    propertyAPI.getAll().then(res => setProperties(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (latestVisitorResponse) {
      const respId = latestVisitorResponse.visitorId || latestVisitorResponse.visitor?._id;
      if (verifiedVisitor && respId && respId.toString() === verifiedVisitor._id?.toString()) {
        const isApproved = latestVisitorResponse.action === 'approve';
        setVerifiedVisitor(prev => ({
          ...prev,
          status: isApproved ? 'approved' : 'denied',
        }));
        if (isApproved) {
          setMessage('🎉 Resident APPROVED entry! You can now check in the visitor.');
          setError('');
        } else {
          setError('❌ Resident DENIED entry.');
          setMessage('');
        }
      }
    }
  }, [latestVisitorResponse, verifiedVisitor]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!passCode.trim()) return;
    setVerifying(true);
    setError('');
    setMessage('');
    setVerifiedVisitor(null);
    try {
      const res = await visitorAPI.verifyCode({ passCode: passCode.trim() });
      setVerifiedVisitor(res.data.visitor || res.data);
      setMessage('✅ Visitor pass verified successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired pass code');
    } finally {
      setVerifying(false);
    }
  };

  const handleCheckIn = async (visitorId) => {
    try {
      await visitorAPI.checkIn(visitorId);
      setMessage('🎉 Visitor Checked In successfully!');
      setVerifiedVisitor(prev => ({ ...prev, status: 'checked-in' }));
    } catch (err) {
      setError(err.response?.data?.message || 'Check-in failed');
    }
  };

  const handleWalkinRequest = async (e) => {
    e.preventDefault();
    setWalkinLoading(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        visitorName: walkinForm.visitorName,
        visitorPhone: walkinForm.visitorPhone,
        name: walkinForm.visitorName,
        phone: walkinForm.visitorPhone,
        propertyId: walkinForm.propertyId,
        purpose: walkinForm.purpose,
      };
      const res = await visitorAPI.requestApproval(payload);
      setVerifiedVisitor(res.data);
      setMessage('⏳ Approval request sent to resident! Waiting for approval on their app...');
      setShowWalkinModal(false);
      setWalkinForm({ visitorName: '', visitorPhone: '', propertyId: '', purpose: 'guest' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send approval request');
    } finally {
      setWalkinLoading(false);
    }
  };

  const vName = verifiedVisitor?.visitorName || verifiedVisitor?.name;
  const vPhone = verifiedVisitor?.visitorPhone || verifiedVisitor?.phone;
  const isCheckedIn = verifiedVisitor?.status === 'checked-in' || verifiedVisitor?.status === 'checked_in';

  return (
    <div className="page-wrapper">
      <Navbar title="Gate Security Station" subtitle="Verify visitor passcodes and log arrivals" />

      {/* Main Verification Card */}
      <div style={{ maxWidth: 650, margin: '0 auto 32px' }}>
        <div className="card" style={{ padding: '32px 28px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary-400)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', marginBottom: 16,
          }}>
            <HiOutlineShieldCheck />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>
            Verify Visitor Pass
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 24px' }}>
            Enter the 6-character visitor passcode or scan the visitor's QR code.
          </p>

          <form onSubmit={handleVerify} style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <input
              type="text"
              placeholder="Enter Passcode (e.g. 562389)"
              value={passCode}
              onChange={(e) => setPassCode(e.target.value.toUpperCase())}
              style={{
                fontSize: '1.2rem',
                letterSpacing: 2,
                textAlign: 'center',
                maxWidth: 280,
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={verifying || !passCode}
              style={{ padding: '0 24px' }}
            >
              {verifying ? 'Verifying...' : 'Verify Pass'}
            </button>
          </form>

          {error && (
            <div style={{
              marginTop: 20,
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger-400)',
              fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{
              marginTop: 20,
              padding: '12px 16px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--accent-400)',
              fontSize: '0.85rem',
            }}>
              {message}
            </div>
          )}

          {/* Verified Visitor Details */}
          {verifiedVisitor && (
            <div style={{
              marginTop: 24,
              padding: 20,
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-default)',
              textAlign: 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  {vName}
                </h4>
                <span className={`badge badge-${
                  isCheckedIn ? 'success' :
                  verifiedVisitor.status === 'approved' ? 'info' : 'warning'
                }`}>
                  {verifiedVisitor.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div><strong>Phone:</strong> {vPhone}</div>
                <div><strong>Purpose:</strong> {verifiedVisitor.purpose}</div>
                <div>
                  <strong>Destination:</strong> Block {verifiedVisitor.propertyId?.block || 'A'} - Flat {verifiedVisitor.propertyId?.flatNumber || '101'}
                </div>
                <div><strong>Pass Code:</strong> {verifiedVisitor.passCode}</div>
              </div>

              {!isCheckedIn && (
                <div style={{ marginTop: 20, textAlign: 'center' }}>
                  <button
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                    onClick={() => handleCheckIn(verifiedVisitor._id)}
                  >
                    <HiOutlineArrowRightEndOnRectangle /> Check In Visitor Now
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 24, borderTop: '1px solid var(--border-default)', paddingTop: 20 }}>
            <button
              className="btn btn-outline"
              onClick={() => setShowWalkinModal(true)}
            >
              <HiOutlineUserPlus /> New Walk-in / Request Resident Approval
            </button>
          </div>
        </div>
      </div>

      {/* Walk-in Visitor Modal */}
      {showWalkinModal && (
        <div className="modal-overlay" onClick={() => setShowWalkinModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Walk-in Visitor Entry Request</h3>
              <button className="modal-close" onClick={() => setShowWalkinModal(false)}>✕</button>
            </div>
            <form onSubmit={handleWalkinRequest}>
              <div className="form-group">
                <label>Visitor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Singh"
                  value={walkinForm.visitorName}
                  onChange={(e) => setWalkinForm({ ...walkinForm, visitorName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Visitor Phone</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9811223344"
                  value={walkinForm.visitorPhone}
                  onChange={(e) => setWalkinForm({ ...walkinForm, visitorPhone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Visiting Flat</label>
                <select
                  required
                  value={walkinForm.propertyId}
                  onChange={(e) => setWalkinForm({ ...walkinForm, propertyId: e.target.value })}
                >
                  <option value="">Select Flat...</option>
                  {properties.map((p) => (
                    <option key={p._id} value={p._id}>
                      Block {p.block} - Flat {p.flatNumber} ({p.ownerId?.name || 'Occupied'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Purpose</label>
                <select
                  value={walkinForm.purpose}
                  onChange={(e) => setWalkinForm({ ...walkinForm, purpose: e.target.value })}
                >
                  <option value="guest">Guest</option>
                  <option value="delivery">Delivery</option>
                  <option value="cab">Cab / Taxi</option>
                  <option value="service">Service / Repair</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="modal-footer" style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowWalkinModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={walkinLoading}>
                  {walkinLoading ? 'Sending...' : 'Send Approval Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuardGateScreen;
