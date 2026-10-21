import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { noticeAPI } from '../../services/api';
import { HiOutlinePlus } from 'react-icons/hi2';

const AdminNotices = () => {
  const [notices, setNotices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'general', isPinned: false });

  useEffect(() => { loadNotices(); }, []);

  const loadNotices = async () => {
    try {
      const res = await noticeAPI.getAll();
      setNotices(res.data);
    } catch (err) { console.error(err); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await noticeAPI.create(form);
      setShowModal(false);
      setForm({ title: '', content: '', category: 'general', isPinned: false });
      loadNotices();
    } catch (err) { alert('Error creating notice'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this notice?')) return;
    try {
      await noticeAPI.delete(id);
      loadNotices();
    } catch (err) { alert('Error'); }
  };

  const getCategoryColor = (cat) => {
    const map = { general: 'var(--primary-400)', maintenance: 'var(--warning-400)', event: 'var(--accent-400)', emergency: 'var(--danger-400)', meeting: 'var(--info-400)', rules: 'var(--gray-400)' };
    return map[cat] || 'var(--primary-400)';
  };

  return (
    <>
      <Navbar title="Notices" subtitle="Community communication" />
      <div className="page-wrapper">
        <div className="page-header">
          <div>
            <h2>Notice Board</h2>
            <p>Post important updates for all residents</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <HiOutlinePlus /> New Notice
          </button>
        </div>

        {notices.map(notice => (
          <div key={notice._id} className={`notice-card ${notice.isPinned ? 'pinned' : ''}`}>
            <div className="notice-meta">
              {notice.isPinned && <span className="badge badge-primary">📌 Pinned</span>}
              <span className="notice-category" style={{ color: getCategoryColor(notice.category) }}>
                {notice.category}
              </span>
            </div>
            <h4>{notice.title}</h4>
            <div className="notice-content">{notice.content}</div>
            <div className="notice-footer">
              <span>By {notice.authorId?.name} · {new Date(notice.createdAt).toLocaleDateString()}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(notice._id)} style={{ color: 'var(--danger-400)' }}>
                Delete
              </button>
            </div>
          </div>
        ))}

        {notices.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📢</div>
            <h4>No notices yet</h4>
            <p>Post your first notice to communicate with all residents</p>
          </div>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Create Notice</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Title</label>
                    <input className="form-control" placeholder="Notice title" value={form.title}
                      onChange={e => setForm({...form, title: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Content</label>
                    <textarea className="form-control" rows={5} placeholder="Write your notice..."
                      value={form.content} onChange={e => setForm({...form, content: e.target.value})} required />
                  </div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label>Category</label>
                      <select className="form-control" value={form.category}
                        onChange={e => setForm({...form, category: e.target.value})}>
                        <option value="general">General</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="event">Event</option>
                        <option value="emergency">Emergency</option>
                        <option value="meeting">Meeting</option>
                        <option value="rules">Rules</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'end', paddingBottom: 18 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.isPinned}
                          onChange={e => setForm({...form, isPinned: e.target.checked})} />
                        Pin to top
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Publish Notice</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminNotices;
