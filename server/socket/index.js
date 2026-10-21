const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join user-specific room
    socket.on('join', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined room user_${userId}`);
    });

    // Join role-based room
    socket.on('join_role', (role) => {
      socket.join(role === 'resident' ? 'residents' : role === 'guard' ? 'guards' : 'admins');
      console.log(`🏷️ User joined ${role} room`);
    });

    // Handle visitor approval response
    socket.on('visitor_response', (data) => {
      const { guardId, visitorId, action, visitorName } = data;
      io.to(`user_${guardId}`).emit('visitor_response', {
        visitorId,
        action,
        message: action === 'approve'
          ? `✅ Entry approved for ${visitorName}`
          : `❌ Entry denied for ${visitorName}`,
      });
    });

    // Handle ticket status updates
    socket.on('ticket_update', (data) => {
      const { residentId, ticketId, status } = data;
      io.to(`user_${residentId}`).emit('ticket_update', {
        ticketId,
        status,
        message: `Your ticket status updated to: ${status}`,
      });
    });

    // Typing indicator for chat (future use)
    socket.on('typing', (data) => {
      socket.to(data.room).emit('typing', data);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = socketHandler;
