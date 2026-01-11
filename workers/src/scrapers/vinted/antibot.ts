export function classifyVintedHtml(html: string) {
  const s = (html || '').toLowerCase();

  if (!s || s.trim().length === 0) {
    return { state: 'BLOCKED' as const, reason: 'no_results' };
  }

  if (s.includes('no listings match') || s.includes('no results found')) {
    return { state: 'BLOCKED' as const, reason: 'no_results' };
  }

  if (s.includes('access denied') || s.includes('blocked') || s.includes('anti-bot') || s.includes('access denied: blocked')) {
    return { state: 'BLOCKED' as const, reason: 'blocked_html' };
  }

  if (s.includes('please login') || s.includes('please log in') || s.includes('login')) {
    return { state: 'LOGIN' as const };
  }

  if (s.includes('confirm you are human') || s.includes('verify you are human') || s.includes('captcha')) {
    return { state: 'CONSENT' as const };
  }

  if (s.includes('too many requests') || s.includes('rate limit') || s.includes('rate-limited')) {
    return { state: 'RATE_LIMIT' as const };
  }

  // If we see listing markers (data-testid listing-card) treat as OK
  if (s.includes('data-testid="listing-card"') || s.includes('data-item-id="') || s.includes('data-listing-id="')) {
    return { state: 'OK' as const };
  }

  // Ambiguous fallback
  return { state: 'BLOCKED' as const, reason: 'ambiguous_state' };
}