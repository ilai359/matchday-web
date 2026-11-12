"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MatchDetailClient from "./[id]/MatchDetailClient";

// A match page as /match?id=123. The iPhone app's built-in screens use this
// form (see src/lib/appLinks.ts); the website itself links to /match/123.
function MatchFromQuery() {
  const id = useSearchParams().get("id") ?? "";
  if (!id) return null;
  return <MatchDetailClient key={id} id={id} />;
}

export default function MatchByQueryPage() {
  return (
    <Suspense fallback={null}>
      <MatchFromQuery />
    </Suspense>
  );
}
