import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth-utils';
import { cookies } from 'next/headers';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const currentUser = token ? verifyToken(token) : null;

  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { role, permissions } = body;

    const updateData: any = {};
    if (role) updateData.role = role;
    if (permissions) {
        // Ensure permissions is valid JSON string or object
        updateData.permissions = typeof permissions === 'string' 
            ? permissions 
            : JSON.stringify(permissions);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        permissions: true
      }
    });
    return NextResponse.json(updatedUser);
  } catch (e: any) {
    console.error('Error updating user:', e);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
