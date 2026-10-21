import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { bookingAPI } from '../../services/api';
import { HiOutlinePlus } from 'react-icons/hi2';

const AdminBookings = () => {
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', isPaid: false, pricePerSlot: 0,
    availableSlots: [{ start: '09:00', end: '11:00' }],
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [facRes, bookRes] = await Promise.all([
        bookingAPI.getFacilities(),
        bookingAPI.getAll(),
      ]);
      setFacilities(facRes.data);
      setBookings(bookRes.data);
    } catch (err) { console.error(err); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await bookingAPI.createFacility(form);
      setShowModal(false);
      loadData();
    } catch (err) { alert('Error'); }
  };

  const addSlot = () => {
    setForm({ ...form, availableSlots: [...form.availableSlots, { start: '', end: '' }] });
  };

  return (
    <>
      <Navbar title="Facilities" subtitle="Community resource management" />
      <div className="page-wrapper">
        <div className="page-header">
          <div>
            <h2>Facility & Booking Management</h2>
            <p>Manage society amenities and reservations</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <HiOutlinePlus /> Add Facility
          </button>
        </div>

        <div className="grid-3" style={{ marginBottom: 28 }}>
          {facilities.map(f => (
            <div key={f._id} className="facility-card">
              <div className="facility-icon">
                {f.icon === 'clubhouse' ? '🏛️' : f.icon === 'tennis' ? '🎾' :
                 f.icon === 'hall' ? '🏢' : f.icon === 'pool' ? '🏊' :
                 f.icon === 'gym' ? '💪' : '🏗️'}
              </div>
              <h4>{f.name}</h4>
              <p>{f.description}</p>
              <div className="facility-price">
                {f.isPaid ? `₹${f.pricePerSlot}/slot` : '🆓 Free'}
              </div>
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                {f.availableSlots?.length || 0} slots available
              </div>
            </div>
          ))}
        </div>

        <div className="table-container">
          <div className="table-header">
            <h3>Recent Bookings</h3>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Resident</th>
                  <th>Date</th>
                  <th>Slot</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b._id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.facilityName}</td>
                    <td>{b.residentId?.name}</td>
                    <td>{new Date(b.date).toLocaleDateString()}</td>
                    <td>{b.slot?.start} - {b.slot?.end}</td>
                    <td>{b.isPaid ? `₹${b.amount}` : 'Free'}</td>
                    <td>
                      <span className={`badge ${b.status === 'confirmed' ? 'badge-success' : 'badge-neutral'}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr><td colSpan={6}>
                    <div className="empty-state"><p>No bookings yet</p></div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add Facility</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Name</label>
                    <input className="form-control" value={form.name} placeholder="e.g. Clubhouse"
                      onChange={e => setForm({...form, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea className="form-control" value={form.description} rows={3}
                      onChange={e => setForm({...form, description: e.target.value})} />
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={form.isPaid}
                          onChange={e => setForm({...form, isPaid: e.target.checked})} />
                        Paid Facility
                      </label>
                    </div>
                    {form.isPaid && (
                      <div className="form-group">
                        <label>Price per Slot (₹)</label>
                        <input type="number" className="form-control" value={form.pricePerSlot}
                          onChange={e => setForm({...form, pricePerSlot: +e.target.value})} />
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Time Slots</label>
                    {form.availableSlots.map((slot, i) => (
                      <div key={i} className="grid-2" style={{ marginBottom: 8 }}>
                        <input type="time" className="form-control" value={slot.start}
                          onChange={e => {
                            const slots = [...form.availableSlots];
                            slots[i].start = e.target.value;
                            setForm({...form, availableSlots: slots});
                          }} />
                        <input type="time" className="form-control" value={slot.end}
                          onChange={e => {
                            const slots = [...form.availableSlots];
                            slots[i].end = e.target.value;
                            setForm({...form, availableSlots: slots});
                          }} />
                      </div>
                    ))}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={addSlot}>+ Add Slot</button>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Facility</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminBookings;
