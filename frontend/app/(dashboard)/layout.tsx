"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Upload, BarChart3, Settings, Compass, BookOpen } from "lucide-react";

import { clearToken, getToken } from "@/lib/api-client";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

  if (!ready) return null;

  const isLinkActive = (href: string) => pathname === href;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar Navigation */}
      <aside className="flex w-64 flex-col border-r border-border/40 bg-card/60 backdrop-blur-md px-5 py-8 transition-all duration-300">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 px-3 py-2 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
            <span className="text-lg font-black text-white">S</span>
          </div>
          <span className="text-2xl font-black tracking-wider text-gradient">SharkIQ</span>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
              isLinkActive("/dashboard")
                ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-inner"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <LayoutDashboard className={`h-5 w-5 ${isLinkActive("/dashboard") ? "text-indigo-400" : ""}`} />
            Dashboard
          </Link>
          <Link
            href="/upload"
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
              isLinkActive("/upload")
                ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-inner"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Upload className={`h-5 w-5 ${isLinkActive("/upload") ? "text-indigo-400" : ""}`} />
            New Analysis
          </Link>
          <Link
            href="/funding"
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
              isLinkActive("/funding")
                ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-inner"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Compass className={`h-5 w-5 ${isLinkActive("/funding") ? "text-indigo-400" : ""}`} />
            Funding Explorer
          </Link>
          <Link
            href="/vocab"
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
              isLinkActive("/vocab")
                ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 shadow-inner"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <BookOpen className={`h-5 w-5 ${isLinkActive("/vocab") ? "text-indigo-400" : ""}`} />
            Startup Glossary
          </Link>
        </nav>

        {/* User Block & Sign Out */}
        <div className="mt-auto pt-6 border-t border-border/40">
          <div className="flex items-center gap-3 px-3 py-2 mb-4">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-bold text-white shadow-md">
              VC
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate">Associate Partner</span>
              <span className="text-xs text-muted-foreground truncate">Analyst Account</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 border border-transparent hover:border-red-500/20"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Page Area */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
