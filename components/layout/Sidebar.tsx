import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Bell, Activity, Settings, LogOut, Database } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

export const Sidebar = () => {
  const user = useAuthStore(s => s.user);

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/dashboard/deals', label: 'Deals', icon: ShoppingCart },
    { to: '/dashboard/monitors', label: 'Monitors', icon: Bell },
    { to: '/dashboard/jobs', label: 'Jobs', icon: Activity },
    { to: '/dashboard/analytics', label: 'Analytics', icon: Database },
    { to: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-screen">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
          <Database className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight text-white">Magnus Flipper</span>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `
              w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
              ${isActive 
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }
            `}
          >
            <link.icon className="w-4 h-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt={user.displayName || 'User'} className="w-10 h-10 rounded-full border border-slate-700" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user.displayName || 'User'}</div>
              <div className="text-xs text-slate-500 truncate capitalize">{user.tier} Tier</div>
            </div>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-white py-2 transition-colors"
          >
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
        </div>
      )}
    </aside>
  );
};