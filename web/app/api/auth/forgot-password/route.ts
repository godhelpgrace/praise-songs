import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const { identifier } = await request.json();

    if (!identifier) {
      return NextResponse.json({ error: '请输入用户名、邮箱或手机号' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
          { phone: identifier }
        ]
      }
    });

    if (!user) {
      // For security, do not reveal if user exists
      return NextResponse.json({ success: true, message: '如果账号存在，重置链接将发送到您的邮箱/手机' });
    }

    // Generate reset token
    const token = uuidv4();
    const expiry = new Date(Date.now() + 3600 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry
      }
    });

    // In a real application, send email here.
    // For this environment, we return the token to simulate the "link"
    console.log(`Reset Token for ${user.username}: ${token}`);

    return NextResponse.json({ 
        success: true, 
        message: '重置链接已生成',
        debug_token: token // Only for dev/testing
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: '请求失败' }, { status: 500 });
  }
}
