"use client";

import { useEffect, useState } from "react";
import { listAuthors, Author } from "@/lib/catalog";
import EntityCard from "@/components/ui/EntityCard";

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);

  useEffect(() => {
    listAuthors().then(setAuthors);
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-4 space-y-3">
      <h1 className="text-2xl font-bold">المؤلفون</h1>

      <div className="grid gap-3">
        {authors.map((a) => (
          <EntityCard key={a.id} href={`/authors/${a.id}`} title={a.name} />
        ))}
      </div>
    </main>
  );
}
