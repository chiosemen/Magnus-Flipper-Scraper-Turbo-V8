import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Activity, ShoppingCart, TrendingUp, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const StatCard = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <span className="text-slate-400 text-sm font-medium">{label}</span>
      <div className={`p-2 rounded-md bg-slate-700 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
  </div>
);

export const Dashboard = () => {
  const user = useAuthStore(s => s.user);
  
  const { data: stats } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.analytics.dashboard,
  });

  const handleUpgrade = async () => {
    try {
      const result = await api.stripe.checkout('pro');
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Failed to start checkout', error);
    }
  };

  const handleBillingPortal = async () => {
    try {
      const result = await api.stripe.portal();
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Failed to open billing portal', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Welcome back, {user?.displayName}</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBillingPortal}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
          >
            Billing Portal
          </button>
          <button
            type="button"
            onClick={handleUpgrade}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
          >
            Upgrade
          </button>
          <Link 
            to="/monitors" 
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <Zap className="w-4 h-4" /> New Monitor
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          label="Deals Today" 
          value={stats?.today?.dealsFound || 0} 
          icon={ShoppingCart} 
          color="text-emerald-400" 
        />
        <StatCard 
          label="Jobs Run" 
          value={stats?.today?.jobsRun || 0} 
          icon={Activity} 
          color="text-indigo-400" 
        />
        <StatCard 
          label="Total Tracked" 
          value={stats?.total?.deals || 0} 
          icon={TrendingUp} 
          color="text-amber-400" 
        />
        <StatCard 
          label="Active Monitors" 
          value={stats?.total?.monitors || 0} 
          icon={Zap} 
          color="text-purple-400" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
          <div className="text-slate-500 text-center py-8">
            Chart component placeholder (Recharts)
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Live Feed</h3>
          <div className="space-y-3">
             {/* Feed items would leverage Firestore real-time listener */}
             <div className="p-3 bg-slate-800/50 rounded border border-slate-700/50 flex justify-between">
                <span className="text-slate-300">System initialization complete</span>
                <span className="text-xs text-slate-500">Just now</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
