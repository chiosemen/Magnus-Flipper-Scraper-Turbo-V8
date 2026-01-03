import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    quote: "I made $1,200 in my first week. The alerts are insanely fast compared to manual refreshing.",
    author: "Sarah J.",
    role: "Part-time Flipper",
    rating: 5
  },
  {
    quote: "Magnus Flipper is the only tool that actually beats the other bots. Essential for PS5 flipping.",
    author: "Mike T.",
    role: "Power User",
    rating: 5
  },
  {
    quote: "The multi-marketplace support saves me hours every day. It's like having 10 employees watching for deals.",
    author: "David R.",
    role: "Full-time Reseller",
    rating: 5
  }
];

export const Testimonials = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <motion.h2 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-space font-bold text-white mb-16 text-center"
        >
          Trusted by 50,000+ Flippers
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-2xl relative"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-300 mb-6 italic">"{t.quote}"</p>
              <div>
                <div className="font-bold text-white">{t.author}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">{t.role}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};