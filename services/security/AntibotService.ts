import { LogEntry } from '../../types';

export class AntibotService {
  private userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  ];

  generateFingerprint(): string {
    const ua = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    const screen = ['1920x1080', '2560x1440', '1440x900'][Math.floor(Math.random() * 3)];
    return `UA: ${ua} | Res: ${screen} | HW: ${Math.random() > 0.5 ? 'Hardware' : 'Software'} Accel`;
  }

  detectProtection(url: string): 'datadome' | 'cloudflare' | 'akamai' | 'none' {
    if (url.includes('amazon')) return 'datadome'; // Simulating strict protection on Amazon
    if (url.includes('ebay')) return 'akamai';
    if (url.includes('craigslist')) return 'none';
    return 'cloudflare';
  }

  async solveChallenge(type: 'datadome' | 'cloudflare' | 'akamai', logCallback: (msg: string, level?: LogEntry['level']) => void): Promise<boolean> {
    logCallback(`[Antibot] Detected ${type.toUpperCase()} protection layer. Analyzing challenge...`);
    
    await this.delay(800);
    
    if (type === 'datadome') {
      logCallback(`[Antibot] Intercepting DataDome slider challenge...`, 'warning');
      await this.delay(1200);
      logCallback(`[Antibot] Generating mouse movement spline trajectories...`);
      await this.delay(1000);
      logCallback(`[Antibot] Challenge solved. Cookie acquired: dd_cookie_${Math.random().toString(36).substr(2, 8)}`, 'success');
      return true;
    }

    if (type === 'cloudflare') {
      logCallback(`[Antibot] Cloudflare Turnstile detected. Requesting accessibility token...`);
      await this.delay(1500);
      logCallback(`[Antibot] Token verified. Bypass successful.`, 'success');
      return true;
    }

    return true;
  }

  private delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }
}

export const antibotService = new AntibotService();