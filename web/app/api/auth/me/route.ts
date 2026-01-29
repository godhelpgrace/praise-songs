import { NextResponse } from 'next/server';
import { findUserById } from '@/lib/db';
import { verifyToken } from '@/lib/auth-utils';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ user: null });
    }

    const user = await findUserById(payload.id);

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ 
        user: { 
            id: user.id, 
            username: user.username, 
            email: user.email, 
            phone: user.phone, 
            role: user.role 
        } 
    });

  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ user: null });
  }
}
