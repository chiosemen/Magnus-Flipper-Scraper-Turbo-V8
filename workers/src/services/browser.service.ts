export class BrowserService {
  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('BLOCKED: Browser automation is disabled in production');
    }
  }

  async getBrowser() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('BLOCKED: getBrowser called in production');
    }
    // Minimal stub for unit tests; real implementation lives elsewhere
    return {
      newPage: async () => ({ close: async () => {} }),
      close: async () => {},
    };
  }

  async createContext() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('BLOCKED: createContext called in production');
    }
    return {
      newPage: async () => ({ close: async () => {} }),
      close: async () => {},
    };
  }
}

export const browserService = new BrowserService();