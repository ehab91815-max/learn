"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

export type Crumb = { label: string; href?: string };

export default function BreadcrumbNav({ items }: { items: Crumb[] }) {
  const parentHref = useMemo(() => {
    // الأب = آخر عنصر لديه href قبل الأخير
    for (let i = items.length - 2; i >= 0; i--) {
      if (items[i]?.href) return items[i]!.href!;
    }
    return null;
  }, [items]);

  if (!items?.length) return null;

  return (
    <div className="flex items-center gap-2">
      {parentHref ? (
        <Button asChild variant="outline" size="sm" className="gap-1">
          <Link href={parentHref}>
            <ChevronRight className="h-4 w-4" />
            رجوع
          </Link>
        </Button>
      ) : null}

      <Breadcrumb>
        <BreadcrumbList>
          {items.map((c, i) => {
            const isLast = i === items.length - 1;

            return (
              <span key={`${c.label}-${i}`} className="flex items-center">
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{c.label}</BreadcrumbPage>
                  ) : c.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={c.href}>{c.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{c.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>

                {!isLast ? <BreadcrumbSeparator /> : null}
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
