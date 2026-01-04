import { DealCondition } from '@repo/types';

export class TitleParser {
  static clean(title: string): string {
    if (!title) return '';
    return title
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'");
  }

  static extractCondition(title: string, description: string = ''): DealCondition {
    const text = (title + ' ' + description).toLowerCase();
    
    if (text.includes('parts only') || text.includes('for parts') || text.includes('broken') || text.includes('not working')) {
      return 'for_parts';
    }
    if (text.includes('new in box') || text.includes('brand new') || text.includes('sealed') || text.includes('never used')) {
      return 'new';
    }
    if (text.includes('like new') || text.includes('open box') || text.includes('mint')) {
      return 'like_new';
    }
    if (text.includes('very good') || text.includes('excellent')) {
      return 'good';
    }
    if (text.includes('fair') || text.includes('scratches') || text.includes('wear')) {
      return 'fair';
    }
    if (text.includes('poor') || text.includes('damage')) {
      return 'poor';
    }

    return 'good'; // Default
  }
}
