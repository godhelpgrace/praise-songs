'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Music, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [debugToken, setDebugToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    setDebugToken('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || '请求失败');

      setStatus('success');
      setMessage(data.message);
      if (data.debug_token) {
        setDebugToken(data.debug_token);
      }
    } catch (e: any) {
      setStatus('error');
      setMessage(e.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-400">
            <Music size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">找回密码</h1>
          <p className="text-slate-400 text-sm">请输入您的账号信息以重置密码</p>
        </div>

        {status === 'success' ? (
          <div className="text-center space-y-6">
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-sm">
              {message}
            </div>
            {debugToken && (
               <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 px-4 py-3 rounded-xl text-xs break-all text-left">
                  <p className="font-bold mb-1">调试模式 (模拟邮件链接):</p>
                  <Link href={`/reset-password?token=${debugToken}`} className="underline hover:text-white">
                    点击此处重置密码
                  </Link>
               </div>
            )}
            <Link href="/login" className="inline-block text-indigo-400 hover:text-indigo-300">
              返回登录
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
                账号
              </label>
              <input
                type="text"
                required
                placeholder="用户名 / 手机号 / 邮箱"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? '提交中...' : '发送重置链接'}
            </button>

            <div className="text-center">
              <Link href="/login" className="text-sm text-slate-400 hover:text-white flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> 返回登录
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
