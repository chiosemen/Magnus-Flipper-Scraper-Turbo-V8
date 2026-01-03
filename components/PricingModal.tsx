
import React from 'react';
import { X, Check, Zap, Shield, Rocket } from 'lucide-react';
import { TierPolicy } from '../config/TierPolicy';

interface PricingModalProps {
  onClose: () => void;
  currentTier: string;
}

export const PricingModal: React.FC<PricingModalProps> = ({ onClose, currentTier }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
        
        <button onClick={onClose} className="absolute top-6 right-6 z-10 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
          <X className="w-5 h-5" />
        </button>

        {/* Hero Section */}
        <div className="p-10 text-center border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/50">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider mb-4">
            <Rocket className="w-3 h-3" /> Built for Full-Time Flippers
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Stop checking. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Start catching.</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            You don’t make money by refreshing pages all day. You make money by being first when the right listing appears.
          </p>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Feature Highlight */}
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
              <Zap className="w-8 h-8 text-amber-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Automated Watch</h3>
              <p className="text-sm text-slate-400">Magnus Flipper continuously watches marketplaces for you—quietly, reliably, and fast.</p>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
              <Shield className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Zero Missed Deals</h3>
              <p className="text-sm text-slate-400">If it appears, you’ll see it. No manual searching. No limits on results.</p>
            </div>
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
              <Rocket className="w-8 h-8 text-indigo-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Enterprise Speed</h3>
              <p className="text-sm text-slate-400">Track 180+ products with refreshes as fast as every 30 minutes with Boost.</p>
            </div>
          </div>

          {/* Pricing Table */}
          <div className="md:col-span-3">
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr>
                     <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-700">Tier</th>
                     <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-700">Products</th>
                     <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-700">Default Refresh</th>
                     <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-700">Who This Fits</th>
                     <th className="p-4 text-xs font-bold text-slate-500 uppercase border-b border-slate-700">Action</th>
                   </tr>
                 </thead>
                 <tbody className="text-sm">
                   {[
                     { name: 'Basic', products: '25', refresh: 'Every 12 hours', fit: 'Casual flippers', active: currentTier === 'basic' },
                     { name: 'Pro', products: '60', refresh: 'Every 6 hours', fit: 'Full-time solo flippers', active: currentTier === 'pro', highlight: true },
                     { name: 'Elite', products: '100', refresh: 'Every 3 hours', fit: 'Power users', active: currentTier === 'elite' },
                     { name: 'Enterprise', products: '180+', refresh: 'Every 2 hours', fit: 'Professional desks', active: currentTier === 'ent', ent: true }
                   ].map((tier) => (
                     <tr key={tier.name} className={`border-b border-slate-800 hover:bg-slate-800/30 transition-colors ${tier.ent ? 'bg-indigo-900/10' : ''}`}>
                       <td className="p-4 font-bold text-white flex items-center gap-2">
                         {tier.name} 
                         {tier.ent && <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">Top</span>}
                       </td>
                       <td className="p-4 text-slate-300">{tier.products}</td>
                       <td className="p-4 text-slate-300 font-mono text-xs">{tier.refresh}</td>
                       <td className="p-4 text-slate-400">{tier.fit}</td>
                       <td className="p-4">
                         {tier.active ? (
                           <span className="text-emerald-400 font-bold text-xs flex items-center gap-1"><Check className="w-3 h-3" /> Current</span>
                         ) : (
                           <button className="text-xs font-bold text-white bg-slate-700 hover:bg-indigo-600 px-3 py-1.5 rounded transition-colors">
                             Upgrade
                           </button>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
             
             <div className="mt-8 bg-slate-800/30 p-6 rounded-xl border border-slate-800">
                <h4 className="font-bold text-white mb-2">About Custom Refresh Rates</h4>
                <p className="text-sm text-slate-400 mb-2">
                  <span className="text-indigo-400 font-semibold">“Can I refresh every 30 minutes?”</span>
                </p>
                <p className="text-sm text-slate-400">
                   Yes. You can <strong>Boost</strong> specific products to a 30-minute refresh rate. This gives you a stronger edge on your most important items without upgrading your entire account. 
                   We simply align the cost to the background checking volume.
                </p>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};
