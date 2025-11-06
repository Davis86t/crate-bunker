// app/error.tsx
// Purpose: Client error boundary for App Router.
// Notes: Runs on the client; reset() allows retry.

"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Optional: log client error once for diagnostics (kept as-is)
  useEffect(() => {
    // console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl p-6">
      <h2 className="text-xl font-semibold">Something went wrong.</h2>
      <button
        className="mt-4 rounded-full bg-[#E57C23] px-4 py-2 font-semibold text-black"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
