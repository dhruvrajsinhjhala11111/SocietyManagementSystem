import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [visitorApproval, setVisitorApproval] = useState(null);
  const [latestVisitorResponse, setLatestVisitorResponse] = useState(null);

  const addNotification = (notif) => {
    setNotifications(prev => [{
      ...notif,
      id: Date.now(),
      time: new Date(),
      isRead: false,
    }, ...prev].slice(0, 50));
  };

  const clearVisitorApproval = () => setVisitorApproval(null);

  const markNotificationRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:5000', {
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        newSocket.emit('join', user._id);
        newSocket.emit('join_role', user.role);
      });

      // Listen for visitor approval requests (for residents)
      newSocket.on('visitor_approval_request', (data) => {
        setVisitorApproval(data);
        addNotification({
          title: 'Visitor at Gate',
          message: data.message,
          type: 'visitor',
        });
      });

      // Listen for visitor check-in
      newSocket.on('visitor_checkin', (data) => {
        addNotification({
          title: 'Visitor Checked In',
          message: data.message,
          type: 'visitor',
        });
      });

      // Listen for visitor response (for guards)
      newSocket.on('visitor_response', (data) => {
        setLatestVisitorResponse(data);
        addNotification({
          title: data.action === 'approve' ? '✅ Entry Approved' : '❌ Entry Denied',
          message: data.message,
          type: 'visitor',
        });
      });

      // Listen for ticket updates
      newSocket.on('ticket_update', (data) => {
        addNotification({
          title: 'Ticket Update',
          message: `Ticket status: ${data.status}`,
          type: 'ticket',
        });
      });

      // Listen for ticket assignments
      newSocket.on('ticket_assigned', (data) => {
        addNotification({
          title: 'New Task Assigned',
          message: `You have a new task: ${data.ticket?.title}`,
          type: 'ticket',
        });
      });

      // Listen for payment reminders
      newSocket.on('payment_reminder', (data) => {
        addNotification({
          title: 'Payment Reminder',
          message: data.message,
          type: 'billing',
        });
      });

      // Listen for new notices
      newSocket.on('new_notice', (data) => {
        addNotification({
          title: 'New Notice',
          message: data.message,
          type: 'notice',
        });
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{
      socket,
      notifications,
      visitorApproval,
      clearVisitorApproval,
      latestVisitorResponse,
      setLatestVisitorResponse,
      markNotificationRead,
      addNotification,
    }}>
      {children}
    </SocketContext.Provider>
  );
};
