import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  {
    q: "How fast are the alerts?",
    a: "Our enterprise-grade scrapers run 24/7. On the Pro plan, alerts typically arrive within 30-60 seconds of the item being listed on the marketplace."
  },
  {
    q: "Which marketplaces do you monitor?",
    a: "We currently support Facebook Marketplace, eBay, Craigslist, OfferUp, Vinted, Gumtree, Nextdoor, and Kijiji. More are added regularly."
  },
  {
    q: "Is there a free trial?",
    a: "Yes! We offer a 7-day free trial on all plans. You can cancel anytime before the trial ends and you won't be charged."
  },
  {
    q: "Can I use this on mobile?",
    a: "Absolutely. Our dashboard is fully responsive, and we offer native push notifications so you never miss a deal while on the go."
  }
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-slate-950">
      <div className="container mx-auto px-6 max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-space font-bold text-white mb-12 text-center">Frequently Asked Questions</h2>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/50"
            >
              <button 
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-slate-800/50 transition-colors"
              >
                <span className="font-bold text-white pr-8">{faq.q}</span>
                {openIndex === index ? <Minus className="w-5 h-5 text-indigo-400" /> : <Plus className="w-5 h-5 text-slate-500" />}
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="p-6 pt-0 text-slate-400 leading-relaxed border-t border-slate-800/50">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};