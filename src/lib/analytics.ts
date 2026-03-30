export function trackEvent(action: string, params?: Record<string, string | number>) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, params);
  }
}

export const analytics = {
  articleView: (id: string, title: string) => trackEvent('article_view', { article_id: id, article_title: title }),
  articleShare: (id: string, platform: string) => trackEvent('article_share', { article_id: id, share_platform: platform }),
  newsletterSubscribe: () => trackEvent('newsletter_subscribe'),
  searchQuery: (query: string) => trackEvent('search', { search_term: query }),
  categoryFilter: (category: string) => trackEvent('category_filter', { category }),
};
