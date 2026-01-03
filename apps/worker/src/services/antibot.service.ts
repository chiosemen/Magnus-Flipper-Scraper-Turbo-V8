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

  async applyStealthMeasures(page: Page) {
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
}
