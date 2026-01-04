import { Page } from 'playwright';
import { FingerprintGenerator } from 'fingerprint-generator';
import { FingerprintInjector } from 'fingerprint-injector';

export class AntibotService {
  private fingerprintGenerator: FingerprintGenerator;
  private fingerprintInjector: FingerprintInjector;

  constructor() {
    this.fingerprintGenerator = new FingerprintGenerator({
      devices: ['desktop'],
      operatingSystems: ['windows', 'macos'],
      browsers: [{ name: 'chrome', minVersion: 110 }],
    });
    this.fingerprintInjector = new FingerprintInjector();
  }

  isFingerprintingEnabled() {
    return process.env.ANTIBOT_FINGERPRINT !== 'false';
  }

  async applyStealthMeasures(page: Page) {
    if (!this.isFingerprintingEnabled()) {
      return;
    }
    const fingerprint = this.fingerprintGenerator.getFingerprint();
    await this.fingerprintInjector.attachFingerprintToPlaywright(page, fingerprint);
  }

  async simulateHumanBehavior(page: Page) {
    // Simple random mouse movements
    const width = page.viewportSize()?.width || 1920;
    const height = page.viewportSize()?.height || 1080;
    
    await page.mouse.move(
      Math.floor(Math.random() * width),
      Math.floor(Math.random() * height),
      { steps: 5 }
    );
    
    // Random scroll
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight / 2);
    });
    
    await page.waitForTimeout(500 + Math.random() * 1000);
  }

  detectBlockSignals(html: string) {
    const content = html.toLowerCase();

    if (content.includes('datadome') || content.includes('geo.captcha') || content.includes('dd-captcha')) {
      return { blocked: true, provider: 'datadome' as const, signal: 'datadome' };
    }

    if (content.includes('captcha') || content.includes('verify you are human')) {
      return { blocked: true, provider: 'captcha' as const, signal: 'captcha' };
    }

    if (content.includes('cf-challenge') || content.includes('attention required')) {
      return { blocked: true, provider: 'cloudflare' as const, signal: 'cloudflare' };
    }

    return { blocked: false as const };
  }

  getRetryDelayMs(attempt: number, baseMs = 1000, maxMs = 30000) {
    const normalized = Math.max(1, Math.floor(attempt));
    const delay = baseMs * Math.pow(2, normalized - 1);
    return Math.min(delay, maxMs);
  }
}
