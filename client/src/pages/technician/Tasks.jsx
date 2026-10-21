import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { ticketAPI } from '../../services/api';
import {
  HiOutlineWrenchScrewdriver, HiOutlineCheckCircle,
  HiOutlineClock, HiOutlineChatBubbleBottomCenterText,
} from 'react-icons/hi2';

const TechnicianTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: 'in_progress', comment: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const res = await ticketAPI.getAll();
      setTasks(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('status', statusForm.status);
      formData.append('comment', statusForm.comment);

      await ticketAPI.updateStatus(selectedTask._id, formData);
      alert('Task status updated successfully!');
      setSelectedTask(null);
      loadTasks();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const openTasks = tasks.filter(t => t.status === 'open');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const resolvedTasks = tasks.filter(t => t.status === 'resolved');

  return (
    <div className="page-wrapper">
      <Navbar title="Technician Service Board" subtitle="Assigned work orders, repairs, and maintenance" />

      {/* Task Summary Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <h3>Open Work Orders</h3>
            <div className="stat-value" style={{ color: 'var(--warning-400)' }}>{openTasks.length}</div>
            <div className="stat-change">Pending action</div>
          </div>
          <div className="stat-icon warning">
            <HiOutlineClock />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <h3>In Progress</h3>
            <div className="stat-value" style={{ color: 'var(--info-400)' }}>{inProgressTasks.length}</div>
            <div className="stat-change">Currently working on</div>
          </div>
          <div className="stat-icon info">
            <HiOutlineWrenchScrewdriver />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <h3>Resolved</h3>
            <div className="stat-value" style={{ color: 'var(--accent-400)' }}>{resolvedTasks.length}</div>
            <div className="stat-change">Completed tasks</div>
          </div>
          <div className="stat-icon accent">
            <HiOutlineCheckCircle />
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="table-container">
        <div className="table-header">
          <h3>Assigned Maintenance Requests ({tasks.length})</h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Issue Details</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Location / Flat</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>
                    No maintenance tickets assigned. Great job!
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task._id}>
                    <td>
                      <code style={{ color: 'var(--primary-400)', fontWeight: 700 }}>
                        #{task._id.slice(-5).toUpperCase()}
                      </code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                        {task.description}
                      </div>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize' }}>{task.category}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${
                        task.priority === 'urgent' ? 'danger' :
                        task.priority === 'high' ? 'warning' : 'neutral'
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td>
                      {task.propertyId ? (
                        <span>Block {task.propertyId.block} - Flat {task.propertyId.flatNumber}</span>
                      ) : (
                        <span>Common Area</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${
                        task.status === 'resolved' ? 'success' :
                        task.status === 'in_progress' ? 'info' : 'warning'
                      }`}>
                        {task.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setSelectedTask(task);
                          setStatusForm({ status: task.status === 'open' ? 'in_progress' : 'resolved', comment: '' });
                        }}
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Modal */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Update Work Order #{selectedTask._id.slice(-5).toUpperCase()}</h3>
              <button className="modal-close" onClick={() => setSelectedTask(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdateStatus}>
              <div style={{ marginBottom: 14 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedTask.title}</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {selectedTask.description}
                </p>
              </div>

              <div className="form-group">
                <label>Set Status</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                >
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved / Fixed</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="form-group">
                <label>Resolution Notes / Comments</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Replaced faulty washer and tested water flow..."
                  value={statusForm.comment}
                  onChange={(e) => setStatusForm({ ...statusForm, comment: e.target.value })}
                />
              </div>

              <div className="modal-footer" style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setSelectedTask(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianTasks;
