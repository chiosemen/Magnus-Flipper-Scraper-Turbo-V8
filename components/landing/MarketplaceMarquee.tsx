import React from 'react';

const marketplaces = [
  // PRIMARY - Actively wired
  { 
    name: 'Facebook Marketplace', 
    logo: 'https://raw.githubusercontent.com/magnusflipper/logos/main/facebook-marketplace.svg', // Placeholder until local assets work
    url: 'https://www.facebook.com/marketplace',
    tier: 'primary',
    fallbackIcon: "FB"
  },
  { 
    name: 'eBay', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg',
    url: 'https://www.ebay.com',
    tier: 'primary',
    fallbackIcon: "eBay"
  },
  { 
    name: 'Vinted', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Vinted_logo.png',
    url: 'https://www.vinted.com',
    tier: 'primary',
    fallbackIcon: "Vint"
  },
  { 
    name: 'Gumtree', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Gumtree_logo.svg',
    url: 'https://www.gumtree.com',
    tier: 'primary',
    fallbackIcon: "Gum"
  },
  // SECONDARY - Supporting/Reference
  { 
    name: 'Craigslist', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Craigslist_Logo.png',
    url: 'https://www.craigslist.org',
    tier: 'secondary',
    fallbackIcon: "CL"
  },
  { 
    name: 'Amazon', 
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
    url: 'https://www.amazon.com',
    tier: 'secondary',
    label: 'Pricing',
    fallbackIcon: "Amz"
  },
  { 
    name: 'CEX', 
    logo: 'https://uk.webuy.com/assets/images/cex-logo.png',
    url: 'https://uk.webuy.com',
    tier: 'secondary',
    label: 'Trade-in',
    fallbackIcon: "CEX"
  },
];

const duplicatedMarketplaces = [...marketplaces, ...marketplaces];

export const MarketplaceMarquee = () => {
  return (
    <section className="relative py-10 bg-gradient-to-b from-slate-900/50 to-transparent border-y border-slate-800/50 overflow-hidden">
      <p className="text-center text-slate-500 text-xs font-semibold tracking-[0.2em] uppercase mb-8">
        Real-Time Monitoring Across 7+ Marketplaces
      </p>
      
      <div className="marquee-container">
        <div className="marquee-track">
          {duplicatedMarketplaces.map((mp, index) => (
            <a
              key={`${mp.name}-${index}`}
              href={mp.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`marquee-item group relative ${
                mp.tier === 'primary' ? 'marquee-item-primary' : 'marquee-item-secondary'
              }`}
            >
              {/* Live pulse indicator for primary */}
              {mp.tier === 'primary' && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
              )}
              
              {/* Logo - grayscale by default, color on hover */}
              <div className={`relative w-8 h-8 flex items-center justify-center transition-all duration-300 ${
                mp.tier === 'primary' 
                  ? 'grayscale-0 group-hover:scale-110' 
                  : 'grayscale group-hover:grayscale-0'
              }`}>
                {/* Fallback text since local SVG files might not be served correctly in all envs without setup */}
                <span className="text-xs font-bold text-slate-400 group-hover:text-white">{mp.fallbackIcon}</span>
              </div>
              
              {/* Name */}
              <span className={`font-medium whitespace-nowrap transition-colors ${
                mp.tier === 'primary'
                  ? 'text-slate-200 group-hover:text-white'
                  : 'text-slate-500 group-hover:text-slate-300'
              }`}>
                {mp.name}
              </span>
              
              {/* Reference label */}
              {mp.label && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 uppercase tracking-wider ml-1">
                  {mp.label}
                </span>
              )}
            </a>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex justify-center items-center gap-8 mt-8">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs text-slate-400">Live Scanning</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-600" />
          <span className="text-xs text-slate-500">Reference Data</span>
        </div>
      </div>
    </section>
  );
};