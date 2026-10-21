import { useState, useEffect, useRef } from 'react';
import Navbar from '../../components/Navbar';
import { authAPI, propertyAPI } from '../../services/api';
import societyLogo from '../../assets/logo.png';
import {
  HiOutlineUser, HiOutlineEnvelope, HiOutlinePhone,
  HiOutlineBuildingOffice2, HiOutlinePencilSquare,
  HiOutlineTrash, HiOutlineCheckCircle, HiOutlineXCircle,
  HiOutlineUserPlus, HiOutlineMagnifyingGlass, HiOutlineKey,
  HiOutlineCamera, HiOutlineShieldCheck, HiOutlineWrenchScrewdriver,
  HiOutlineSparkles,
} from 'react-icons/hi2';

const API_STATIC_URL = 'http://localhost:5000';

const Residents = () => {
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'resident',
    propertyId: '',
    isVerified: true,
    verificationStatus: 'approved',
    password: '',
  });
  const [editAvatarPreview, setEditAvatarPreview] = useState(null);
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const editFileInputRef = useRef(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'resident',
    propertyId: '',
    password: 'Dwarkesh@123',
    isVerified: true,
    verificationStatus: 'approved',
  });
  const [createAvatarPreview, setCreateAvatarPreview] = useState(null);
  const [createAvatarFile, setCreateAvatarFile] = useState(null);
  const createFileInputRef = useRef(null);
  const [savingCreate, setSavingCreate] = useState(false);

  // Status message
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    loadData();
  }, [roleFilter, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter === 'verified') params.verified = 'true';
      if (statusFilter === 'pending') params.verified = 'false';

      const [userRes, propRes] = await Promise.all([
        authAPI.getAllUsers(params),
        propertyAPI.getAll(),
      ]);

      setUsers(userRes.data || []);
      setProperties(propRes.data || []);
    } catch (err) {
      console.error('Failed to load users & properties:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open Edit User Modal
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'resident',
      propertyId: user.propertyId?._id || user.propertyId || '',
      isVerified: Boolean(user.isVerified),
      verificationStatus: user.verificationStatus || 'approved',
      password: '',
    });
    setEditAvatarPreview(null);
    setEditAvatarFile(null);
    setStatusMsg({ type: '', text: '' });
  };

  // Handle Edit User Photo Selection
  const handleEditFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setEditAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // Submit User Details Modification
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    setStatusMsg({ type: '', text: '' });

    try {
      if (editAvatarFile) {
        const formData = new FormData();
        formData.append('name', editForm.name);
        formData.append('email', editForm.email);
        formData.append('phone', editForm.phone);
        formData.append('role', editForm.role);
        formData.append('propertyId', editForm.propertyId || '');
        formData.append('isVerified', editForm.isVerified);
        formData.append('verificationStatus', editForm.verificationStatus);
        if (editForm.password) formData.append('password', editForm.password);
        formData.append('avatar', editAvatarFile);

        await authAPI.updateUser(editingUser._id, formData);
      } else {
        const payload = {
          ...editForm,
          propertyId: editForm.propertyId || null,
        };
        if (!payload.password) delete payload.password;
        await authAPI.updateUser(editingUser._id, payload);
      }

      setStatusMsg({ type: 'success', text: `User ${editForm.name} updated successfully!` });
      setEditingUser(null);
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Create User Photo Selection
  const handleCreateFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCreateAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCreateAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // Submit New User Creation
  const handleSaveCreate = async (e) => {
    e.preventDefault();
    setSavingCreate(true);
    try {
      if (createAvatarFile) {
        const formData = new FormData();
        formData.append('name', createForm.name);
        formData.append('email', createForm.email);
        formData.append('phone', createForm.phone);
        formData.append('role', createForm.role);
        formData.append('propertyId', createForm.propertyId || '');
        formData.append('password', createForm.password);
        formData.append('isVerified', createForm.isVerified);
        formData.append('verificationStatus', createForm.verificationStatus);
        formData.append('avatar', createAvatarFile);

        await authAPI.createUser(formData);
      } else {
        await authAPI.createUser(createForm);
      }

      setStatusMsg({ type: 'success', text: `User ${createForm.name} created successfully!` });
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        role: 'resident',
        propertyId: '',
        password: 'Dwarkesh@123',
        isVerified: true,
        verificationStatus: 'approved',
      });
      setCreateAvatarFile(null);
      setCreateAvatarPreview(null);
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSavingCreate(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${user.name}" (${user.email})?`)) {
      return;
    }
    try {
      await authAPI.deleteUser(user._id);
      setStatusMsg({ type: 'success', text: `User ${user.name} removed.` });
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Could not delete user');
    }
  };

  // Fast verify or reject
  const handleVerify = async (userId, status) => {
    try {
      await authAPI.verifyUser(userId, { status });
      setStatusMsg({ type: 'success', text: `User status changed to ${status}` });
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Verification update failed');
    }
  };

  // Filter users by search query
  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const flat = u.propertyId ? `${u.propertyId.block}-${u.propertyId.flatNumber}`.toLowerCase() : '';
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      flat.includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  // Calculate statistics
  const totalResidents = users.filter((u) => u.role === 'resident').length;
  const pendingApprovals = users.filter((u) => !u.isVerified || u.verificationStatus === 'pending').length;
  const totalStaff = users.filter((u) => u.role === 'guard' || u.role === 'technician').length;

  const renderAvatar = (u, size = 36) => {
    if (u?.avatar) {
      const src = u.avatar.startsWith('http') || u.avatar.startsWith('data:') ? u.avatar : `${API_STATIC_URL}${u.avatar}`;
      return (
        <img
          src={src}
          alt={u.name}
          style={{
            width: size,
            height: size,
            borderRadius: 'var(--radius-full)',
            objectFit: 'cover',
            border: '2px solid var(--primary-400)',
            flexShrink: 0,
          }}
        />
      );
    }
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 'var(--radius-full)',
          background: 'var(--gradient-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size > 40 ? '1.4rem' : '0.8rem',
          fontWeight: 700,
          color: 'white',
          flexShrink: 0,
        }}
      >
        {u?.name?.charAt(0)?.toUpperCase() || 'U'}
      </div>
    );
  };

  return (
    <>
      <Navbar title="User & Resident Management" subtitle="View, modify, and administer all society members and staff" />
      <div className="page-wrapper">
        {/* Banner with metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}>
          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--radius-md)',
              background: 'rgba(20, 184, 166, 0.15)', color: 'var(--primary-400)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
            }}>
              <HiOutlineUser />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Users</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{users.length}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--radius-md)',
              background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
            }}>
              <HiOutlineBuildingOffice2 />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Residents</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalResidents}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--radius-md)',
              background: 'rgba(234, 179, 8, 0.15)', color: '#facc15',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
            }}>
              <HiOutlineShieldCheck />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Guards & Staff</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalStaff}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--radius-md)',
              background: pendingApprovals > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              color: pendingApprovals > 0 ? '#f87171' : '#4ade80',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
            }}>
              <HiOutlineCheckCircle />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Pending Approvals</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{pendingApprovals}</div>
            </div>
          </div>
        </div>

        {/* Status notification */}
        {statusMsg.text && (
          <div style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${statusMsg.type === 'success' ? '#22c55e' : '#ef4444'}`,
            color: statusMsg.type === 'success' ? '#86efac' : '#fca5a5',
          }}>
            <span>{statusMsg.text}</span>
            <button
              onClick={() => setStatusMsg({ type: '', text: '' })}
              style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Action Header & Search */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}>
          {/* Search Bar */}
          <div style={{
            position: 'relative',
            minWidth: 280,
            flex: '1 1 300px',
            maxWidth: 450,
          }}>
            <HiOutlineMagnifyingGlass style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
              fontSize: '1.1rem',
            }} />
            <input
              type="text"
              placeholder="Search by name, email, phone, or flat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 42, width: '100%' }}
            />
          </div>

          {/* Add User Button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <HiOutlineUserPlus /> Add New Member / User
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          {[
            { id: 'all', label: 'All Roles' },
            { id: 'resident', label: 'Residents' },
            { id: 'guard', label: 'Guards' },
            { id: 'technician', label: 'Technicians' },
            { id: 'admin', label: 'Admins' },
          ].map((t) => (
            <button
              key={t.id}
              className={`tab ${roleFilter === t.id ? 'active' : ''}`}
              onClick={() => setRoleFilter(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Users Table */}
        <div className="table-container">
          <div className="table-header">
            <h3>Society Users Directory ({filteredUsers.length})</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setStatusFilter('all')}
              >
                All Status
              </button>
              <button
                className={`btn btn-sm ${statusFilter === 'verified' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setStatusFilter('verified')}
              >
                Verified Only
              </button>
              <button
                className={`btn btn-sm ${statusFilter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setStatusFilter('pending')}
              >
                Pending Only
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User & Photo</th>
                  <th>Role</th>
                  <th>Contact Info</th>
                  <th>Assigned Flat</th>
                  <th>Verification</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>
                      <div className="loading-spinner" style={{ margin: '0 auto', width: 32, height: 32 }} />
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>
                      No matching users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u._id}>
                      {/* Name & Photo */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {renderAvatar(u, 38)}
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td>
                        <span className={`badge ${
                          u.role === 'admin' ? 'badge-accent' :
                          u.role === 'guard' ? 'badge-warning' :
                          u.role === 'technician' ? 'badge-primary' : 'badge-info'
                        }`} style={{ textTransform: 'capitalize' }}>
                          {u.role}
                        </span>
                      </td>

                      {/* Contact */}
                      <td>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          📞 {u.phone || '—'}
                        </div>
                      </td>

                      {/* Flat */}
                      <td>
                        {u.propertyId ? (
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {u.propertyId.block}-{u.propertyId.flatNumber}
                            {u.propertyId.type && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginLeft: 6 }}>
                                ({u.propertyId.type})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className={`badge ${u.isVerified ? 'badge-success' : 'badge-warning'}`}>
                            {u.verificationStatus || (u.isVerified ? 'approved' : 'pending')}
                          </span>
                          {!u.isVerified && u.verificationStatus === 'pending' && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                className="btn btn-accent btn-sm"
                                style={{ padding: '2px 8px' }}
                                title="Approve"
                                onClick={() => handleVerify(u._id, 'approved')}
                              >
                                ✓
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                style={{ padding: '2px 8px' }}
                                title="Reject"
                                onClick={() => handleVerify(u._id, 'rejected')}
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenEdit(u)}
                            title="Modify User Details"
                          >
                            <HiOutlinePencilSquare /> Edit
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ color: 'var(--danger-400)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                            onClick={() => handleDeleteUser(u)}
                            title="Delete User"
                          >
                            <HiOutlineTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL 1: Edit / Modify User Details */}
        {editingUser && (
          <div className="modal-overlay" onClick={() => setEditingUser(null)}>
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div className="modal-header">
                <h3>Modify User Details: {editingUser.name}</h3>
                <button className="modal-close" onClick={() => setEditingUser(null)}>✕</button>
              </div>

              <form onSubmit={handleSaveEdit}>
                {/* Photo Upload in Admin */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 16,
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 16,
                }}>
                  <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                    {editAvatarPreview ? (
                      <img
                        src={editAvatarPreview}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                      />
                    ) : renderAvatar(editingUser, 64)}
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      User Profile Photo
                    </label>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => editFileInputRef.current?.click()}
                    >
                      <HiOutlineCamera /> Change Photo
                    </button>
                    <input
                      type="file"
                      ref={editFileInputRef}
                      onChange={handleEditFileChange}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>User Role *</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      required
                    >
                      <option value="resident">Resident</option>
                      <option value="guard">Security Guard</option>
                      <option value="technician">Technician</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>

                {/* Assigned Flat Dropdown */}
                <div className="form-group" style={{ marginTop: 14 }}>
                  <label>Assigned Flat / Property</label>
                  <select
                    value={editForm.propertyId}
                    onChange={(e) => setEditForm({ ...editForm, propertyId: e.target.value })}
                  >
                    <option value="">— No Flat Assigned —</option>
                    {properties.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.block}-{p.flatNumber} ({p.type || 'Flat'}) {p.ownerId && p.ownerId !== editingUser._id ? '• [Occupied]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Verification Status */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 14 }}>
                  <div className="form-group">
                    <label>Verification Status</label>
                    <select
                      value={editForm.verificationStatus}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditForm({
                          ...editForm,
                          verificationStatus: val,
                          isVerified: val === 'approved',
                        });
                      }}
                    >
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Reset Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep unchanged"
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer" style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setEditingUser(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                    {savingEdit ? 'Updating User...' : 'Save User Details'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Add New User */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div className="modal-header">
                <h3>Add New Society Member / User</h3>
                <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
              </div>

              <form onSubmit={handleSaveCreate}>
                {/* Photo Upload in Add User */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 16,
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 16,
                }}>
                  <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                    {createAvatarPreview ? (
                      <img
                        src={createAvatarPreview}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%', borderRadius: 'var(--radius-full)',
                        background: 'var(--gradient-primary)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem',
                      }}>
                        <HiOutlineUser />
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      User Photo (Optional)
                    </label>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => createFileInputRef.current?.click()}
                    >
                      <HiOutlineCamera /> Select Photo
                    </button>
                    <input
                      type="file"
                      ref={createFileInputRef}
                      onChange={handleCreateFileChange}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Patel"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      placeholder="e.g. resident@society.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Role *</label>
                    <select
                      value={createForm.role}
                      onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                      required
                    >
                      <option value="resident">Resident</option>
                      <option value="guard">Security Guard</option>
                      <option value="technician">Technician</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 14 }}>
                  <div className="form-group">
                    <label>Initial Password *</label>
                    <input
                      type="text"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Assign Flat / Property</label>
                    <select
                      value={createForm.propertyId}
                      onChange={(e) => setCreateForm({ ...createForm, propertyId: e.target.value })}
                    >
                      <option value="">— Unassigned —</option>
                      {properties.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.block}-{p.flatNumber} ({p.type || 'Flat'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="modal-footer" style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingCreate}>
                    {savingCreate ? 'Creating User...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Residents;
