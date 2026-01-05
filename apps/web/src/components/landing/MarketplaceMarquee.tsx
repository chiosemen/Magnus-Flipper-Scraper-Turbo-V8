import { Section } from './Section';

const MARKETPLACES = [
  'Facebook Marketplace',
  'eBay',
  'OfferUp',
  'Vinted',
  'Depop',
  'Poshmark',
  'Mercari',
  'Craigslist',
];

export function MarketplaceMarquee() {
  return (
    <Section className="py-12 border-y border-carbon-800 overflow-hidden bg-carbon-900/30">
      <div className="flex items-center">
        {/* Duplicate for seamless loop */}
        <div className="flex animate-marquee">
          {[...MARKETPLACES, ...MARKETPLACES].map((marketplace, idx) => (
            <div
              key={idx}
              className="px-8 py-3 mx-3 rounded-full bg-carbon-800 border border-carbon-700 text-carbon-100 whitespace-nowrap text-sm font-medium"
            >
              {marketplace}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
