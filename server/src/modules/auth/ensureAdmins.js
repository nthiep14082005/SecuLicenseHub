const bcrypt = require('bcryptjs');
const { pool, query } = require('../../db/pool');

const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123456';

const DEFAULT_ADMINS = [
  { fullName: 'Nguyễn Admin', email: 'nguyenth14082005@gmail.com' },
  { fullName: 'Đình Lộc Admin', email: 'dinhlocbdh@gmail.com' }
];

let ensurePromise = null;

/**
 * [Thành viên A] Đảm bảo 2 tài khoản Admin mặc định luôn tồn tại trong PostgreSQL (idempotent).
 */
async function ensureDefaultAdmins() {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    const ensured = [];

    for (const admin of DEFAULT_ADMINS) {
      const normalizedEmail = admin.email.trim().toLowerCase();
      const result = await query(
        `INSERT INTO users (full_name, email, password_hash, role)
         VALUES ($1, $2, $3, 'ADMIN')
         ON CONFLICT (email) DO UPDATE
           SET role = 'ADMIN'
         RETURNING user_id, full_name, email, role`,
        [admin.fullName, normalizedEmail, passwordHash]
      );
      ensured.push(result.rows[0]);
    }

    return ensured;
  })();

  try {
    return await ensurePromise;
  } catch (err) {
    ensurePromise = null;
    throw err;
  }
}

if (require.main === module) {
  ensureDefaultAdmins()
    .then((admins) => {
      console.log('[EnsureAdmins] Đã đảm bảo 2 tài khoản ADMIN mặc định:', admins);
      return pool.end();
    })
    .catch(async (err) => {
      console.error('[EnsureAdmins] Lỗi khởi tạo Admin:', err.message);
      await pool.end();
      process.exit(1);
    });
}

module.exports = {
  ensureDefaultAdmins,
  DEFAULT_ADMINS,
  DEFAULT_ADMIN_PASSWORD
};
