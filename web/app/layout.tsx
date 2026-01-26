import type { Metadata } from "next";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import { PresentationProvider } from "@/context/PresentationContext";
import { AuthProvider } from "@/context/AuthContext";
import PresentationPanel from "@/components/PresentationPanel";

export const metadata: Metadata = {
  title: "赞美吧 - 分享好听的基督教赞美诗歌",
  description: "赞美吧是一个提供在线听歌的非盈利性音乐平台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-[#020617] text-slate-100 selection:bg-indigo-500/30" suppressHydrationWarning>
        {/* Rich Gradient Background */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#1e1b4b] via-[#020617] to-[#020617] opacity-80 pointer-events-none z-[-1]" />
        
        <AuthProvider>
          <PlayerProvider>
            <PresentationProvider>
              {children}
              <PresentationPanel />
            </PresentationProvider>
          </PlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
