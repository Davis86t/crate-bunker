// app/not-found.tsx
// Purpose: 404 boundary for unknown routes.

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl p-6">
      <h2 className="text-xl font-semibold">Page not found</h2>
      <p className="mt-2 text-sm text-white/70">
        Check the URL or return to the homepage.
      </p>
      <a
        className="mt-4 inline-block rounded-full bg-[#E57C23] px-4 py-2 font-semibold text-black"
        href="/"
      >
        Go home
      </a>
    </div>
  );
}
