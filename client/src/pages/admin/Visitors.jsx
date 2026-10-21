import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { visitorAPI } from '../../services/api';

const AdminVisitors = () => {
  const [visitors, setVisitors] = useState([]);
  const [tab, setTab] = useState('all');

  useEffect(() => { loadVisitors(); }, [tab]);

  const loadVisitors = async () => {
    try {
      const params = {};
      if (tab === 'active') {
        const res = await visitorAPI.getActive();
        setVisitors(res.data);
        return;
      }
      if (tab !== 'all') params.status = tab;
      const res = await visitorAPI.getAll(params);
      setVisitors(res.data);
    } catch (err) { console.error(err); }
  };

  return (
    <>
      <Navbar title="Visitor Log" subtitle="Gate security records" />
      <div className="page-wrapper">
        <div className="page-header">
          <div>
            <h2>Visitor Management</h2>
            <p>Track all visitor entries and exits</p>
          </div>
        </div>

        <div className="tabs">
          {['all', 'active', 'checked-in', 'checked-out', 'approved', 'denied'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'checked-in' ? 'Checked In' : t === 'checked-out' ? 'Checked Out' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="table-container">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>Phone</th>
                  <th>Purpose</th>
                  <th>Resident</th>
                  <th>Flat</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map(v => (
                  <tr key={v._id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.visitorName}</td>
                    <td>{v.visitorPhone}</td>
                    <td><span className="badge badge-info">{v.purpose}</span></td>
                    <td>{v.residentId?.name}</td>
                    <td>{v.propertyId?.block}-{v.propertyId?.flatNumber}</td>
                    <td>{v.entryTime ? new Date(v.entryTime).toLocaleTimeString() : '—'}</td>
                    <td>{v.exitTime ? new Date(v.exitTime).toLocaleTimeString() : '—'}</td>
                    <td>
                      <span className={`badge ${
                        v.status === 'checked-in' ? 'badge-success' :
                        v.status === 'checked-out' ? 'badge-neutral' :
                        v.status === 'approved' ? 'badge-primary' :
                        v.status === 'denied' ? 'badge-danger' : 'badge-warning'
                      }`}>{v.status}</span>
                    </td>
                  </tr>
                ))}
                {visitors.length === 0 && (
                  <tr><td colSpan={8}>
                    <div className="empty-state"><p>No visitor records</p></div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminVisitors;
