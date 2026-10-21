import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { visitorAPI } from '../../services/api';
import {
  HiOutlineClipboardDocumentCheck, HiOutlineArrowLeftOnRectangle,
  HiOutlineCheckCircle, HiOutlineClock,
} from 'react-icons/hi2';

const GuardVisitorLog = () => {
  const [visitors, setVisitors] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'all'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVisitors();
  }, [activeTab]);

  const loadVisitors = async () => {
    setLoading(true);
    try {
      if (activeTab === 'active') {
        const res = await visitorAPI.getActive();
        setVisitors(res.data || []);
      } else {
        const res = await visitorAPI.getAll();
        setVisitors(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (visitorId) => {
    try {
      await visitorAPI.checkOut(visitorId);
      alert('Visitor checked out successfully.');
      loadVisitors();
    } catch (err) {
      alert(err.response?.data?.message || 'Checkout failed');
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar title="Visitor Logs & Gate Register" subtitle="Real-time log of entries, departures, and active visitors" />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button
          className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('active')}
        >
          Active Inside Society ({activeTab === 'active' ? visitors.length : '...'})
        </button>
        <button
          className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('all')}
        >
          All Visitor Records
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h3>
            {activeTab === 'active' ? 'Visitors Currently on Premises' : 'Complete Entry/Exit Register'} ({visitors.length})
          </h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Phone</th>
                <th>Destination</th>
                <th>Check-in Time</th>
                <th>Check-out Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visitors.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>
                    {activeTab === 'active' ? 'No visitors currently inside the premises.' : 'No visitor records found.'}
                  </td>
                </tr>
              ) : (
                visitors.map((v) => {
                  const vName = v.visitorName || v.name;
                  const vPhone = v.visitorPhone || v.phone;
                  const inTime = v.entryTime || v.checkInTime;
                  const outTime = v.exitTime || v.checkOutTime;
                  const isCheckedIn = v.status === 'checked-in' || v.status === 'checked_in';

                  return (
                    <tr key={v._id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vName}</div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{v.purpose}</span>
                      </td>
                      <td>{vPhone}</td>
                      <td>
                        Block {v.propertyId?.block || 'A'} - Flat {v.propertyId?.flatNumber || '101'}
                      </td>
                      <td>
                        {inTime ? new Date(inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td>
                        {outTime ? new Date(outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td>
                        <span className={`badge badge-${
                          isCheckedIn ? 'success' :
                          v.status === 'checked-out' || v.status === 'checked_out' ? 'neutral' : 'warning'
                        }`}>
                          {v.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {isCheckedIn && (
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ borderColor: 'var(--danger-400)', color: 'var(--danger-400)' }}
                            onClick={() => handleCheckOut(v._id)}
                          >
                            <HiOutlineArrowLeftOnRectangle /> Check Out
                          </button>
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
    </div>
  );
};

export default GuardVisitorLog;
