import { classifyVintedHtml } from './antibot';

export function parseVintedListings(html: string, classification: { state: string; reason?: string }) {
  if (classification.state !== 'OK') {
    throw new Error('Vinted parser not allowed');
  }

  const listings: any[] = [];
  const blockRegex = /<article[^>]*data-testid=\"listing-card\"([\s\S]*?)<\/article>/gi;
  let m;

  while ((m = blockRegex.exec(html)) !== null) {
    const block = m[1];

    const idMatch = block.match(/data-item-id=\"(\d+)\"/) || block.match(/data-listing-id=\"(\d+)\"/);
    const sourceId = idMatch ? idMatch[1] : undefined;

    const titleMatch = block.match(/data-testid=\"listing-card-title\"[^>]*>([^<]+)</) || block.match(/<a[^>]*>([^<]+)<\/a>/);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const priceMatch = block.match(/USD\s*(\d+)/i);
    const listPrice = priceMatch ? parseInt(priceMatch[1], 10) : 0;

    const imageMatch = block.match(/<img[^>]*src=\"([^\"]+)\"/);
    const image = imageMatch ? imageMatch[1] : undefined;

    if (title && listPrice > 0 && sourceId) {
      listings.push({ sourceId, title, listPrice, image });
    }
  }

  return listings;
}