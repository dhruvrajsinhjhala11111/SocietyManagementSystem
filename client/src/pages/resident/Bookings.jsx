import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { bookingAPI } from '../../services/api';
import {
  HiOutlineCalendarDays, HiOutlineClock,
  HiOutlineCheckCircle, HiOutlinePlus,
} from 'react-icons/hi2';

const ResidentBookings = () => {
  const [facilities, setFacilities] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [facRes, bookRes] = await Promise.all([
        bookingAPI.getFacilities(),
        bookingAPI.getAll(),
      ]);
      setFacilities(facRes.data || []);
      setMyBookings(bookRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedFacility || !selectedSlot) {
      alert('Please select a facility and a time slot');
      return;
    }
    setSubmitting(true);
    try {
      await bookingAPI.create({
        facilityId: selectedFacility._id,
        facilityName: selectedFacility.name,
        date: bookingDate,
        bookingDate,
        slot: {
          start: selectedSlot.start,
          end: selectedSlot.end,
        },
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
      });
      alert('Facility booked successfully!');
      setSelectedFacility(null);
      setSelectedSlot(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to book slot');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar title="Facility Booking" subtitle="Reserve clubhouse, tennis court, pool, or gym" />

      {/* Facilities Grid */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Available Amenities & Facilities</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        marginBottom: 32,
      }}>
        {facilities.map((fac) => (
          <div key={fac._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{fac.name}</h4>
                <span className={`badge badge-${fac.isPaid ? 'warning' : 'success'}`}>
                  {fac.isPaid ? `₹${fac.pricePerSlot}/slot` : 'Free'}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: 16 }}>
                {fac.description}
              </p>
            </div>
            <button
              className="btn btn-outline"
              style={{ width: '100%' }}
              onClick={() => { setSelectedFacility(fac); setSelectedSlot(null); }}
            >
              <HiOutlineCalendarDays /> Select & Book Slots
            </button>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {selectedFacility && (
        <div className="modal-overlay" onClick={() => setSelectedFacility(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>Book {selectedFacility.name}</h3>
              <button className="modal-close" onClick={() => setSelectedFacility(null)}>✕</button>
            </div>
            <form onSubmit={handleBook}>
              <div className="form-group">
                <label>Select Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Select Time Slot</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 8 }}>
                  {selectedFacility.availableSlots?.map((slot, i) => {
                    const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`btn ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: '0.82rem', padding: '10px' }}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        <HiOutlineClock /> {slot.start} - {slot.end}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedFacility.isPaid && (
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Slot Fee:</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--primary-300)' }}>
                    ₹{selectedFacility.pricePerSlot}
                  </strong>
                </div>
              )}

              <div className="modal-footer" style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setSelectedFacility(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !selectedSlot}>
                  {submitting ? 'Confirming...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* My Bookings History */}
      <div className="table-container">
        <div className="table-header">
          <h3>My Reservations ({myBookings.length})</h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Facility</th>
                <th>Booking Date</th>
                <th>Slot</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {myBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>
                    You have no active bookings. Select a facility above to reserve a slot!
                  </td>
                </tr>
              ) : (
                myBookings.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {b.facilityName || b.facilityId?.name || 'Facility'}
                      </span>
                    </td>
                    <td>{new Date(b.date || b.bookingDate).toLocaleDateString()}</td>
                    <td>{b.slot?.start || b.startTime} - {b.slot?.end || b.endTime}</td>
                    <td>{b.isPaid && b.amount ? `₹${b.amount}` : 'Free'}</td>
                    <td>
                      <span className={`badge badge-${
                        b.status === 'confirmed' ? 'success' :
                        b.status === 'cancelled' ? 'danger' : 'warning'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResidentBookings;
