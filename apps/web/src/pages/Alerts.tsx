import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, Code, Save, AlertCircle, Info, Lock } from 'lucide-react';
import { useTrialTier, canExecuteActions } from '../lib/useTrialTier';
import { TrialBanner } from '../components/TrialBanner';

// Demo alert rules (read-only authoring UI)
const DEMO_ALERT_RULES = [
  {
    id: 'rule-1',
    name: 'High-Value Camera Deals',
    dsl: `marketplace IN ["facebook", "ebay"] AND
keywords CONTAINS "leica" OR "nikon" OR "canon" AND
priceUSD < 1000 AND
score > 0.85`,
    active: true,
    matchCount: 12,
  },
  {
    id: 'rule-2',
    name: 'Furniture Quick Flips',
    dsl: `marketplace = "facebook" AND
keywords CONTAINS "herman miller" OR "eames" AND
signals.freshness > 0.9 AND
priceUSD < 500`,
    active: true,
    matchCount: 8,
  },
  {
    id: 'rule-3',
    name: 'Electronics Bundle',
    dsl: `marketplace IN ["offerup", "facebook"] AND
keywords CONTAINS "nintendo" OR "playstation" AND
title CONTAINS "bundle" AND
score > 0.75`,
    active: false,
    matchCount: 0,
  },
];

