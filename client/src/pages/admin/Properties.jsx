import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { propertyAPI } from '../../services/api';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil } from 'react-icons/hi2';

const Properties = () => {
  const [properties, setProperties] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ block: '', status: '' });
  const [form, setForm] = useState({
    block: '', flatNumber: '', type: '2BHK', sqFt: 1100,
    billingType: 'fixed', fixedRate: 3000, ratePerSqFt: 5,
  });
  const [bulkForm, setBulkForm] = useState({
    block: '', startFlat: 101, endFlat: 104, type: '2BHK',
    sqFt: 1100, billingType: 'fixed', fixedRate: 3000,
  });

  const loadProperties = async () => {
    try {
      const res = await propertyAPI.getAll(filter);
      setProperties(res.data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadProperties(); }, [filter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await propertyAPI.create(form);
      setShowModal(false);
      setForm({ block: '', flatNumber: '', type: '2BHK', sqFt: 1100, billingType: 'fixed', fixedRate: 3000, ratePerSqFt: 5 });
      loadProperties();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleBulkCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await propertyAPI.bulkCreate(bulkForm);
      alert(res.data.message);
      setShowBulk(false);
      loadProperties();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    try {
      await propertyAPI.delete(id);
      loadProperties();
    } catch (err) { alert(err.response?.data?.message || 'Error'); }
  };

  const blocks = [...new Set(properties.map(p => p.block))].sort();

  return (
    <>
      <Navbar title="Properties" subtitle="Manage blocks and flats" />
      <div className="page-wrapper">
        <div className="page-header">
          <div>
            <h2>Property Management</h2>
            <p>Register and manage society blocks and flat numbers</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={() => setShowBulk(true)}>
              Bulk Add
            </button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <HiOutlinePlus /> Add Property
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <select className="form-control" style={{ width: 150 }} value={filter.block}
            onChange={(e) => setFilter({...filter, block: e.target.value})}>
            <option value="">All Blocks</option>
            {blocks.map(b => <option key={b} value={b}>Block {b}</option>)}
          </select>
          <select className="form-control" style={{ width: 150 }} value={filter.status}
            onChange={(e) => setFilter({...filter, status: e.target.value})}>
            <option value="">All Status</option>
            <option value="vacant">Vacant</option>
            <option value="occupied">Occupied</option>
          </select>
        </div>

        {/* Table */}
        <div className="table-container">
          <div className="table-header">
            <h3>All Properties ({properties.length})</h3>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Block - Flat</th>
                  <th>Type</th>
                  <th>Sq. Ft.</th>
                  <th>Owner</th>
                  <th>Billing</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map(p => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {p.block}-{p.flatNumber}
                    </td>
                    <td><span className="badge badge-primary">{p.type}</span></td>
                    <td>{p.sqFt} sq.ft</td>
                    <td>{p.ownerId ? (
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.ownerId.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{p.ownerId.phone}</div>
                      </div>
                    ) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}</td>
                    <td>
                      {p.billingType === 'fixed'
                        ? `₹${p.fixedRate}/mo`
                        : `₹${p.ratePerSqFt}/sq.ft`}
                    </td>
                    <td>
                      <span className={`badge ${p.status === 'occupied' ? 'badge-success' : 'badge-neutral'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p._id)}>
                        <HiOutlineTrash />
                      </button>
                    </td>
                  </tr>
                ))}
                {properties.length === 0 && (
                  <tr><td colSpan={7}>
                    <div className="empty-state"><p>No properties found</p></div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Property Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add Property</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Block</label>
                      <input className="form-control" placeholder="A, B, C..." value={form.block}
                        onChange={e => setForm({...form, block: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>Flat Number</label>
                      <input className="form-control" placeholder="101, 202..." value={form.flatNumber}
                        onChange={e => setForm({...form, flatNumber: e.target.value})} required />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Type</label>
                      <select className="form-control" value={form.type}
                        onChange={e => setForm({...form, type: e.target.value})}>
                        <option>1BHK</option><option>2BHK</option><option>3BHK</option>
                        <option>4BHK</option><option>Penthouse</option><option>Studio</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Area (sq.ft)</label>
                      <input type="number" className="form-control" value={form.sqFt}
                        onChange={e => setForm({...form, sqFt: +e.target.value})} />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Billing Type</label>
                      <select className="form-control" value={form.billingType}
                        onChange={e => setForm({...form, billingType: e.target.value})}>
                        <option value="fixed">Fixed Rate</option>
                        <option value="sqft">Per Sq.ft</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{form.billingType === 'fixed' ? 'Monthly Rate (₹)' : 'Rate per Sq.ft (₹)'}</label>
                      <input type="number" className="form-control"
                        value={form.billingType === 'fixed' ? form.fixedRate : form.ratePerSqFt}
                        onChange={e => setForm({...form, [form.billingType === 'fixed' ? 'fixedRate' : 'ratePerSqFt']: +e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Property</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Add Modal */}
        {showBulk && (
          <div className="modal-overlay" onClick={() => setShowBulk(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Bulk Add Properties</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowBulk(false)}>✕</button>
              </div>
              <form onSubmit={handleBulkCreate}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Block</label>
                    <input className="form-control" placeholder="A" value={bulkForm.block}
                      onChange={e => setBulkForm({...bulkForm, block: e.target.value})} required />
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Start Flat</label>
                      <input type="number" className="form-control" value={bulkForm.startFlat}
                        onChange={e => setBulkForm({...bulkForm, startFlat: +e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>End Flat</label>
                      <input type="number" className="form-control" value={bulkForm.endFlat}
                        onChange={e => setBulkForm({...bulkForm, endFlat: +e.target.value})} required />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Type</label>
                      <select className="form-control" value={bulkForm.type}
                        onChange={e => setBulkForm({...bulkForm, type: e.target.value})}>
                        <option>2BHK</option><option>3BHK</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Fixed Rate (₹)</label>
                      <input type="number" className="form-control" value={bulkForm.fixedRate}
                        onChange={e => setBulkForm({...bulkForm, fixedRate: +e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={() => setShowBulk(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create All</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Properties;
