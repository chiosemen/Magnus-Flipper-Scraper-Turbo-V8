import { DealSource } from '@repo/types';

export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

export class ProxyService {
  private proxies: ProxyConfig[] = [];

  constructor() {
    // In production, load from env or secret manager
    const proxyUrl = process.env.PROXY_URL; // format: http://user:pass@host:port
    if (proxyUrl) {
      this.proxies.push(this.parseProxyUrl(proxyUrl));
    }
  }

  getProxy(_source?: DealSource): ProxyConfig | undefined {
    if (this.proxies.length === 0) return undefined;
    // Simple round-robin or random for now
    return this.proxies[Math.floor(Math.random() * this.proxies.length)];
  }

  private parseProxyUrl(url: string): ProxyConfig {
    try {
      const u = new URL(url);
      return {
        server: `${u.protocol}//${u.hostname}:${u.port}`,
        username: u.username,
        password: u.password
      };
    } catch (e) {
      console.error('Invalid Proxy URL', e);
      return { server: '' };
    }
  }
}
