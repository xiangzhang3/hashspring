import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white">
          <div className="text-center px-6">
            <h1 className="text-7xl font-extrabold text-blue-500 mb-4">404</h1>
            <h2 className="text-2xl font-bold mb-3">Page Not Found</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/en"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                English Home
              </Link>
              <Link
                href="/zh"
                className="px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                中文首页
              </Link>
            </div>
            <p className="text-gray-500 text-sm mt-8">
              HashSpring — Crypto Intelligence
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
