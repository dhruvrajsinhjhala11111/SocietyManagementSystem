import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { noticeAPI } from '../../services/api';
import { HiOutlineMegaphone, HiOutlineCalendarDays } from 'react-icons/hi2';

const ResidentNotices = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    try {
      const res = await noticeAPI.getAll();
      setNotices(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar title="Society Notice Board" subtitle="Official circulars, updates, and announcements" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {notices.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
            No notices published at this moment.
          </div>
        ) : (
          notices.map((notice) => (
            <div key={notice._id} className="card" style={{
              borderLeft: notice.isPinned ? '4px solid var(--primary-500)' : '1px solid var(--border-default)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                    background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary-400)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                  }}>
                    <HiOutlineMegaphone />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                      {notice.title}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Posted on {new Date(notice.createdAt).toLocaleDateString()} by Society Management
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {notice.isPinned && (
                    <span className="badge badge-primary">📌 Pinned</span>
                  )}
                  <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                    {notice.category || 'General'}
                  </span>
                </div>
              </div>

              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                margin: '12px 0 0',
                whiteSpace: 'pre-line',
              }}>
                {notice.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ResidentNotices;
