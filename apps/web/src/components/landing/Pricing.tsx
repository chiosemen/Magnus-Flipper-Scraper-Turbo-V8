import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Section } from './Section';
import { Check } from 'lucide-react';

const TIERS = [
  {
    name: 'Starter',
    price: '$47',
    period: '/mo',
    description: 'Perfect for testing the waters',
    features: [
      '5-minute alerts',
      '6 keyword monitors',
      'Facebook Marketplace only',
      'Basic signal scoring',
      'Email support',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$144',
    period: '/mo',
    description: 'For serious flippers',
    features: [
      '3-minute alerts',
      '13 keyword monitors',
      'All marketplaces',
      'AI signal analysis',
      'Priority support',
      'API access (coming soon)',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$352',
    period: '/mo',
    description: 'Maximum firepower',
    features: [
      'Instant alerts',
      '18 keyword monitors',
      'All marketplaces',
      'Advanced AI analysis',
      'Full API access',
      'Dedicated account manager',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export function Pricing() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const handleGetStarted = () => {
    if (user) {
      navigate('/app');
    } else {
      navigate('/login');
    }
  };

  return (
    <Section id="pricing" className="px-6 py-24 bg-carbon-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-carbon-100 mb-4">
            Simple Pricing
          </h2>
          <p className="text-xl text-carbon-100/60">
            Start free. Upgrade when signals start paying for themselves.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {TIERS.map((tier, idx) => (
            <div
              key={tier.name}
              className={`glass-card p-8 rounded-2xl relative reveal reveal-delay-${idx * 100} ${
                tier.popular ? 'ring-2 ring-green-500' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-yellow-400 text-carbon-950 rounded-full text-sm font-bold">
                  POPULAR
                </div>
              )}

              <h3 className="text-2xl font-bold text-carbon-100 mb-2">
                {tier.name}
              </h3>
              <p className="text-carbon-100/60 mb-6">
                {tier.description}
              </p>

              <div className="mb-8">
                <span className="text-5xl font-bold text-carbon-100">
                  {tier.price}
                </span>
                <span className="text-carbon-100/60">
                  {tier.period}
                </span>
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-carbon-100/80">{feature}</span>
                  </li>
                ))}
              </ul>

              {tier.name === 'Enterprise' ? (
                <a
                  href="mailto:sales@magnusflipper.ai"
                  className={`block w-full py-3 rounded-lg text-center font-semibold transition-all ${
                    tier.popular
                      ? 'bg-green-500 text-carbon-950 hover:bg-green-400 glow-green'
                      : 'bg-carbon-800 text-carbon-100 hover:bg-carbon-700'
                  }`}
                  aria-label="Contact sales team for Enterprise plan"
                >
                  {tier.cta}
                </a>
              ) : (
                <button
                  onClick={handleGetStarted}
                  className={`block w-full py-3 rounded-lg text-center font-semibold transition-all ${
                    tier.popular
                      ? 'bg-green-500 text-carbon-950 hover:bg-green-400 glow-green'
                      : 'bg-carbon-800 text-carbon-100 hover:bg-carbon-700'
                  }`}
                  aria-label={user ? 'Go to app dashboard' : `Start free trial for ${tier.name} plan`}
                >
                  {user ? 'Go to App' : tier.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-carbon-100/50 mt-8">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </Section>
  );
}