export function Alerts() {
  const trialState = useTrialTier();
  const canExecute = canExecuteActions(trialState);

  const [selectedRule, setSelectedRule] = useState(DEMO_ALERT_RULES[0]);
  const [dslInput, setDslInput] = useState(selectedRule.dsl);
  const [showInfo, setShowInfo] = useState(true);

  const handleSelectRule = (rule: typeof DEMO_ALERT_RULES[0]) => {
    setSelectedRule(rule);
    setDslInput(rule.dsl);
  };

  return (
    <div className="min-h-screen bg-carbon-950 text-carbon-100">
      <TrialBanner />
      {/* Header */}
      <div className="border-b border-carbon-800 bg-carbon-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-carbon-100/60 hover:text-green-500 transition-colors"
                aria-label="Back to home"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Alert DSL Editor</h1>
                <p className="text-sm text-carbon-100/50">
                  Authoring Only (No Evaluation)
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium">
                READ-ONLY DEMO
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      {showInfo && (
        <div className="bg-yellow-400/10 border-b border-yellow-400/30">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-400/90">
                  <strong>Constitutional Compliance:</strong> This UI allows authoring alert rules only.
                  No evaluation or execution happens in the frontend. Rules are saved as drafts and
                  processed server-side with full validation and safety checks.
                </div>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="text-yellow-400/60 hover:text-yellow-400 transition-colors"
                aria-label="Dismiss info"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sidebar - Saved Rules */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 rounded-xl">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-green-500" />
                Saved Alert Rules
              </h2>
              <div className="space-y-2">
                {DEMO_ALERT_RULES.map((rule) => (
                  <button
                    key={rule.id}
                    onClick={() => handleSelectRule(rule)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedRule.id === rule.id
                        ? 'bg-green-500/10 border-green-500/50'
                        : 'bg-carbon-800/50 border-carbon-700 hover:border-carbon-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-sm">{rule.name}</div>
                      <div
                        className={`w-2 h-2 rounded-full ${
                          rule.active ? 'bg-green-500' : 'bg-carbon-600'
                        }`}
                        aria-label={rule.active ? 'Active' : 'Inactive'}
                      />
                    </div>
                    <div className="text-xs text-carbon-100/50">
                      {rule.matchCount} matches
                    </div>
                  </button>
                ))}
              </div>
              <button
                className="w-full mt-4 px-4 py-2 bg-carbon-800 text-carbon-100 rounded-lg font-medium hover:bg-carbon-700 transition-all"
                disabled
                aria-label="Create new rule (disabled in demo)"
              >
                + New Rule
              </button>
            </div>

            {/* DSL Reference */}
            <div className="glass-card p-6 rounded-xl mt-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center">
                <Code className="w-4 h-4 mr-2 text-carbon-100/60" />
                DSL Quick Reference
              </h3>
              <div className="text-xs text-carbon-100/60 space-y-2">
                <div>
                  <code className="text-green-400">marketplace</code> = "facebook"
                </div>
                <div>
                  <code className="text-green-400">keywords</code> CONTAINS "leica"
                </div>
                <div>
                  <code className="text-green-400">priceUSD</code> {'<'} 1000
                </div>
                <div>
                  <code className="text-green-400">score</code> {'>'} 0.85
                </div>
                <div>
                  <code className="text-green-400">signals.freshness</code> {'>'} 0.9
                </div>
              </div>
            </div>
          </div>

          {/* Main Editor */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{selectedRule.name}</h2>
                <div className="flex items-center space-x-2">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedRule.active
                        ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                        : 'bg-carbon-700 text-carbon-300 border border-carbon-600'
                    }`}
                  >
                    {selectedRule.active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>

              {/* DSL Editor */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-carbon-100/80 mb-2">
                  Alert Rule (DSL)
                </label>
                <textarea
                  value={dslInput}
                  onChange={(e) => setDslInput(e.target.value)}
                  className="w-full h-48 px-4 py-3 bg-carbon-900 border border-carbon-700 rounded-lg text-carbon-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
                  placeholder="Enter alert rule DSL..."
                  aria-label="DSL rule editor"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative group">
                    <button
                      className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center ${
                        canExecute
                          ? 'bg-green-500 text-carbon-950 hover:bg-green-400'
                          : 'bg-carbon-700 text-carbon-400 cursor-not-allowed'
                      }`}
                      disabled={!canExecute}
                      aria-label={
                        canExecute
                          ? 'Save draft'
                          : 'Save disabled - Available after trial'
                      }
                      title={
                        !canExecute
                          ? 'During the trial, you can explore signals and author rules. Saving unlocks after upgrade.'
                          : undefined
                      }
                    >
                      {!canExecute && <Lock className="w-4 h-4 mr-2" />}
                      <Save className="w-4 h-4 mr-2" />
                      Save Draft
                    </button>
                    {!canExecute && (
                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-3 bg-carbon-800 border border-carbon-700 rounded-lg text-xs text-carbon-100 shadow-lg z-10">
                        <strong>Trial Mode</strong>
                        <p className="mt-1 text-carbon-100/70">
                          During the trial, you can explore signals and author rules.
                          Saving unlocks after upgrade.
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    className="px-6 py-2 bg-carbon-800 text-carbon-100 rounded-lg font-medium hover:bg-carbon-700 transition-all"
                    aria-label="Validate syntax"
                  >
                    Validate Syntax
                  </button>
                </div>
                <button
                  className="px-6 py-2 border-2 border-red-500/30 text-red-400 rounded-lg font-medium hover:bg-red-500/10 transition-all"
                  disabled
                  aria-label="Delete rule"
                >
                  Delete
                </button>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-400/90">
                    <strong>How it works:</strong> Alert rules are saved as drafts in your account.
                    When a new listing is ingested, the backend evaluates all active rules against
                    normalized data. Matches trigger notifications via your configured channels
                    (email, webhook, etc.). No client-side evaluation occurs.
                  </div>
                </div>
              </div>

              {/* Match Preview */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-3">Recent Matches (Last 7 Days)</h3>
                {selectedRule.matchCount > 0 ? (
                  <div className="space-y-2">
                    {[...Array(Math.min(selectedRule.matchCount, 3))].map((_, i) => (
                      <div
                        key={i}
                        className="p-3 bg-carbon-800/50 border border-carbon-700 rounded-lg text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-carbon-100">Sample Match #{i + 1}</div>
                          <div className="text-xs text-carbon-100/50">2 days ago</div>
                        </div>
                      </div>
                    ))}
                    {selectedRule.matchCount > 3 && (
                      <div className="text-center text-xs text-carbon-100/50 pt-2">
                        +{selectedRule.matchCount - 3} more matches
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-carbon-100/50 text-sm">
                    No matches yet. Activate this rule to start receiving alerts.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="mt-8 p-4 bg-carbon-900/50 border border-carbon-800 rounded-xl text-center text-sm text-carbon-100/60">
          This is a demo of the Alert DSL authoring interface. In production, rules are validated
          server-side before activation. All evaluation happens in the backend pipeline.
        </div>
      </div>
    </div>
  );
}
