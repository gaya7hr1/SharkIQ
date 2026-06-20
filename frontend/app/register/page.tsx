"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError, setToken } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/register", { email, password, full_name: fullName });
      const result = await api.post<{ access_token: string }>("/auth/login", { email, password });
      setToken(result.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[80px] -z-10 pointer-events-none" />

      <Card className="w-full max-w-sm bg-card/40 border-border/40 backdrop-blur-md p-6 rounded-2xl shadow-xl animate-in fade-in zoom-in duration-300">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md">
            <UserPlus className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-gradient">Create Account</CardTitle>
          <CardDescription className="text-xs">Gain access to automated deal screening</CardDescription>
        </CardHeader>
        <CardContent className="mt-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName" className="text-xs font-semibold text-muted-foreground">Full Name</Label>
              <Input
                id="fullName"
                required
                placeholder="Gayathri Jayaprakash"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-muted/20 border-border/50 rounded-xl text-sm placeholder:text-muted-foreground/45"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted/20 border-border/50 rounded-xl text-sm placeholder:text-muted-foreground/45"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="Minimum 8 characters"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted/20 border-border/50 rounded-xl text-sm placeholder:text-muted-foreground/45"
              />
            </div>
            {error && <p className="text-xs text-destructive mt-1 font-semibold">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/20 rounded-xl py-6 font-semibold">
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {loading ? "Creating account..." : "Register"}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
