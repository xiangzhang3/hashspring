import { NextRequest } from 'next/server';
import { getFlashNewsResponse } from '@/lib/server/flash-news';

export const revalidate = 15;
export async function GET(request: NextRequest) {
  return getFlashNewsResponse(request);
}
