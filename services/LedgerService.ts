
import { Monitor, Marketplace } from '../types';

// Simulating a Neon/Postgres Ledger
class LedgerService {
  private events: any[] = [];

  async recordEvent(
    userId: string, 
    eventType: 'refresh' | 'run' | 'overage' | 'boost' | 'throttle', 
    monitorId: string, 
    units: number, 
    meta: any
  ) {
    const event = {
      id: crypto.randomUUID(),
      userId,
      eventType,
      monitorId,
      units,
      meta,
      timestamp: new Date().toISOString()
    };
    
    // In production: INSERT INTO usage_events ...
    this.events.push(event);
    
    // Console log to show "Neon" activity
    console.groupCollapsed(`[Neon Ledger] Event Recorded: ${eventType}`);
    console.log(JSON.stringify(event, null, 2));
    console.groupEnd();
  }

  getRecentEvents() {
    return this.events.slice(-50).reverse();
  }
}

export const ledgerService = new LedgerService();
