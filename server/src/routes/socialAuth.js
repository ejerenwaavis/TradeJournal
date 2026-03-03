/**
 * Social auth routes — Google OAuth2 and Apple Sign In
 *
 * Google flow:
 *   Client sends the id_token from @react-oauth/google → POST /api/auth/google
 *   Server verifies with Google, finds or creates user, returns JWT
 *
 * Apple flow:
 *   Client sends the identityToken from Apple JS SDK → POST /api/auth/apple
 *   Server verifies with apple-signin-auth, finds or creates user, returns JWT
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const appleSignin = require('apple-signin-auth');
const User = require('../models/User');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/google/token
// Body: { access_token, email, name, sub }
// Used when the client uses the implicit flow (@react-oauth/google useGoogleLogin)
// and fetches userInfo itself then forwards it here for JWT issuance.
router.post('/google/token', async (req, res) => {
  const { access_token, email, name, sub } = req.body;
  if (!access_token || !email || !sub) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google OAuth not configured on server' });
  }

  try {
    // Verify the access_token is issued for this app by calling Google tokeninfo
    const infoRes = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(access_token)}`
    );
    const info = await infoRes.json();

    if (info.error) {
      return res.status(401).json({ error: 'Invalid Google access_token' });
    }
    // Confirm the token's audience (issued_to) matches our client id
    if (info.user_id !== sub) {
      return res.status(401).json({ error: 'Token user mismatch' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        passwordHash: `google_${sub}`,
        displayName: name || '',
      });
    }

    res.json({
      token: signToken(user._id),
      user: { id: user._id, email: user.email, displayName: user.displayName },
    });
  } catch (err) {
    res.status(500).json({ error: `Google sign-in error: ${err.message}` });
  }
});

// POST /api/auth/google
// Body: { credential }  — the id_token from @react-oauth/google
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Missing credential' });
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google OAuth not configured on server' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      // Create with a random unusable password — OAuth users log in via Google only
      user = await User.create({
        email,
        passwordHash: `google_${googleId}`, // not valid bcrypt — intentional
        displayName: name || '',
      });
    }

    res.json({
      token: signToken(user._id),
      user: { id: user._id, email: user.email, displayName: user.displayName },
    });
  } catch (err) {
    res.status(401).json({ error: `Google token invalid: ${err.message}` });
  }
});

// POST /api/auth/apple
// Body: { identityToken, fullName? }
router.post('/apple', async (req, res) => {
  const { identityToken, fullName } = req.body;
  if (!identityToken) return res.status(400).json({ error: 'Missing identityToken' });
  if (!process.env.APPLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Apple Sign In not configured on server' });
  }

  try {
    const applePayload = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });

    const email = applePayload.email;
    const sub = applePayload.sub; // Apple user ID

    if (!email) {
      return res.status(400).json({ error: 'Email not provided by Apple — check your app permissions' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        passwordHash: `apple_${sub}`,
        displayName: fullName ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() : '',
      });
    }

    res.json({
      token: signToken(user._id),
      user: { id: user._id, email: user.email, displayName: user.displayName },
    });
  } catch (err) {
    res.status(401).json({ error: `Apple token invalid: ${err.message}` });
  }
});

module.exports = router;
