'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0E0E0E] text-[#F3F3F3] text-center">
      <h1 className="text-4xl font-bold tracking-tight text-[#E57C23]">
        System Failure
      </h1>
      <p className="mt-2 text-sm text-gray-400 max-w-md">
        {error?.message || 'Something went wrong while processing your request.'}
      </p>
      <button
        onClick={() => reset()}
        className="mt-6 rounded-full bg-[#E57C23] px-5 py-2 font-semibold text-black hover:bg-[#ff923c] transition"
      >
        Reboot
      </button>
    </main>
  );
}
