// app/login/page.tsx
"use client";

import { useState } from "react";
import { loginWithGoogle, loginWithEmail, signupWithEmail } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>تسجيل الدخول</CardTitle>
          <CardDescription>
            الدخول مطلوب لعرض المحتوى وحفظ التقدم
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button className="w-full" onClick={loginWithGoogle}>
            دخول عبر Google
          </Button>

          <Separator />

          <div className="space-y-2">
            <Input
              placeholder="البريد"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              placeholder="كلمة المرور"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="grid gap-2">
            <Button onClick={() => loginWithEmail(email, password)}>
              دخول بالبريد
            </Button>
            <Button
              variant="outline"
              onClick={() => signupWithEmail(email, password)}
            >
              إنشاء حساب
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
