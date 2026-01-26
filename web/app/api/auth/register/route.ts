import { NextResponse } from 'next/server';
import { checkUserConflict, createUser } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth-utils';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const { username, password, email, phone } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }

    if (!email && !phone) {
        return NextResponse.json({ error: '必须提供邮箱或手机号' }, { status: 400 });
    }

    // Check if user exists
    if (checkUserConflict(username, email, phone)) {
      return NextResponse.json({ error: '用户名、邮箱或手机号已被注册' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = {
      id: uuidv4(),
      username,
      password: hashedPassword,
      email: email || '',
      phone: phone || '',
      role: 'user' as const, // Default role
      created_at: new Date().toISOString()
    };

    createUser(newUser);

    // No auto login, require manual login
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: '注册失败' }, { status: 500 });
  }
}
