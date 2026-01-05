import { Section } from './Section';
import { TrendingUp, Clock, Target } from 'lucide-react';

const STATS = [
  {
    icon: TrendingUp,
    value: '10K+',
    label: 'Deals Surfaced Daily',
  },
  {
    icon: Clock,
    value: '<3min',
    label: 'Average Alert Time',
  },
  {
    icon: Target,
    value: '89%',
    label: 'Signal Accuracy',
  },
];

const TESTIMONIALS = [
  {
    quote: 'Magnus Flipper cut my research time by 90%. I\'m now focusing on execution instead of endless scrolling.',
    author: 'Sarah M.',
    role: 'Vintage Reseller',
  },
  {
    quote: 'The signal scoring is game-changing. I know exactly which listings to jump on first.',
    author: 'James K.',
    role: 'Electronics Flipper',
  },
];

export function SocialProof() {
  return (
    <Section className="px-6 py-24 bg-gradient-to-b from-carbon-900 to-carbon-950">
      <div className="max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="glass-card p-8 rounded-2xl text-center reveal"
              >
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-green-500" />
                </div>
                <div className="text-4xl font-bold text-carbon-100 mb-2">
                  {stat.value}
                </div>
                <p className="text-carbon-100/60">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-2 gap-8">
          {TESTIMONIALS.map((testimonial, idx) => (
            <div
              key={idx}
              className={`glass-card p-8 rounded-2xl reveal reveal-delay-${idx * 100}`}
            >
              <p className="text-lg text-carbon-100/80 mb-6 italic">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-carbon-950 font-bold">
                    {testimonial.author.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-carbon-100">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-carbon-100/60">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
