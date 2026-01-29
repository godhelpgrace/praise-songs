'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Music, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
        setStatus('error');
        setMessage('两次输入的密码不一致');
        return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || '重置失败');

      setStatus('success');
      setMessage(data.message);
      
      // Auto redirect after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (e: any) {
      setStatus('error');
      setMessage(e.message);
    }
  };

  if (!token) {
      return (
        <div className="text-center text-red-400">
            无效的重置链接
            <div className="mt-4">
                <Link href="/login" className="text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1">
                    <ArrowLeft size={14} /> 返回登录
                </Link>
            </div>
        </div>
      );
  }

  return (
    <>
        {status === 'success' ? (
          <div className="text-center space-y-6">
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-sm">
              {message}
            </div>
            <p className="text-slate-400 text-sm">3秒后自动跳转至登录页...</p>
            <Link href="/login" className="inline-block text-indigo-400 hover:text-indigo-300">
              立即登录
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {status === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
                {message}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                新密码
              </label>
              <input
                type="password"
                required
                placeholder="设置新密码"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                确认密码
              </label>
              <input
                type="password"
                required
                placeholder="再次输入新密码"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? '提交中...' : '重置密码'}
            </button>
          </form>
        )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-400">
            <Music size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">重置密码</h1>
        </div>
        <Suspense fallback={<div className="text-center text-slate-400">加载中...</div>}>
            <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
