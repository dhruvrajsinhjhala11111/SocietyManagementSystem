const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const passport = require('passport');
const session = require('express-session');
const configurePassport = require('./config/passport');
const connectDB = require('./config/db');
const socketHandler = require('./socket');
const cron = require('node-cron');
const { generateMonthlyBills, markOverdueBills } = require('./utils/billingCalculator');

// Load env variables
dotenv.config();

// Remove sync connectDB and use async startServer below
const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Make io accessible to routes
app.set('io', io);

// Initialize socket handler
socketHandler(io);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
// Razorpay Webhook (must precede express.json() to maintain raw payload bytes for signature verification)
app.use('/api/webhooks', require('./routes/webhook'));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 1. Session Storage Tracking System
app.use(session({
  secret: process.env.SESSION_SECRET || 'antigravity_platform_secret_key',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use(passport.initialize());
app.use(passport.session());
configurePassport();

// -------------------------------------------------------------
// 4. API ENDPOINTS (Triggering Login & Callbacks) - UPDATED ⚡
// -------------------------------------------------------------

const User = require('./models/User');
const { generateToken } = require('./middleware/auth');

const handleCallbackRedirect = async (req, res) => {
  try {
    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
    let user = req.user;

    if (!user) {
      return res.redirect(`${CLIENT_URL}/login?error=${encodeURIComponent('OAuth authentication failed')}`);
    }

    // If user is not yet a saved Mongoose document (e.g. from mock chooser or raw profile)
    if (!user._id) {
      const email = (
        user.emails && user.emails[0]?.value ? user.emails[0].value :
        user.email ? user.email :
        `${user.username || user.id || 'user'}@${user.provider || 'social'}.com`
      ).toLowerCase().trim();

      const name = user.displayName || user.name || user.username || email.split('@')[0];
      const provider = user.provider || 'google';
      const pid = user.id || `${provider}_${Date.now()}`;

      let dbUser = await User.findOne({
        $or: [
          { [`oauthProviders.${provider}.id`]: pid },
          { email },
        ],
      }).populate('propertyId');

      if (!dbUser) {
        const role = email.includes('admin') ? 'admin' : 'resident';
        dbUser = await User.create({
          name,
          email,
          phone: 'Not provided',
          password: `OAuth_${provider}_${Date.now()}`,
          role,
          isVerified: true,
          verificationStatus: 'approved',
          avatar: user.photos && user.photos[0]?.value ? user.photos[0].value : '',
          oauthProviders: {
            [provider]: {
              id: pid,
              email,
              username: user.username || '',
              boundAt: new Date(),
            },
          },
        });
      }
      user = dbUser;
    }

    const token = generateToken(user._id);

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role || 'resident',
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      propertyId: user.propertyId,
      avatar: user.avatar || '',
      oauthProviders: user.oauthProviders,
      token,
    };

    const targetPortal = user.role === 'admin' ? '/admin' : user.role === 'guard' ? '/guard' : user.role === 'technician' ? '/technician' : '/resident';
    const redirectUrl = `${CLIENT_URL}/login?oauth_token=${encodeURIComponent(token)}&oauth_role=${encodeURIComponent(user.role)}&redirect=${encodeURIComponent(targetPortal)}`;

    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dwarkesh Ratna CHS · Authenticated</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0f172a;
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            padding: 36px 32px;
            text-align: center;
            max-width: 440px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          }
          .spinner {
            width: 44px;
            height: 44px;
            border: 3px solid rgba(56, 189, 248, 0.2);
            border-top-color: #38bdf8;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          h2 { font-size: 1.35rem; margin: 0 0 8px; color: #f8fafc; }
          p { font-size: 0.9rem; color: #94a3b8; margin: 0 0 24px; line-height: 1.5; }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #0284c7, #0369a1);
            color: #fff;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.92rem;
            box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
          }
        </style>
        <script>
          const userData = ${JSON.stringify(userData)};
          try {
            localStorage.setItem('user', JSON.stringify(userData));
          } catch (e) {
            console.error('Storage write error:', e);
          }
          setTimeout(() => {
            window.location.href = ${JSON.stringify(redirectUrl)};
          }, 350);
        </script>
      </head>
      <body>
        <div class="card">
          <div class="spinner"></div>
          <h2>Authentication Successful!</h2>
          <p>Logged in as <strong>${user.name}</strong> (${user.role}). Redirecting you to Dwarkesh Ratna CHS...</p>
          <a class="btn" href="${redirectUrl}">Click here if not redirected automatically &rarr;</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('OAuth Callback handling error:', err);
    res.status(500).send(`
      <div style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h1 style="color: #ef4444;">Authentication Error</h1>
        <p>${err.message}</p>
        <a href="http://localhost:5173/login" style="color: #0284c7;">&larr; Return to Sign In</a>
      </div>
    `);
  }
};

// Helper: Check if client ID is a real registered credential
const isConfigured = (key) => key && !key.includes('placeholder') && key !== 'MOCK_ID' && key.trim() !== '';

const renderSandboxChooser = (provider, title, iconSvg) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Choose an account - ${title}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; color: #1e293b; }
      .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; width: 440px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
      .header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
      h1 { font-size: 20px; font-weight: 600; margin: 0; }
      p { font-size: 13px; color: #64748b; margin: 4px 0 18px 0; }
      .alert-banner { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 8px; padding: 12px; font-size: 12px; margin-bottom: 20px; line-height: 1.5; }
      .account-btn { display: flex; align-items: center; gap: 12px; width: 100%; box-sizing: border-box; padding: 12px 14px; margin-bottom: 10px; border: 1px solid #e2e8f0; border-radius: 8px; text-decoration: none; color: #0f172a; background: #ffffff; transition: all 0.15s; }
      .account-btn:hover { background: #f8fafc; border-color: #cbd5e1; transform: translateY(-1px); }
      .avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; font-size: 15px; }
      .info { text-align: left; }
      .name { font-weight: 600; font-size: 14px; }
      .email { font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        ${iconSvg}
        <h1>Choose an Account</h1>
      </div>
      <p>to continue to Dwarkesh Ratna CHS</p>
      <div class="alert-banner">
        ℹ️ <strong>Sandbox Mode:</strong> <code>${provider.toUpperCase()}_CLIENT_ID</code> is not yet configured in <code>server/.env</code>. To prevent Google <strong>Error 401: invalid_client</strong>, choose a simulated test account below:
      </div>
      <a class="account-btn" href="/auth/mock-callback?provider=${provider}&name=Resident+User&email=resident.dwarkesh%40gmail.com&id=${provider}_res_12345">
        <div class="avatar" style="background: #2563eb;">R</div>
        <div class="info">
          <div class="name">Resident User (Society Member)</div>
          <div class="email">resident.dwarkesh@gmail.com</div>
        </div>
      </a>
      <a class="account-btn" href="/auth/mock-callback?provider=${provider}&name=Society+Admin&email=admin.dwarkesh%40society.com&id=${provider}_adm_67890">
        <div class="avatar" style="background: #0d9488;">A</div>
        <div class="info">
          <div class="name">Society Admin</div>
          <div class="email">admin.dwarkesh@society.com</div>
        </div>
      </a>
      <a class="account-btn" href="/auth/mock-callback?provider=${provider}&name=Developer+User&email=dev.test%40gmail.com&id=${provider}_dev_99999">
        <div class="avatar" style="background: #7c3aed;">D</div>
        <div class="info">
          <div class="name">Developer Sandbox User</div>
          <div class="email">dev.test@gmail.com</div>
        </div>
      </a>
    </div>
  </body>
  </html>
`;

// Mock Callback Handler
app.get('/auth/mock-callback', async (req, res) => {
  const { provider, name, email, id } = req.query;
  req.user = {
    id: id || `${provider}_${Date.now()}`,
    displayName: name || 'Test Resident',
    emails: [{ value: email || 'resident@test.com' }],
    provider: provider || 'google',
  };
  req.session.user = req.user;
  await handleCallbackRedirect(req, res);
});

// --- Google Routes (Prompt Box Force Kiya) ---
app.get('/auth/google', (req, res, next) => {
  if (isConfigured(process.env.GOOGLE_CLIENT_ID)) {
    return passport.authenticate('google', { 
      scope: ['profile', 'email'],
      prompt: 'select_account' // 👈 Yeh line Google account chooser popup kholegi
    })(req, res, next);
  }
  const googleSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>';
  res.send(renderSandboxChooser('google', 'Google Accounts', googleSvg));
});
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), handleCallbackRedirect);
app.get('/api/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), handleCallbackRedirect);

// --- GitHub Routes (Aapke Pass Pehle Se Hai) ---
app.get('/auth/github', (req, res, next) => {
  if (isConfigured(process.env.GITHUB_CLIENT_ID)) {
    return passport.authenticate('github', { 
      scope: [ 'user:email' ],
      prompt: 'select_account' // 👈 Yeh line GitHub account chooser popup kholegi
    })(req, res, next);
  }
  const githubSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="#24292f" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>';
  res.send(renderSandboxChooser('github', 'GitHub Accounts', githubSvg));
});
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }), handleCallbackRedirect);
app.get('/api/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }), handleCallbackRedirect);

// --- Microsoft Routes (Prompt Box Force Kiya) ---
app.get('/auth/microsoft', (req, res, next) => {
  if (isConfigured(process.env.MICROSOFT_CLIENT_ID)) {
    return passport.authenticate('microsoft', {
      prompt: 'select_account' // 👈 Yeh line Microsoft account chooser popup kholegi
    })(req, res, next);
  }
  const msSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#00a4ef" d="M1 13h10v10H1z"/><path fill="#7fba00" d="M13 1h10v10H13z"/><path fill="#ffb900" d="M13 13h10v10H13z"/></svg>';
  res.send(renderSandboxChooser('microsoft', 'Microsoft Accounts', msSvg));
});
app.get('/auth/microsoft/callback', passport.authenticate('microsoft', { failureRedirect: '/login' }), handleCallbackRedirect);
app.get('/api/auth/microsoft/callback', passport.authenticate('microsoft', { failureRedirect: '/login' }), handleCallbackRedirect);

// --- Apple Routes ---
app.get('/auth/apple', (req, res, next) => {
  if (isConfigured(process.env.APPLE_CLIENT_ID)) {
    return passport.authenticate('apple')(req, res, next);
  }
  const appleSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="#000000" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-2 0.6-2.65 1.35-.58.66-1.09 1.73-.95 2.76.99.08 2.03-.51 2.67-1.26z"/></svg>';
  res.send(renderSandboxChooser('apple', 'Apple ID Accounts', appleSvg));
});
app.post('/auth/apple/callback', express.urlencoded({ extended: true }), passport.authenticate('apple', { failureRedirect: '/login' }), handleCallbackRedirect);
app.post('/api/auth/apple/callback', express.urlencoded({ extended: true }), passport.authenticate('apple', { failureRedirect: '/login' }), handleCallbackRedirect);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/visitors', require('./routes/visitors'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend client dist if built
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Seeding logic
const seedDefaultData = async () => {
  try {
    const User = require('./models/User');
    const Property = require('./models/Property');
    const { Facility } = require('./models/Booking');
    const Notice = require('./models/Notice');

    let admin = await User.findOne({ email: 'admin@society.com' });
    if (!admin) {
      admin = await User.create({
        name: 'Admin Manager',
        email: 'admin@society.com',
        phone: '9999999999',
        password: 'admin123',
        role: 'admin',
        isVerified: true,
        verificationStatus: 'approved',
      });
      console.log('🌱 Admin user created');
    }

    let guard = await User.findOne({ email: 'guard@society.com' });
    if (!guard) {
      guard = await User.create({
        name: 'Rajesh Kumar',
        email: 'guard@society.com',
        phone: '9888888888',
        password: 'guard123',
        role: 'guard',
        isVerified: true,
        verificationStatus: 'approved',
      });
      console.log('🌱 Guard user created');
    }

    let tech = await User.findOne({ email: 'tech@society.com' });
    if (!tech) {
      tech = await User.create({
        name: 'Suresh Electrician',
        email: 'tech@society.com',
        phone: '9777777777',
        password: 'tech123',
        role: 'technician',
        isVerified: true,
        verificationStatus: 'approved',
      });
      console.log('🌱 Technician user created');
    }

    const blocks = ['A', 'B'];
    for (const block of blocks) {
      for (let floor = 1; floor <= 4; floor++) {
        for (let unit = 1; unit <= 4; unit++) {
          const flatNumber = `${floor}0${unit}`;
          const exists = await Property.findOne({ block, flatNumber });
          if (!exists) {
            await Property.create({
              block,
              flatNumber,
              type: unit <= 2 ? '2BHK' : '3BHK',
              sqFt: unit <= 2 ? 1100 : 1500,
              billingType: 'fixed',
              fixedRate: unit <= 2 ? 3000 : 4500,
            });
          }
        }
      }
    }

    let resident = await User.findOne({ email: 'resident@society.com' });
    if (!resident) {
      const prop = await Property.findOne({ block: 'A', flatNumber: '101' });
      resident = await User.create({
        name: 'Amit Sharma',
        email: 'resident@society.com',
        phone: '9666666666',
        password: 'resident123',
        role: 'resident',
        isVerified: true,
        verificationStatus: 'approved',
        propertyId: prop ? prop._id : null,
        familyMembers: [
          { name: 'Priya Sharma', phone: '9666666667', relation: 'Spouse' },
          { name: 'Rohit Sharma', phone: '9666666668', relation: 'Son' },
        ],
      });
      if (prop) {
        prop.ownerId = resident._id;
        prop.status = 'occupied';
        await prop.save();
      }
      console.log('🌱 Resident user created');
    }

    const facilities = [
      {
        name: 'Clubhouse',
        description: 'Premium clubhouse with lounge area, TV, and party hall',
        isPaid: true,
        pricePerSlot: 1500,
        availableSlots: [
          { start: '09:00', end: '11:00' },
          { start: '11:00', end: '13:00' },
          { start: '14:00', end: '16:00' },
          { start: '16:00', end: '18:00' },
          { start: '18:00', end: '20:00' },
          { start: '20:00', end: '22:00' },
        ],
        icon: 'clubhouse',
      },
      {
        name: 'Tennis Court',
        description: 'Outdoor tennis court with floodlights',
        isPaid: false,
        pricePerSlot: 0,
        availableSlots: [
          { start: '06:00', end: '07:00' },
          { start: '07:00', end: '08:00' },
          { start: '08:00', end: '09:00' },
          { start: '16:00', end: '17:00' },
          { start: '17:00', end: '18:00' },
          { start: '18:00', end: '19:00' },
        ],
        icon: 'tennis',
      },
      {
        name: 'Community Hall',
        description: 'Large community hall for events and gatherings',
        isPaid: true,
        pricePerSlot: 3000,
        availableSlots: [
          { start: '09:00', end: '13:00' },
          { start: '14:00', end: '18:00' },
          { start: '18:00', end: '22:00' },
        ],
        icon: 'hall',
      },
      {
        name: 'Swimming Pool',
        description: 'Temperature-controlled swimming pool with changing rooms',
        isPaid: false,
        pricePerSlot: 0,
        availableSlots: [
          { start: '06:00', end: '08:00' },
          { start: '08:00', end: '10:00' },
          { start: '16:00', end: '18:00' },
          { start: '18:00', end: '20:00' },
        ],
        icon: 'pool',
      },
      {
        name: 'Gym',
        description: 'Fully equipped fitness center',
        isPaid: false,
        pricePerSlot: 0,
        availableSlots: [
          { start: '06:00', end: '08:00' },
          { start: '08:00', end: '10:00' },
          { start: '16:00', end: '18:00' },
          { start: '18:00', end: '20:00' },
          { start: '20:00', end: '22:00' },
        ],
        icon: 'gym',
      },
    ];

    for (const fac of facilities) {
      const exists = await Facility.findOne({ name: fac.name });
      if (!exists) await Facility.create(fac);
    }

    const existingNotice = await Notice.findOne({
      $or: [
        { title: 'Welcome to Dwarkesh Ratna Housing Society' },
        { title: 'Welcome to GateKeeper Society Management' },
      ],
    });
    if (!existingNotice) {
      await Notice.create({
        title: 'Welcome to Dwarkesh Ratna Housing Society',
        content: 'Welcome to the Dwarkesh Ratna Society Management Portal! This platform will help us manage our community better. You can now pay maintenance bills online, book facilities, raise complaints, and manage visitor access - all from your phone!',
        category: 'general',
        isPinned: true,
        authorId: admin._id,
      });
    }

    try {
      await generateMonthlyBills();
      console.log('🌱 Monthly maintenance bills seeded');
    } catch (bErr) {
      console.warn('Bill seed warning:', bErr.message);
    }

    return {
      admin: { email: 'admin@society.com', password: 'admin123' },
      resident: { email: 'resident@society.com', password: 'resident123' },
      guard: { email: 'guard@society.com', password: 'guard123' },
      technician: { email: 'tech@society.com', password: 'tech123' },
    };
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  }
};

// Seed default data endpoint
app.post('/api/seed', async (req, res) => {
  try {
    const credentials = await seedDefaultData();
    res.json({
      message: 'Seed data created successfully',
      credentials,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cron Jobs
cron.schedule('0 0 1 * *', async () => {
  console.log('🕐 Running monthly bill generation...');
  await generateMonthlyBills();
});

cron.schedule('0 9 * * *', async () => {
  console.log('🕐 Checking for overdue bills...');
  await markOverdueBills();
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Start Server asynchronously
const startServer = async () => {
  try {
    await connectDB();
    await seedDefaultData();

    const PORT = process.env.PORT || 5000;

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use by another running process.`);
        console.error(`👉 Close the process using port ${PORT} or change PORT in .env.`);
      } else {
        console.error('❌ Server error:', err.message);
      }
      process.exit(1);
    });

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket ready`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

// Graceful shutdown handlers for nodemon and process termination
const handleGracefulShutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.once('SIGUSR2', () => {
  server.close(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});
process.on('SIGINT', handleGracefulShutdown);
process.on('SIGTERM', handleGracefulShutdown);

startServer();

