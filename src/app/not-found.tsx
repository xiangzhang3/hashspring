import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white">
          <div className="text-center px-6 max-w-lg">
            <h1 className="text-8xl font-extrabold text-blue-500 mb-4 tracking-tight">404</h1>
            <h2 className="text-2xl font-bold mb-3">Page Not Found / 页面未找到</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-8">
              <Link href="/en/flashnews" className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors no-underline">Flash News</Link>
              <Link href="/zh/flashnews" className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors no-underline">快訊中心</Link>
              <Link href="/fil/flashnews" className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors no-underline">Flash Balita</Link>
              <Link href="/en/market" className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors no-underline">Market Data</Link>
              <Link href="/zh/market" className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors no-underline">即時行情</Link>
              <Link href="/fil/market" className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors no-underline">Merkado</Link>
            </div>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/en" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors no-underline">English Home</Link>
              <Link href="/zh" className="px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors no-underline">中文首页</Link>
              <Link href="/fil" className="px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors no-underline">Filipino Home</Link>
            </div>
            <p className="text-gray-600 text-xs mt-10">HashSpring — Crypto Intelligence Platform</p>
          </div>
        </div>
      </body>
    </html>
  );
}
