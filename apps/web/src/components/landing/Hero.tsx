import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Section } from './Section';

export function Hero() {
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
    <Section reveal={false} className="px-6 pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="max-w-6xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-carbon-800 border border-carbon-700 text-sm text-carbon-100 mb-8 animate-fade-in">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" aria-hidden="true"></span>
          Signal-Driven Deal Discovery (AI-Assisted)
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-carbon-100 mb-8 leading-tight">
          Instant Marketplace Alerts<br />
          <span className="gradient-text">& Deal Arbitrage</span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-carbon-100/70 max-w-3xl mx-auto mb-12 leading-relaxed">
          Find profitable flips instantly. Real-time alerts before anyone else sees the deal.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <button
            onClick={handleGetStarted}
            className="w-full sm:w-auto px-10 py-5 bg-green-500 text-carbon-950 rounded-lg font-bold text-lg hover:bg-green-400 transition-all duration-200 glow-green transform hover:scale-105 shadow-lg"
            aria-label={user ? 'Go to dashboard' : 'Start your free trial'}
          >
            {user ? 'Go to Dashboard' : 'Start Free Trial'}
          </button>
          <Link
            to="/listings?demo=1"
            className="w-full sm:w-auto px-10 py-5 border-2 border-carbon-700 text-carbon-100 rounded-lg font-semibold text-lg hover:border-green-500 hover:text-green-500 transition-all duration-200 hover:bg-carbon-800/30"
            aria-label="View live demo with sample data"
          >
            View Live Demo
          </Link>
        </div>

        {/* Trust line */}
        <p className="text-sm text-carbon-100/50 tracking-wide">
          No credit card · Cancel anytime · Human-in-the-loop by design
        </p>
      </div>
    </Section>
  );
}
