import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-it-in-production';

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Default permissions for new users
export const DEFAULT_PERMISSIONS = {
  upload: true,
  edit: true,
  delete: 'self', // 'all', 'self', 'none'
  download: true,
  view_private: false, // can view private playlists of others? No.
  admin_panel: false
};

// Admin permissions
export const ADMIN_PERMISSIONS = {
  upload: true,
  edit: true,
  delete: 'all',
  download: true,
  view_private: true,
  admin_panel: true
};

export function getUserPermissions(role: string, customPermissions: string | object): any {
  let base = role === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS;
  
  if (!customPermissions || customPermissions === '{}') return base;
  
  try {
    const custom = typeof customPermissions === 'string' ? JSON.parse(customPermissions) : customPermissions;
    return { ...base, ...custom };
  } catch (e) {
    return base;
  }
}
