import { Section } from './Section';
import { Download, Filter, Sparkles } from 'lucide-react';

const STEPS = [
  {
    icon: Download,
    title: 'Ingest',
    desc: 'Listings are continuously collected from supported marketplaces.',
  },
  {
    icon: Filter,
    title: 'Normalize & Extract Signals',
    desc: 'Raw data is cleaned, standardized, and signals like freshness and rarity are computed deterministically.',
  },
  {
    icon: Sparkles,
    title: 'Score & Surface',
    desc: 'Listings are scored, explained, and surfaced — you decide the action.',
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works" className="px-6 py-24 bg-carbon-950">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-carbon-100 mb-4">
            How Magnus Flipper Works
          </h2>
          <p className="text-xl text-carbon-100/60">
            Signal-driven pipeline, explainable results
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className={`text-center reveal reveal-delay-${idx * 100}`}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Icon className="w-8 h-8 text-carbon-950" />
                </div>
                <div className="text-3xl font-bold text-green-500 mb-2">{idx + 1}</div>
                <h3 className="text-xl font-semibold text-carbon-100 mb-3">
                  {step.title}
                </h3>
                <p className="text-carbon-100/60">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Flow arrow (decorative) */}
        <div className="hidden md:block relative mt-12">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-green-500/20 to-transparent"></div>
          </div>
        </div>
      </div>
    </Section>
  );
}
