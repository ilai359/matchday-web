"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ClubDetailClient from "../clubs/[id]/ClubDetailClient";

// A club page as /club?id=ajax. The iPhone app's built-in screens use this
// form (see src/lib/appLinks.ts); the website itself links to /clubs/ajax.
function ClubFromQuery() {
  const id = useSearchParams().get("id") ?? "";
  if (!id) return null;
  return <ClubDetailClient key={id} id={id} />;
}

export default function ClubByQueryPage() {
  return (
    <Suspense fallback={null}>
      <ClubFromQuery />
    </Suspense>
  );
}
