import { useEffect, useState } from 'react';
import { api } from '../lib/api';

type KillSwitchState = {
  scrapersEnabled: boolean;
  facebookEnabled: boolean;
  vintedEnabled: boolean;
  realtimeEnabled: boolean;
  scheduledEnabled: boolean;
  manualEnabled: boolean;
  demoModeEnabled?: boolean;
  demoModeExpiresAt?: string | null;
};

type GateStatus = 'green' | 'amber' | 'red';

type ControlsResponse = {
  killSwitch: KillSwitchState;
  gate: {
    status: GateStatus;
    config: Record<string, any>;
    decision: {
      allowed: boolean;
      reasons: string[];
    };
  };
  stripeMode: string;
};

const statusColor = (status: GateStatus) => {
  if (status === 'green') return 'text-emerald-400';
  if (status === 'amber') return 'text-amber-400';
  return 'text-rose-400';
};

export const Admin = () => {
  const [controls, setControls] = useState<ControlsResponse | null>(null);
  const [draft, setDraft] = useState<KillSwitchState | null>(null);
  const [ttlMinutes, setTtlMinutes] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await api.admin.controls();
        if (!active) return;
        setControls(data as ControlsResponse);
        setDraft((data as ControlsResponse).killSwitch);
      } catch (err: any) {
        if (!active) return;
        setError(err.message || 'Failed to load admin controls');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const updateToggle = (key: keyof KillSwitchState) => {
    if (!draft) return;
    setDraft({ ...draft, [key]: !draft[key] });
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, any> = { ...draft };
      if (ttlMinutes !== '') {
        payload.demoModeTtlMinutes = ttlMinutes;
      }
      const updated = await api.admin.updateKillSwitches(payload);
      const next = { ...controls, killSwitch: updated } as ControlsResponse;
      setControls(next);
      setDraft(updated as KillSwitchState);
      setTtlMinutes('');
    } catch (err: any) {
      setError(err.message || 'Failed to update kill switches');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-400">Loading admin controls...</div>;
  }

  if (error) {
    return <div className="p-6 text-rose-400">{error}</div>;
  }

  if (!controls || !draft) {
    return <div className="p-6 text-slate-400">Admin controls unavailable.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Admin Control Panel</h1>
        <p className="text-sm text-slate-400">Operational toggles and live safety status.</p>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Stripe Mode</h2>
          <span className="text-xs text-slate-400 uppercase tracking-wide">{controls.stripeMode}</span>
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Gate Status</h2>
          <span className={`text-sm font-semibold ${statusColor(controls.gate.status)}`}>
            {controls.gate.status.toUpperCase()}
          </span>
        </div>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
        <h2 className="text-sm font-semibold text-slate-200">Kill Switches</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {[
            ['scrapersEnabled', 'Scrapers Enabled'],
            ['facebookEnabled', 'Facebook Enabled'],
            ['vintedEnabled', 'Vinted Enabled'],
            ['realtimeEnabled', 'Realtime Workers'],
            ['scheduledEnabled', 'Scheduled Workers'],
            ['manualEnabled', 'Manual Workers'],
            ['demoModeEnabled', 'Demo Mode'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-md px-3 py-2">
              <span className="text-slate-300">{label}</span>
              <input
                type="checkbox"
                checked={Boolean((draft as any)[key])}
                onChange={() => updateToggle(key as keyof KillSwitchState)}
                className="h-4 w-4 accent-indigo-500"
              />
            </label>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span>Demo TTL (minutes)</span>
          <input
            type="number"
            min={1}
            value={ttlMinutes}
            onChange={(e) => setTtlMinutes(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200"
          />
          <span className="text-xs">Current expiry: {draft.demoModeExpiresAt || 'none'}</span>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm font-medium rounded"
        >
          {saving ? 'Saving...' : 'Apply Changes'}
        </button>
      </section>
    </div>
  );
};
