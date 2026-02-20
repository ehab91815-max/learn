// components/AppShell.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { Menu } from "lucide-react";

import { auth, db } from "@/lib/firebase.client";
import { logout } from "@/lib/auth";

import ThemeToggle from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/button";
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
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

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

  const isAdmin = useMemo(
    () => !!user && adminDocExists,
    [user, adminDocExists],
  );

  const nav = useMemo(
    () => [
      { href: "/authors", label: "المؤلفون" },
      ...(isAdmin ? [{ href: "/admin/setup", label: "لوحة الإدارة" }] : []),
    ],
    [isAdmin],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/authors" className="font-bold">
            منصة د. عصام
          </Link>

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

          <div className="flex items-center gap-2">
            <ThemeToggle />

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
