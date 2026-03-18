/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { Menu } from "lucide-react";

import { auth, db } from "@/lib/firebase.client";
import { logout } from "@/lib/auth";

import ThemeToggle from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminDocExists, setAdminDocExists] = useState(false);
  const [xpTotal, setXpTotal] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // التحقق من الأدمن
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      const ref = doc(db, "admins", user.uid);
      const snap = await getDoc(ref);
      if (!cancelled) setAdminDocExists(snap.exists());
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // ✅ تحميل XP مباشر من users/{uid}
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      const data = snap.exists() ? (snap.data() as any) : {};
      setXpTotal(Number(data?.xpTotal ?? 0));
    });

    return () => unsub();
  }, [user]);

  const isAdmin = !!user && adminDocExists;

  const nav = useMemo(
    () => [
      { href: "/authors", label: "المشايخ" },
      ...(isAdmin ? [{ href: "/admin/setup", label: "لوحة الإدارة" }] : []),
    ],
    [isAdmin],
  );

  const userDisplayName = useMemo(() => {
    if (!user) return "";
    if (user.displayName?.trim()) return user.displayName.trim();
    if (user.email) return user.email.split("@")[0];
    return "مستخدم";
  }, [user]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
          {/* Brand */}
          <Link href="/authors" className="font-bold shrink-0">
            روض الهدى
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            {nav.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Button
                  key={item.href}
                  asChild
                  variant={active ? "default" : "ghost"}
                  size="sm"
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 min-w-0">
            {/* ✅ ترحيب + XP (Desktop) */}
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-muted-foreground truncate max-w-45">
                  مرحبًا، {userDisplayName}
                </span>
                <Badge variant="secondary">XP: {xpTotal}</Badge>
              </div>
            ) : null}

            <ThemeToggle />

            {/* Mobile drawer */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Open menu">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>

                <SheetContent side="right" className="w-[320px]">
                  <SheetHeader>
                    <SheetTitle>القائمة</SheetTitle>
                  </SheetHeader>

                  {/* ✅ ترحيب + XP (Mobile) */}
                  {user ? (
                    <div className="mt-4 rounded-lg border p-3 space-y-2">
                      <div className="text-sm font-medium truncate">
                        مرحبًا، {userDisplayName}
                      </div>
                      <Badge variant="secondary">XP: {xpTotal}</Badge>
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-2">
                    {nav.map((item) => {
                      const active = pathname?.startsWith(item.href);
                      return (
                        <Button
                          key={item.href}
                          asChild
                          variant={active ? "default" : "outline"}
                          className="justify-start"
                        >
                          <Link href={item.href}>{item.label}</Link>
                        </Button>
                      );
                    })}

                    {user ? (
                      <Button
                        variant="destructive"
                        onClick={logout}
                        className="justify-start"
                      >
                        خروج
                      </Button>
                    ) : null}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop logout */}
            {user ? (
              <Button
                className="hidden md:inline-flex"
                variant="outline"
                onClick={logout}
              >
                خروج
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
