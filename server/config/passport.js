const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const AppleStrategy = require('passport-apple');
const User = require('../models/User');

const configurePassport = () => {
  passport.serializeUser((user, done) => {
    done(null, user.id || user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Helper to find or create user upon successful OAuth callback
  const handleOAuthProfile = async (provider, profile, done) => {
    try {
      const email = (
        profile.emails && profile.emails[0]?.value ? profile.emails[0].value :
        profile.email ? profile.email :
        `${profile.username || profile.id}@${provider}.social`
      ).toLowerCase().trim();

      const name = profile.displayName || profile.name || profile.username || email.split('@')[0];
      const avatar = profile.photos && profile.photos[0]?.value ? profile.photos[0].value : '';

      // Find existing user by provider id or email
      let user = await User.findOne({
        $or: [
          { [`oauthProviders.${provider}.id`]: profile.id },
          { email },
        ],
      });

      if (user) {
        if (!user.oauthProviders) user.oauthProviders = {};
        user.oauthProviders[provider] = {
          id: profile.id,
          email,
          username: profile.username || '',
          boundAt: new Date(),
        };
        if (!user.avatar && avatar) user.avatar = avatar;
        await user.save();
        return done(null, user);
      }

      // Create new resident user
      user = await User.create({
        name,
        email,
        phone: 'Not provided',
        password: `OAuth_${provider}_${Date.now()}`,
        role: 'resident',
        isVerified: true,
        verificationStatus: 'approved',
        avatar,
        oauthProviders: {
          [provider]: {
            id: profile.id,
            email,
            username: profile.username || '',
            boundAt: new Date(),
          },
        },
      });

      return done(null, user);
    } catch (err) {
      console.error(`OAuth ${provider} error:`, err);
      return done(err, null);
    }
  };

  // Google
  try {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID || 'placeholder_google_id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder_google_secret',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    }, async (accessToken, refreshToken, profile, done) => {
      await handleOAuthProfile('google', profile, done);
    }));
  } catch (err) {
    console.warn('Google OAuth setup warning:', err.message);
  }

  // GitHub
  try {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID || 'placeholder_github_id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'placeholder_github_secret',
      callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback',
    }, async (accessToken, refreshToken, profile, done) => {
      await handleOAuthProfile('github', profile, done);
    }));
  } catch (err) {
    console.warn('GitHub OAuth setup warning:', err.message);
  }

  // Microsoft
  try {
    passport.use(new MicrosoftStrategy({
      clientID: process.env.MICROSOFT_CLIENT_ID || 'placeholder_microsoft_id',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'placeholder_microsoft_secret',
      callbackURL: process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:5000/api/auth/microsoft/callback',
      scope: ['user.read'],
    }, async (accessToken, refreshToken, profile, done) => {
      await handleOAuthProfile('microsoft', profile, done);
    }));
  } catch (err) {
    console.warn('Microsoft OAuth setup warning:', err.message);
  }

  // Apple
  const appleKey = process.env.APPLE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg\n-----END PRIVATE KEY-----';
  try {
    passport.use(new AppleStrategy({
      clientID: process.env.APPLE_CLIENT_ID || 'placeholder_apple_id',
      teamID: process.env.APPLE_TEAM_ID || 'placeholder_team_id',
      keyID: process.env.APPLE_KEY_ID || 'placeholder_key_id',
      privateKeyString: appleKey,
      callbackURL: process.env.APPLE_CALLBACK_URL || 'http://localhost:5000/api/auth/apple/callback',
      passReqToCallback: true,
    }, async (req, accessToken, refreshToken, idToken, profile, done) => {
      await handleOAuthProfile('apple', profile || { id: idToken?.sub || `apple_${Date.now()}` }, done);
    }));
  } catch (err) {
    console.warn('Apple OAuth setup warning:', err.message);
  }
};

module.exports = configurePassport;
