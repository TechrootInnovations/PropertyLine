const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const { signToken } = require('../middleware/auth');
const { AppError } = require('../utils/response');

async function login(email, password) {
  const rows = await query(
    `SELECT id, uuid, name, email, phone, role, password_hash, is_active
     FROM admin_users WHERE email = :email AND deleted_at IS NULL LIMIT 1`,
    { email }
  );
  if (!rows.length) throw new AppError('Invalid email or password', 401);
  const user = rows[0];
  if (!user.is_active) throw new AppError('Account is disabled', 403);

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new AppError('Invalid email or password', 401);

  await query('UPDATE admin_users SET last_login_at = NOW() WHERE id = :id', { id: user.id });

  const token = signToken({ sub: user.id, role: user.role });
  delete user.password_hash;
  return { token, user };
}

async function changePassword(adminId, currentPassword, newPassword) {
  const rows = await query(
    'SELECT password_hash FROM admin_users WHERE id = :id AND deleted_at IS NULL',
    { id: adminId }
  );
  if (!rows.length) throw new AppError('User not found', 404);
  const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!ok) throw new AppError('Current password is incorrect', 400);
  const hash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE admin_users SET password_hash = :hash WHERE id = :id', {
    hash,
    id: adminId,
  });
  return true;
}

async function getProfile(adminId) {
  const rows = await query(
    `SELECT id, uuid, name, email, phone, role, avatar_url, last_login_at, created_at
     FROM admin_users WHERE id = :id AND deleted_at IS NULL`,
    { id: adminId }
  );
  if (!rows.length) throw new AppError('User not found', 404);
  return rows[0];
}

module.exports = { login, changePassword, getProfile };
