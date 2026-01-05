import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Section } from './Section';

export function CTA() {
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
    <Section className="px-6 py-32 md:py-40 bg-gradient-to-br from-carbon-950 via-carbon-900 to-carbon-950 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" aria-hidden="true"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl" aria-hidden="true"></div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-carbon-100 mb-8 leading-tight">
          Stop Scanning.<br />
          <span className="gradient-text">Start Deciding.</span>
        </h2>

        <p className="text-xl md:text-2xl text-carbon-100/70 mb-12 max-w-2xl mx-auto leading-relaxed">
          Magnus Flipper surfaces signal. You control execution.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <button
            onClick={handleGetStarted}
            className="w-full sm:w-auto px-10 py-5 bg-green-500 text-carbon-950 rounded-lg font-bold text-lg hover:bg-green-400 transition-all duration-200 glow-green transform hover:scale-105 shadow-lg"
            aria-label={user ? 'Go to dashboard' : 'Get started for free'}
          >
            {user ? 'Go to Dashboard' : 'Get Started Free'}
          </button>
          <Link
            to="/listings?demo=1"
            className="w-full sm:w-auto px-10 py-5 border-2 border-carbon-700 text-carbon-100 rounded-lg font-bold text-lg hover:border-green-500 hover:text-green-500 transition-all duration-200 hover:bg-carbon-800/30"
            aria-label="View live demo"
          >
            View Live Demo
          </Link>
        </div>

        <p className="text-sm text-carbon-100/50 mt-8 tracking-wide">
          14-day free trial · No credit card required
        </p>
      </div>
    </Section>
  );
}
