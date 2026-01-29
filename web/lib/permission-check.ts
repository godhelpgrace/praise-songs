import { prisma } from '@/lib/db';
import { getUserPermissions, verifyToken } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function checkPermission(
  userId: string, 
  action: 'upload' | 'edit' | 'delete' | 'admin_panel',
  resourceCreatorId?: string | null
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;

  const perms = getUserPermissions(user.role, user.permissions);
  
  const p = perms[action];
  
  if (typeof p === 'boolean') return p;
  
  if (action === 'delete') {
      if (p === 'all') return true;
      if (p === 'none') return false;
      if (p === 'self') {
          return !!resourceCreatorId && resourceCreatorId === userId;
      }
  }
  
  return false;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse(message = 'Permission denied') {
  return NextResponse.json({ error: message }, { status: 403 });
}
