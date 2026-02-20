// components/LessonRow.tsx
"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LessonRow({
  href,
  title,
  completed,
  lastPositionSec,
}: {
  href: string;
  title: string;
  completed: boolean;
  lastPositionSec: number;
}) {
  return (
    <Link href={href} className="block">
      <Card className="p-3 flex items-center justify-between hover:shadow-sm transition">
        <div className="min-w-0">
          <div className="font-semibold truncate">{title}</div>
          {!completed && lastPositionSec > 0 ? (
            <div className="text-xs text-muted-foreground mt-1">
              آخر نقطة: {Math.floor(lastPositionSec)} ثانية
            </div>
          ) : null}
        </div>

        <Badge variant={completed ? "secondary" : "default"}>
          {completed ? "مكتمل" : "ابدأ"}
        </Badge>
      </Card>
    </Link>
  );
}
