'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-16 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold mb-3">Something went wrong</h2>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        An unexpected error occurred. Please try again or return to the homepage.
      </p>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-lg bg-[#0066FF] text-white text-sm font-bold hover:bg-[#0055DD] transition-colors"
        >
          Try Again
        </button>
        <a
          href="/"
          className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
