import { Section } from './Section';
import { Zap, TrendingUp, Globe, SlidersHorizontal, Bell, FileText } from 'lucide-react';

const FEATURES = [
  {
    icon: Zap,
    title: 'Real-Time Signal Alerts',
    desc: 'Listings surface as soon as meaningful signals appear.',
  },
  {
    icon: TrendingUp,
    title: 'Normalized Price Context',
    desc: 'See comparable value without manual calculations.',
  },
  {
    icon: Globe,
    title: 'Unified Marketplace View',
    desc: 'Facebook, Vinted, and more — one interface.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Client-Side Signal Sorting',
    desc: 'Sort by score, price, or freshness instantly in your browser.',
  },
  {
    icon: Bell,
    title: 'Continuous Keyword Monitoring',
    desc: 'Never miss a listing that matches your edge.',
  },
  {
    icon: FileText,
    title: 'Explainable Scoring',
    desc: 'Understand why a listing ranks highly. (Coming next)',
  },
];

export function FeatureGrid() {
  return (
    <Section id="features" className="px-6 py-24 bg-gradient-to-b from-carbon-950 to-carbon-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-carbon-100 mb-4">
            Built for Speed & Signal
          </h2>
          <p className="text-xl text-carbon-100/60 max-w-2xl mx-auto">
            Every feature designed to give you the edge in marketplace arbitrage
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`glass-card p-8 rounded-2xl hover:border-green-500/50 transition-all transform hover:-translate-y-1 reveal reveal-delay-${(idx % 3) * 100}`}
              >
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold text-carbon-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-carbon-100/60">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
