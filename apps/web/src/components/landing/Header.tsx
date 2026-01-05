import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function Header() {
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
    <header className="sticky top-0 z-50 backdrop-blur-md bg-carbon-950/80 border-b border-carbon-800">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2" aria-label="Magnus Flipper Home">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <span className="text-carbon-950 font-bold text-xl">M</span>
            </div>
            <span className="text-xl font-bold text-carbon-100">Magnus Flipper</span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-carbon-100 hover:text-green-500 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-carbon-100 hover:text-green-500 transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="text-carbon-100 hover:text-green-500 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="text-carbon-100 hover:text-green-500 transition-colors">
              FAQ
            </a>
          </nav>

          {/* CTA */}
          <div className="flex items-center space-x-4">
            {user ? (
              <Link
                to="/app"
                className="text-carbon-100 hover:text-green-500 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-carbon-100 hover:text-green-500 transition-colors"
              >
                Login
              </Link>
            )}
            <button
              onClick={handleGetStarted}
              className="px-5 py-2.5 bg-green-500 text-carbon-950 rounded-lg font-medium hover:bg-green-400 transition-all glow-green"
            >
              {user ? 'Go to App' : 'Start Free Trial'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
