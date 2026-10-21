import { useState } from 'react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import {
  HiOutlineUserGroup, HiOutlinePlus,
  HiOutlineTrash, HiOutlineUser, HiOutlinePhone,
} from 'react-icons/hi2';

const ResidentFamily = () => {
  const { user, updateUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', relation: 'Spouse', email: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authAPI.addFamily(form);
      updateUser({ familyMembers: res.data.familyMembers });
      setForm({ name: '', phone: '', relation: 'Spouse', email: '' });
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to add family member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id) => {
    if (!confirm('Remove this family member?')) return;
    try {
      const res = await authAPI.removeFamily(id);
      updateUser({ familyMembers: res.data.familyMembers });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const members = user?.familyMembers || [];

  return (
    <div className="page-wrapper">
      <Navbar title="My Family & Emergency Contacts" subtitle="Registered occupants for gate access authorization" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Registered Family Members</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <HiOutlinePlus /> Add Family Member
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 20,
      }}>
        {members.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
            No additional family members registered yet.
          </div>
        ) : (
          members.map((m) => (
            <div key={m._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary-400)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                }}>
                  <HiOutlineUser />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{m.name}</h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {m.relation} • {m.phone}
                  </div>
                </div>
              </div>
              <button
                className="btn btn-outline btn-sm"
                style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: 'var(--danger-400)' }}
                onClick={() => handleRemove(m._id)}
                title="Remove Member"
              >
                <HiOutlineTrash />
              </button>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Add Family Member</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Relationship</label>
                <select
                  value={form.relation}
                  onChange={(e) => setForm({ ...form, relation: e.target.value })}
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="modal-footer" style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentFamily;
