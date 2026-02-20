"use client";

import React, { useEffect, useMemo, useState } from "react";
import EntityCard from "@/components/ui/EntityCard";
import BreadcrumbNav from "@/components/ui/BreadcrumbNav";
import {
  getAuthor,
  getBranch,
  listBooks,
  Author,
  Branch,
  Book,
} from "@/lib/catalog";

export default function BranchBooksPage({
  params,
}: {
  params: Promise<{ authorId: string; branchId: string }>;
}) {
  const { authorId, branchId } = React.use(params);

  const [author, setAuthor] = useState<Author | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    getAuthor(authorId).then(setAuthor);
    getBranch(authorId, branchId).then(setBranch);
    listBooks(authorId, branchId).then(setBooks);
  }, [authorId, branchId]);

  const crumbs = useMemo(
    () => [
      { label: "المؤلفون", href: "/authors" },
      { label: author?.name ?? "...", href: `/authors/${authorId}` },
      { label: branch?.title ?? "..." },
    ],
    [author?.name, branch?.title, authorId],
  );

  return (
    <main className="space-y-4">
      <BreadcrumbNav items={crumbs} />
      <h1 className="text-2xl font-bold">{branch?.title ?? "..."}</h1>

      <div className="grid gap-3">
        {books.map((b) => (
          <EntityCard
            key={b.id}
            href={`/authors/${authorId}/branches/${branchId}/books/${b.id}`}
            title={b.title}
          />
        ))}
      </div>
    </main>
  );
}
