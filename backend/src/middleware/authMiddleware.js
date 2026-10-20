import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

/**
 * Generates a signed JWT token for a user
 * @param {string} userId - User's MongoDB ObjectId string
 * @returns {string} Signed JWT token
 */
export function generateToken(userId) {
  const secret = process.env.JWT_SECRET || 'plantsight_jwt_fallback_secret_key_32chars';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: userId }, secret, { expiresIn });
}

/**
 * Protect middleware: requires valid Bearer JWT token in Authorization header
 */
export async function protect(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Access denied. Please log in to continue.',
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'plantsight_jwt_fallback_secret_key_32chars';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        code: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      status: 'error',
      message: 'Invalid authorization token. Please log in again.',
    });
  }
}

/**
 * Optional auth middleware: extracts user if token present, but does not block if absent
 */
export async function optionalAuth(req, _res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET || 'plantsight_jwt_fallback_secret_key_32chars';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id);
    req.user = user || null;
  } catch {
    req.user = null;
  }
  next();
}
