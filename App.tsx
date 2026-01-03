import React, { useEffect, PropsWithChildren } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Landing } from './pages/Landing';
import { useAuthStore } from './stores/authStore';
import { Loader2 } from 'lucide-react';

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: PropsWithChildren<{}>) => {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-indigo-500"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  const initializeAuth = useAuthStore(s => s.initialize);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<Landing />} />
          
          <Route path="/login" element={<Login />} />
          
          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="deals" element={<div className="p-6 text-slate-400">Deals List (To be implemented)</div>} />
            <Route path="monitors" element={<div className="p-6 text-slate-400">Monitors List (To be implemented)</div>} />
            <Route path="jobs" element={<div className="p-6 text-slate-400">Jobs List (To be implemented)</div>} />
            <Route path="analytics" element={<div className="p-6 text-slate-400">Analytics (To be implemented)</div>} />
            <Route path="settings" element={<div className="p-6 text-slate-400">Settings (To be implemented)</div>} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;