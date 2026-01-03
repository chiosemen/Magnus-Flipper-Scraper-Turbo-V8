import { vi } from 'vitest';
import { Buffer } from 'buffer';

export const createMockPage = () => ({
  goto: vi.fn().mockResolvedValue(null),
  content: vi.fn().mockResolvedValue('<html><body><div class="product">Mock Product</div></body></html>'),
  waitForSelector: vi.fn().mockResolvedValue(null),
  click: vi.fn().mockResolvedValue(null),
  fill: vi.fn().mockResolvedValue(null),
  evaluate: vi.fn().mockImplementation((fn) => {
    // Basic evaluation mock, can be customized per test
    return Promise.resolve([]);
  }),
  screenshot: vi.fn().mockResolvedValue(Buffer.from('fake_image')),
  close: vi.fn().mockResolvedValue(null),
  setExtraHTTPHeaders: vi.fn(),
});

export const createMockBrowser = () => ({
  newPage: vi.fn().mockResolvedValue(createMockPage()),
  close: vi.fn().mockResolvedValue(null),
});

export const mockPlaywright = {
  chromium: {
    launch: vi.fn().mockResolvedValue(createMockBrowser()),
  },
};