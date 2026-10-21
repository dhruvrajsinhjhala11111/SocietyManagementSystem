require('dotenv').config();
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const path = require('path');

// Import Strategies
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const AppleStrategy = require('passport-apple');

const app = express();
const PORT = process.env.AUTH_PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Session Storage Tracking System
app.use(session({
  secret: process.env.SESSION_SECRET || 'antigravity_platform_secret_key',
  resave: true,
  saveUninitialized: true,
  cookie: { 
    secure: false, // Development mode over http
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Helper: Check if client ID is a real registered credential
const isConfigured = (key) => key && !key.includes('placeholder') && key !== 'MOCK_ID' && key.trim() !== '';

// -------------------------------------------------------------
// 2. SETUP PASSPORT STRATEGIES (Real Credentials)
// -------------------------------------------------------------

const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID || 'placeholder_google_id';
const GOOGLE_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'placeholder_google_secret';
if (isConfigured(GOOGLE_ID)) {
  passport.use(new GoogleStrategy({
      clientID: GOOGLE_ID,
      clientSecret: GOOGLE_SECRET,
      callbackURL: `http://localhost:${PORT}/auth/google/callback`
    }, (accessToken, refreshToken, profile, done) => done(null, profile)
  ));
}

const GITHUB_ID = process.env.GITHUB_CLIENT_ID || 'placeholder_github_id';
const GITHUB_SECRET = process.env.GITHUB_CLIENT_SECRET || 'placeholder_github_secret';
if (isConfigured(GITHUB_ID)) {
  passport.use(new GitHubStrategy({
      clientID: GITHUB_ID,
      clientSecret: GITHUB_SECRET,
      callbackURL: `http://localhost:${PORT}/auth/github/callback`
    }, (accessToken, refreshToken, profile, done) => done(null, profile)
  ));
}

const MICROSOFT_ID = process.env.MICROSOFT_CLIENT_ID || 'placeholder_microsoft_id';
const MICROSOFT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || 'placeholder_microsoft_secret';
if (isConfigured(MICROSOFT_ID)) {
  passport.use(new MicrosoftStrategy({
      clientID: MICROSOFT_ID,
      clientSecret: MICROSOFT_SECRET,
      callbackURL: `http://localhost:${PORT}/auth/microsoft/callback`,
      scope: ['user.read']
    }, (accessToken, refreshToken, profile, done) => done(null, profile)
  ));
}

const appleKey = process.env.APPLE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg\n-----END PRIVATE KEY-----';
if (isConfigured(process.env.APPLE_CLIENT_ID)) {
  passport.use(new AppleStrategy({
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKeyString: appleKey,
      callbackURL: `http://localhost:${PORT}/auth/apple/callback`,
      passReqToCallback: true
    }, (req, accessToken, refreshToken, idToken, profile, done) => done(null, profile || { id: idToken?.sub || `apple_${Date.now()}` })
  ));
}

// -------------------------------------------------------------
// 3. FRONTEND PLATFORM RENDERING INTERFACE
// -------------------------------------------------------------

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Sign in · OAuth Portal</title>
      <style>
        body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif; background-color: #f6f8fa; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .wrapper { width: 340px; background: white; border: 1px solid #d8dee4; padding: 24px; border-radius: 6px; box-shadow: 0 1px 0 rgba(27,31,36,0.04); }
        h1 { font-size: 22px; font-weight: 400; letter-spacing: -0.5px; text-align: center; margin-bottom: 20px; color: #24292f; }
        .oauth-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-sizing: border-box; text-align: center; padding: 10px; font-size: 14px; font-weight: 600; color: #24292f; background-color: #ffffff; border: 1px solid #d8dee4; border-radius: 6px; cursor: pointer; text-decoration: none; margin-bottom: 10px; transition: background 0.15s; }
        .oauth-btn:hover { background-color: #f3f4f6; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <h1>Sign In to Society Portal</h1>
        <a class="oauth-btn" href="/auth/google">🔷 Sign in with Google</a>
        <a class="oauth-btn" href="/auth/github">🐙 Sign in with GitHub</a>
        <a class="oauth-btn" href="/auth/microsoft">❖ Sign in with Microsoft</a>
        <a class="oauth-btn" href="/auth/apple">🍏 Sign in with Apple</a>
      </div>
    </body>
    </html>
  `);
});

app.get('/dashboard', (req, res) => {
  res.send(`
    <h1>The future of building happens together</h1>
    <p>Logged in successfully to the workspace workspace core portal engine.</p>
    <a href="/">Sign Out</a>
  `);
});

app.get('/login', (req, res) => {
  res.send(`
    <div style="font-family: system-ui, sans-serif; text-align: center; padding: 40px;">
      <h1 style="color: #ef4444;">Login Cancelled or Failed</h1>
      <p>Authentication was not completed.</p>
      <a href="/" style="color: #0969da;">&larr; Return to Sign In</a>
    </div>
  `);
});

// -------------------------------------------------------------
// 4. API ENDPOINTS (Triggering Login & Callbacks) - UPDATED ⚡
// -------------------------------------------------------------

const connectDB = require('./config/db');
const User = require('./models/User');
const { generateToken } = require('./middleware/auth');

connectDB().catch((err) => console.warn('OAuth Server DB note:', err.message));

const handleCallbackRedirect = async (req, res) => {
  try {
    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
    let user = req.user;

    if (!user) {
      return res.redirect(`${CLIENT_URL}/login?error=${encodeURIComponent('OAuth authentication failed')}`);
    }

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

// Simulated Account Chooser UI for Sandbox Mode
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

// --- Apple Routes ---
app.get('/auth/apple', (req, res, next) => {
  if (isConfigured(process.env.APPLE_CLIENT_ID)) {
    return passport.authenticate('apple')(req, res, next);
  }
  const appleSvg = '<svg width="24" height="24" viewBox="0 0 24 24"><path fill="#000000" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-2 0.6-2.65 1.35-.58.66-1.09 1.73-.95 2.76.99.08 2.03-.51 2.67-1.26z"/></svg>';
  res.send(renderSandboxChooser('apple', 'Apple ID Accounts', appleSvg));
});
app.post('/auth/apple/callback', express.urlencoded({ extended: true }), passport.authenticate('apple', { failureRedirect: '/login' }), handleCallbackRedirect);

app.listen(PORT, () => console.log(`🚀 GitHub Mock Authentication engine listening on URL: http://localhost:${PORT}`));
