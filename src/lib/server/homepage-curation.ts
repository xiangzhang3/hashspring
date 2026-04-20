import type { Locale } from '@/lib/i18n';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export interface HomepageCurationItem {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  cover_image: string;
  category: string;
  author: string;
  tags: string[];
  published_at: string;
  read_time: number;
  views: number;
  title_en?: string;
  title_fil?: string;
  excerpt_en?: string;
  excerpt_fil?: string;
  content_form?: string;
  editorial_note?: string;
}

export interface HomepageCurationPayload {
  items: HomepageCurationItem[];
  editorialMode: 'manual-curation' | 'latest-analysis-fallback';
  slotCount: number;
  endpoint: '/api/homepage-curation';
  note: string;
}

interface HomepageCurationSlotRow {
  locale: string;
  slot_index: number;
  article_slug: string;
  label?: string;
  note?: string;
}

async function fetchArticlesBySlugs(slugs: string[]): Promise<HomepageCurationItem[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY || slugs.length === 0) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/articles`);
  url.searchParams.set(
    'select',
    'id,slug,title,title_en,title_fil,excerpt,excerpt_en,excerpt_fil,cover_image,category,author,tags,published_at,read_time,views',
  );
  url.searchParams.set('slug', `in.(${slugs.map((slug) => `"${slug}"`).join(',')})`);
  url.searchParams.set('category', 'eq.analysis');
  url.searchParams.set('is_published', 'eq.true');

  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    next: { revalidate: 120 },
  });

  if (!res.ok) return [];
  const rows: HomepageCurationItem[] = await res.json();
  const order = new Map(slugs.map((slug, idx) => [slug, idx]));
  rows.sort((a, b) => (order.get(a.slug) ?? 999) - (order.get(b.slug) ?? 999));
  return rows;
}

async function fetchLatestAnalysis(limit = 5): Promise<HomepageCurationItem[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/articles`);
  url.searchParams.set(
    'select',
    'id,slug,title,title_en,title_fil,excerpt,excerpt_en,excerpt_fil,cover_image,category,author,tags,published_at,read_time,views',
  );
  url.searchParams.set('category', 'eq.analysis');
  url.searchParams.set('is_published', 'eq.true');
  url.searchParams.set('order', 'is_featured.desc,published_at.desc');
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    next: { revalidate: 120 },
  });

  if (!res.ok) return [];
  return await res.json();
}

async function fetchHomepageCurationSlots(locale: Locale, slotCount: number): Promise<HomepageCurationSlotRow[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/homepage_curation`);
  url.searchParams.set('select', 'locale,slot_index,article_slug,label,note');
  url.searchParams.set('locale', `eq.${locale}`);
  url.searchParams.set('is_active', 'eq.true');
  url.searchParams.set('order', 'slot_index.asc');
  url.searchParams.set('limit', String(slotCount));

  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    next: { revalidate: 120 },
  });

  if (!res.ok) return [];
  return await res.json();
}

function buildNote(locale: Locale, mode: HomepageCurationPayload['editorialMode']) {
  if (locale === 'zh') {
    return mode === 'manual-curation'
      ? '当前使用编辑确认的 5 篇首页头条轮播内容，可继续通过独立端口调整。'
      : '当前先使用 analysis 最新 5 篇作为 fallback，后续可切换到编辑确认轮播。';
  }

  return mode === 'manual-curation'
    ? 'Using a manually curated five-story homepage rotation.'
    : 'Using the latest five analysis stories as a fallback until manual curation is set.';
}

export async function getHomepageCuration(locale: Locale, slotCount = 5): Promise<HomepageCurationPayload> {
  const slots = await fetchHomepageCurationSlots(locale, slotCount);
  const manualItems = await fetchArticlesBySlugs(slots.map((slot) => slot.article_slug));
  const slotMeta = new Map(slots.map((slot) => [slot.article_slug, slot]));
  const hasManual = manualItems.length > 0;
  const items = hasManual
    ? manualItems.slice(0, slotCount)
    : await fetchLatestAnalysis(slotCount);

  return {
    items: items.map((item, index) => ({
      ...item,
      content_form: index === 0 ? 'lead-story' : 'curated-rotation',
      editorial_note: slotMeta.get(item.slug)?.note || (locale === 'zh'
        ? '该内容位需经编辑确认后再保留在首页轮播。'
        : 'This slot should remain editor-approved before staying in the homepage rotation.'),
    })),
    editorialMode: hasManual ? 'manual-curation' : 'latest-analysis-fallback',
    slotCount,
    endpoint: '/api/homepage-curation',
    note: buildNote(locale, hasManual ? 'manual-curation' : 'latest-analysis-fallback'),
  };
}
