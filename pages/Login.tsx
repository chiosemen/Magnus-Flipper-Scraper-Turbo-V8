import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Database, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const user = useAuthStore(s => s.user);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
      <div className="z-10 bg-slate-900/80 backdrop-blur-xl p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Database className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center text-white mb-2">Magnus Flipper AI</h1>
        <p className="text-center text-slate-400 mb-8">Enterprise-Grade Web Scraping Platform</p>
        
        <button 
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full bg-white text-slate-900 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-3 hover:bg-slate-100 transition-all shadow-lg text-sm disabled:opacity-70"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
};