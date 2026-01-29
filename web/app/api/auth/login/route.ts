import { NextResponse } from 'next/server';
import { findUserByIdentifier } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth-utils';

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json(); // identifier can be username, email, or phone

    if (!identifier || !password) {
      return NextResponse.json({ error: '账号和密码不能为空' }, { status: 400 });
    }

    const user = await findUserByIdentifier(identifier);

    if (!user || !user.password) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    const token = generateToken({ id: user.id, username: user.username, role: user.role });

    const response = NextResponse.json({ 
        user: { 
            id: user.id, 
            username: user.username, 
            email: user.email, 
            phone: user.phone, 
            role: user.role 
        } 
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
