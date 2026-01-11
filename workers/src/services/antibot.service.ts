export class AntibotService {
  applyStealthMeasures: (page: any) => Promise<void> = async (page: any) => {
    const enabled = process.env.ANTIBOT_FINGERPRINT !== 'false';
    if (!enabled) return;

    // Use fingerprint-generator/injector in real impl; tests provide mocks
    // Attempt to attach fingerprint using available injector
    try {
      // following mocked API in tests
      const { FingerprintInjector } = await import('fingerprint-injector');
      const injector = new FingerprintInjector();
      await injector.attachFingerprintToPlaywright(page);
    } catch (_) {
      // No-op for unit tests or when injector not available
    }
  };

  detectBlockSignals(html: string) {
    const lower = (html || '').toLowerCase();
    if (lower.includes('datadome')) {
      return { blocked: true, provider: 'datadome', signal: 'datadome.js' };
    }
    if (lower.includes('turnstile') || lower.includes('cf-turnstile')) {
      return { blocked: true, provider: 'turnstile', signal: 'turnstile' };
    }
    return { blocked: false };
  }

  getRetryDelayMs(attempt: number, base = 1000, max = 16000) {
    const delay = base * Math.pow(2, Math.max(0, attempt - 1));
    return Math.min(max, delay);
  }
}

export const antibotService = new AntibotService();