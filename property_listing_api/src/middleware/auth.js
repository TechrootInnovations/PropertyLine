const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('../utils/response');
const { query } = require('../db/pool');

function signToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new AppError('Authentication required', 401);

    const decoded = jwt.verify(token, config.jwt.secret);
    const rows = await query(
      `SELECT id, uuid, name, email, role, is_active
       FROM admin_users WHERE id = :id AND deleted_at IS NULL LIMIT 1`,
      { id: decoded.sub }
    );
    if (!rows.length || !rows[0].is_active) throw new AppError('Invalid session', 401);
    req.admin = rows[0];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token', 401));
    }
    next(err);
  }
}

module.exports = { signToken, requireAuth };
