export class PriceParser {
  static parse(text: string): { value: number | null; currency: string } {
    if (!text) return { value: null, currency: 'USD' };

    const cleanText = text.trim();
    let currency = 'USD';

    if (cleanText.includes('£')) currency = 'GBP';
    else if (cleanText.includes('€')) currency = 'EUR';
    else if (cleanText.includes('¥')) currency = 'JPY';
    else if (cleanText.includes('C$')) currency = 'CAD';
    else if (cleanText.includes('A$')) currency = 'AUD';

    // Remove non-numeric characters except dots and commas
    const numericStr = cleanText.replace(/[^0-9.,]/g, '');
    
    // Handle different decimal formats (US vs EU)
    // Simple heuristic: if comma appears after dot, or comma is near end, it might be decimal
    let value: number;
    
    if (numericStr.includes(',') && !numericStr.includes('.')) {
      // 100,00 -> 100.00
      value = parseFloat(numericStr.replace(',', '.'));
    } else if (numericStr.includes('.') && numericStr.includes(',')) {
      if (numericStr.indexOf('.') < numericStr.indexOf(',')) {
        // 1.000,00 (EU)
        value = parseFloat(numericStr.replace(/\./g, '').replace(',', '.'));
      } else {
        // 1,000.00 (US)
        value = parseFloat(numericStr.replace(/,/g, ''));
      }
    } else {
       // 100.00 or 1000
       value = parseFloat(numericStr);
    }

    if (isNaN(value)) return { value: null, currency };

    return { value, currency };
  }
}
