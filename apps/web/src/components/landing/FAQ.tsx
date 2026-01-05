import { useState } from 'react';
import { Section } from './Section';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    question: 'How fast are the alerts?',
    answer: 'Alerts are delivered within 3-5 minutes of a listing being posted (Pro plan). Enterprise users get instant alerts.',
  },
  {
    question: 'What marketplaces do you support?',
    answer: 'We currently support Facebook Marketplace, eBay, OfferUp, Vinted, Depop, and Poshmark. More platforms are added regularly based on user demand.',
  },
  {
    question: 'How does the AI scoring work?',
    answer: 'Our AI analyzes listing freshness, rarity signals, price context, and historical patterns to generate an explainable signal score. You maintain full control over which deals to pursue.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. Cancel anytime with one click. No questions asked, no hidden fees.',
  },
  {
    question: 'Do you guarantee profits?',
    answer: 'No. Magnus Flipper surfaces high-signal listings, but you make all buy/sell decisions. We provide data and alerts, not financial advice.',
  },
  {
    question: 'What is "human-in-the-loop"?',
    answer: 'Magnus Flipper surfaces signals and recommendations, but never executes trades on your behalf. You maintain complete control over all decisions.',
  },
  {
    question: 'How many keywords can I monitor?',
    answer: 'Starter: 6 keywords, Pro: 13 keywords, Enterprise: 18 keywords. Keyword monitoring runs 24/7 across all supported marketplaces.',
  },
  {
    question: 'Is there API access?',
    answer: 'Pro and Enterprise plans include API access (coming soon in Q1 2026). You\'ll be able to integrate Magnus Flipper signals into your own tools and workflows.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <Section id="faq" className="px-6 py-24 bg-gradient-to-b from-carbon-900 to-carbon-950">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-carbon-100 mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <div
              key={idx}
              className={`glass-card rounded-xl overflow-hidden reveal reveal-delay-${(idx % 3) * 100}`}
            >
              <button
                onClick={() => toggleFAQ(idx)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-carbon-800/30 transition-colors"
                aria-expanded={openIndex === idx}
                aria-controls={`faq-answer-${idx}`}
              >
                <span className="text-lg font-semibold text-carbon-100 pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-green-500 flex-shrink-0 transition-transform ${
                    openIndex === idx ? 'transform rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              {openIndex === idx && (
                <div className="px-6 pb-5 text-carbon-100/70" id={`faq-answer-${idx}`}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
