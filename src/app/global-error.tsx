'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0f]">
          <div className="text-center px-6 max-w-lg">
            <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
              Something went wrong
            </h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              className="px-6 py-2.5 rounded-lg bg-[#0066FF] text-white text-sm font-bold hover:bg-[#0055DD] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
