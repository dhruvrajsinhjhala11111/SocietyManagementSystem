import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';

// Auth
import Login from './pages/Login';
import AdminLogin from './pages/admin/AdminLogin';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminProperties from './pages/admin/Properties';
import AdminResidents from './pages/admin/Residents';
import AdminVisitors from './pages/admin/Visitors';
import AdminBilling from './pages/admin/Billing';
import AdminTickets from './pages/admin/Tickets';
import AdminNotices from './pages/admin/Notices';
import AdminBookings from './pages/admin/Bookings';

// Resident Pages
import ResidentDashboard from './pages/resident/Dashboard';
import ResidentVisitors from './pages/resident/Visitors';
import ResidentBills from './pages/resident/Bills';
import ResidentComplaints from './pages/resident/Complaints';
import ResidentNotices from './pages/resident/Notices';
import ResidentBookings from './pages/resident/Bookings';
import ResidentFamily from './pages/resident/Family';

// Guard Pages
import GuardGateScreen from './pages/guard/GateScreen';
import GuardVisitorLog from './pages/guard/VisitorLog';

// Technician Pages
import TechnicianTasks from './pages/technician/Tasks';

// Common User Pages
import Profile from './pages/Profile';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--primary-400)',
      }}>
        <div className="loading-spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to user's appropriate home
    switch (user.role) {
      case 'admin': return <Navigate to="/admin" replace />;
      case 'resident': return <Navigate to="/resident" replace />;
      case 'guard': return <Navigate to="/guard" replace />;
      case 'technician': return <Navigate to="/technician" replace />;
      default: return <Navigate to="/login" replace />;
    }
  }

  return children;
};

// Root index redirector
const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'admin': return <Navigate to="/admin" replace />;
    case 'resident': return <Navigate to="/resident" replace />;
    case 'guard': return <Navigate to="/guard" replace />;
    case 'technician': return <Navigate to="/technician" replace />;
    default: return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/" element={<RootRedirect />} />

            {/* Authenticated Application with Layout */}
            <Route element={<Layout />}>
              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="/admin/properties" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminProperties /></ProtectedRoute>
              } />
              <Route path="/admin/residents" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminResidents /></ProtectedRoute>
              } />
              <Route path="/admin/visitors" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminVisitors /></ProtectedRoute>
              } />
              <Route path="/admin/billing" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminBilling /></ProtectedRoute>
              } />
              <Route path="/admin/tickets" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminTickets /></ProtectedRoute>
              } />
              <Route path="/admin/notices" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminNotices /></ProtectedRoute>
              } />
              <Route path="/admin/bookings" element={
                <ProtectedRoute allowedRoles={['admin']}><AdminBookings /></ProtectedRoute>
              } />

              {/* Resident Routes */}
              <Route path="/resident" element={
                <ProtectedRoute allowedRoles={['resident']}><ResidentDashboard /></ProtectedRoute>
              } />
              <Route path="/resident/visitors" element={
                <ProtectedRoute allowedRoles={['resident']}><ResidentVisitors /></ProtectedRoute>
              } />
              <Route path="/resident/bills" element={
                <ProtectedRoute allowedRoles={['resident']}><ResidentBills /></ProtectedRoute>
              } />
              <Route path="/resident/complaints" element={
                <ProtectedRoute allowedRoles={['resident']}><ResidentComplaints /></ProtectedRoute>
              } />
              <Route path="/resident/notices" element={
                <ProtectedRoute allowedRoles={['resident']}><ResidentNotices /></ProtectedRoute>
              } />
              <Route path="/resident/bookings" element={
                <ProtectedRoute allowedRoles={['resident']}><ResidentBookings /></ProtectedRoute>
              } />
              <Route path="/resident/family" element={
                <ProtectedRoute allowedRoles={['resident']}><ResidentFamily /></ProtectedRoute>
              } />

              {/* Guard Routes */}
              <Route path="/guard" element={
                <ProtectedRoute allowedRoles={['guard']}><GuardGateScreen /></ProtectedRoute>
              } />
              <Route path="/guard/log" element={
                <ProtectedRoute allowedRoles={['guard']}><GuardVisitorLog /></ProtectedRoute>
              } />

              {/* Technician Routes */}
              <Route path="/technician" element={
                <ProtectedRoute allowedRoles={['technician']}><TechnicianTasks /></ProtectedRoute>
              } />

              {/* User Profile Route (All Roles) */}
              <Route path="/profile" element={
                <ProtectedRoute allowedRoles={['admin', 'resident', 'guard', 'technician']}>
                  <Profile />
                </ProtectedRoute>
              } />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
