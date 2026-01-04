import type { VintedClassification } from './types';

const matchAny = (content: string, patterns: string[]) => patterns.some((pattern) => content.includes(pattern));
const hasListingMarkers = (content: string) =>
  content.includes('data-testid="listing-card"') ||
  content.includes('vintage-listing-card') ||
  content.includes('listing-card-title');

export const classifyVintedHtml = (html: string): VintedClassification => {
  const content = (html || '').toLowerCase();

  if (matchAny(content, ['please login', 'sign-in', 'log in to continue'])) {
    return { state: 'LOGIN', reason: 'login_required' };
  }

  if (matchAny(content, ['blocked', 'forbidden', 'access denied', 'unable to access'])) {
    return { state: 'BLOCKED', reason: 'bot_block' };
  }

  if (matchAny(content, ['confirm you are human', 'prove you are not a robot', 'accept cookies', 'cookie preferences'])) {
    return { state: 'CONSENT', reason: 'consent_overlay' };
  }

  if (matchAny(content, ['too many requests', 'rate limit exceeded', 'slow down', 'try again later'])) {
    return { state: 'RATE_LIMIT', reason: 'rate_limit' };
  }

  if (matchAny(content, ['we found nothing', 'no listings match', 'nothing found for your search'])) {
    return { state: 'BLOCKED', reason: 'no_results' };
  }

  if (hasListingMarkers(content)) {
    return { state: 'OK' };
  }

  return { state: 'BLOCKED', reason: 'ambiguous_state' };
};
