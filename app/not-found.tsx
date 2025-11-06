import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0E0E0E] text-[#F3F3F3] text-center">
      <h1 className="text-4xl font-bold tracking-tight text-[#E57C23]">
        404 — Crate Not Found
      </h1>
      <p className="mt-2 text-sm text-gray-400 max-w-md">
        The digital crate you’re searching for doesn’t exist or has been
        secured in the bunker.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-[#E57C23] px-5 py-2 font-semibold text-black hover:bg-[#ff923c] transition"
      >
        Return Home
      </Link>
    </main>
  );
}
