
import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal as TerminalIcon, Lock, Activity, AlertOctagon } from 'lucide-react';

interface TerminalProps {
  logs: LogEntry[];
}

export const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-400 font-bold';
      case 'warning': return 'text-amber-400';
      case 'success': return 'text-emerald-400';
      case 'system': return 'text-indigo-400 font-mono';
      default: return 'text-slate-300';
    }
  };

  const getIcon = (message: string) => {
    if (message.includes('Lock')) return <Lock className="w-3 h-3 inline mr-1 opacity-70" />;
    if (message.includes('Throttle')) return <AlertOctagon className="w-3 h-3 inline mr-1 text-amber-500" />;
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-xl font-mono text-sm">
      <div className="flex items-center px-4 py-2 bg-slate-900 border-b border-slate-800 justify-between">
        <div className="flex items-center">
          <TerminalIcon className="w-4 h-4 text-slate-400 mr-2" />
          <span className="text-slate-400 font-semibold">System Control Plane</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
           <Activity className="w-3 h-3" />
           <span>Redis ZSET Active</span>
        </div>
      </div>
      <div 
        ref={scrollRef} 
        className="flex-1 p-4 overflow-y-auto terminal-scroll space-y-1"
      >
        {logs.length === 0 && (
            <div className="text-slate-600 italic">Scheduler idle. Waiting for due monitors...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 hover:bg-slate-900/50 p-0.5 rounded">
            <span className="text-slate-600 shrink-0 select-none text-xs pt-0.5">{log.timestamp}</span>
            <span className={`${getColor(log.level)} break-all`}>
              {getIcon(log.message)}
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
