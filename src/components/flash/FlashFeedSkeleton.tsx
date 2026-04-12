'use client';

export default function FlashFeedSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-0">
          <div className="w-[56px] flex-shrink-0 pr-3 pt-[18px] text-right">
            <div className="h-3 bg-gray-200 dark:bg-[#1C1F2E] rounded w-8 ml-auto" />
          </div>
          <div className="w-6 flex flex-col items-center flex-shrink-0">
            <div className="mt-[20px] w-[10px] h-[10px] bg-gray-200 dark:bg-[#1C1F2E] rounded-full" />
            <div className="w-px flex-1 bg-gray-100 dark:bg-[#1C1F2E]" />
          </div>
          <div className="flex-1 my-1.5 mx-1 p-3.5 rounded-xl border border-gray-100 dark:border-[#1e293b] bg-white dark:bg-[#111827]">
            <div className="flex gap-2 mb-2">
              <div className="h-4 bg-gray-200 dark:bg-[#1C1F2E] rounded w-12" />
              <div className="h-4 bg-gray-200 dark:bg-[#1C1F2E] rounded w-16" />
            </div>
            <div className="h-5 bg-gray-200 dark:bg-[#1C1F2E] rounded w-full mb-1.5" />
            <div className="h-5 bg-gray-200 dark:bg-[#1C1F2E] rounded w-4/5 mb-1.5" />
            <div className="h-3 bg-gray-200 dark:bg-[#1C1F2E] rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
