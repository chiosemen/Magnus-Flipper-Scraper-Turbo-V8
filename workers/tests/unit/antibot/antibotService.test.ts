import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AntibotService } from '../../../src/services/antibot.service';

let attachSpy: ReturnType<typeof vi.fn>;

vi.mock('fingerprint-generator', () => ({
  FingerprintGenerator: vi.fn().mockImplementation(() => ({
    getFingerprint: () => ({ visitorId: 'fp-test' }),
  })),
}));

vi.mock('fingerprint-injector', () => ({
  FingerprintInjector: vi.fn().mockImplementation(() => {
    attachSpy = vi.fn();
    return { attachFingerprintToPlaywright: attachSpy };
  }),
}));

const mockPage = {
  viewportSize: () => ({ width: 1200, height: 800 }),
  mouse: { move: vi.fn() },
  evaluate: vi.fn(),
  waitForTimeout: vi.fn(),
};

describe('AntibotService', () => {
  beforeEach(() => {
    attachSpy?.mockClear();
    mockPage.mouse.move.mockClear();
    mockPage.evaluate.mockClear();
    mockPage.waitForTimeout.mockClear();
    delete process.env.ANTIBOT_FINGERPRINT;
  });

  it('applies fingerprint when enabled', async () => {
    const service = new AntibotService();
    await service.applyStealthMeasures(mockPage as any);
    expect(attachSpy).toHaveBeenCalledTimes(1);
  });

  it('skips fingerprint when disabled via env', async () => {
    process.env.ANTIBOT_FINGERPRINT = 'false';
    const service = new AntibotService();
    await service.applyStealthMeasures(mockPage as any);
    expect(attachSpy).not.toHaveBeenCalled();
  });

  it('detects DataDome block signals', () => {
    const service = new AntibotService();
    const decision = service.detectBlockSignals('<div>datadome</div>');
    expect(decision.blocked).toBe(true);
    expect(decision.provider).toBe('datadome');
  });

  it('computes exponential backoff with a max cap', () => {
    const service = new AntibotService();
    expect(service.getRetryDelayMs(1)).toBe(1000);
    expect(service.getRetryDelayMs(2)).toBe(2000);
    expect(service.getRetryDelayMs(3)).toBe(4000);
    expect(service.getRetryDelayMs(10, 1000, 8000)).toBe(8000);
  });
});
