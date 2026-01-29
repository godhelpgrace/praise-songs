import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth-utils';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const user = token ? verifyToken(token) : null;

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(users);
  } catch (e) {
    console.error('Error fetching users:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const admin = token ? verifyToken(token) : null;

  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { username, password, email, phone, role, permissions } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          email ? { email } : {},
          phone ? { phone } : {}
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: '用户名、邮箱或手机号已被注册' }, { status: 400 });
    }

    const { hashPassword } = await import('@/lib/auth-utils');
    const { v4: uuidv4 } = await import('uuid');

    const hashedPassword = await hashPassword(password);
    
    const newUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        username,
        password: hashedPassword,
        email: email || undefined,
        phone: phone || undefined,
        role: role || 'user',
        permissions: permissions ? JSON.stringify(permissions) : undefined,
        createdAt: new Date()
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        permissions: true,
        createdAt: true
      }
    });

    return NextResponse.json(newUser);

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 });
  }
}
