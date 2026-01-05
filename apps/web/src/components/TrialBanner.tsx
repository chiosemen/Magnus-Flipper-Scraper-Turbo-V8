import { useState } from 'react';
import { X, Info, ArrowRight } from 'lucide-react';
import { useTrialTier } from '../lib/useTrialTier';
import { Link } from 'react-router-dom';

/**
 * Trial Mode Banner
 *
 * Constitutional-safe: UI-only component for messaging.
 * No execution logic, no business rules.
 *
 * Purpose: Inform users of trial limitations with clarity and honesty.
 */

export function TrialBanner() {
  const trialState = useTrialTier();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if not in trial mode
  if (!trialState.isTrial || dismissed) {
    return null;
  }

  const { isExpired, daysRemaining } = trialState;

  return (
    <div className="bg-gradient-to-r from-yellow-400/10 via-yellow-400/5 to-transparent border-b border-yellow-400/20">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <Info className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="text-yellow-400 font-semibold">
                {isExpired ? 'Trial Expired' : 'Trial Mode'}
              </span>
              <span className="text-carbon-100/70">
                {isExpired
                  ? 'Upgrade to continue using all features'
                  : `Signals visible · Execution disabled${
                      daysRemaining !== null ? ` · ${daysRemaining}d remaining` : ''
                    }`}
              </span>
              <Link
                to="/app"
                className="inline-flex items-center text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
              >
                Upgrade Now
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-carbon-100/50 hover:text-carbon-100/80 transition-colors ml-4"
            aria-label="Dismiss banner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
