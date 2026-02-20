// components/AuthGate.tsx
"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase.client";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
      if (!u && pathname !== "/login") router.replace("/login");
      if (u && pathname === "/login") router.replace("/authors");
    });
    return () => unsub();
  }, [router, pathname]);

  if (!ready) return null;
  if (!user && pathname !== "/login") return null;

  return <>{children}</>;
}
