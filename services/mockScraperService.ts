
import { Listing, LogEntry, Marketplace, ScrapeJob, User, Monitor } from '../types';
import { amazonScraper } from './scrapers/AmazonScraper';
import { antibotService } from './security/AntibotService';
import { scheduler } from './SchedulerEngine';
import { redis } from './infra/RedisAdapter';

// Simulation of the Backend Infrastructure
class MagnusFlipperBackend {
  private jobs: ScrapeJob[] = [];
  private results: Listing[] = [];
  private monitors: Monitor[] = [];
  private listeners: ((jobs: ScrapeJob[]) => void)[] = [];
  
  // Simulated "Cloud Run" active workers
  private activeWorkers = 0;
  private readonly MAX_WORKERS = 10;

  constructor() {
    // Connect Scheduler
    scheduler.setLogger((jobId, msg, level) => this.addLog(jobId, msg, level));
    
    scheduler.onJobStart = (job) => {
      this.jobs = [job, ...this.jobs];
      this.notify();
      
      // CRITICAL: Only run the worker if the job was NOT throttled by the scheduler
      if (job.status !== 'throttled') {
         this.runWorker(job.id, job.site, job.url);
      }
    };

    scheduler.onJobUpdate = (updatedJob) => {
      this.jobs = this.jobs.map(j => j.id === updatedJob.id ? updatedJob : j);
      this.notify();
    };

    scheduler.startLoop();
    this.seedMonitors();
  }

  // Seed some initial monitors for the ZSET
  private async seedMonitors() {
    // 1. Seed User Data (Tier) for Scheduler Checks
    await redis.set('mf:user:user_google_123:tier', 'pro');

    // 2. Seed Monitor
    const m1: Monitor = {
      id: 'mon_1',
      user_id: 'user_google_123',
      name: 'Sony Headphones (Boosted)',
      query: 'https://amazon.com/sony-wh1000xm5',
      marketplaces: ['amazon', 'ebay'],
      refresh_interval_sec: 3600,
      boost_interval_sec: 1800,
      is_enabled: true,
      priority: 10,
      next_refresh_at: Date.now()
    };

    await redis.hset(`mf:job:${m1.id}`, 'monitor', JSON.stringify(m1));
    await redis.hset(`mf:job:${m1.id}`, 'throttle_count', '0');
    await redis.zadd('mf:queue:refresh', Date.now(), m1.id);
  }

  // --- Auth Simulation ---
  async login(): Promise<User> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          id: 'user_google_123',
          email: 'demo@magnusflipper.ai',
          displayName: 'Demo User',
          photoURL: 'https://ui-avatars.com/api/?name=Demo+User&background=6366f1&color=fff',
          tier: 'pro',
          quota: { limit: 50, used: 12 }
        });
      }, 800);
    });
  }

  async loginWithEmail(email: string, password: string): Promise<User> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!email.includes('@') || password.length < 6) {
           reject(new Error("Invalid credentials"));
           return;
        }

        const name = email.split('@')[0];
        // Determinstic avatar color based on name length
        const color = name.length % 2 === 0 ? '6366f1' : '10b981';

        resolve({
          id: `user_${Math.random().toString(36).substr(2, 9)}`,
          email: email,
          displayName: name.charAt(0).toUpperCase() + name.slice(1),
          photoURL: `https://ui-avatars.com/api/?name=${name}&background=${color}&color=fff`,
          tier: 'basic', // Email signups start at basic
          quota: { limit: 25, used: 0 }
        });
      }, 1200); // Slightly longer delay to simulate hashing/verification
    });
  }

  // --- Job Management ---
  async submitJob(url: string, site: Marketplace): Promise<string> {
    // Legacy support: Wrap manual jobs as a one-off monitor/job interaction
    // In strict mode, we'd create a monitor. For now, just bypass scheduler for manual runs
    // OR: We can simulate it properly:
    
    const jobId = `job_manual_${Date.now()}`;
    const newJob: ScrapeJob = {
      id: jobId,
      userId: 'user_google_123',
      url,
      site,
      status: 'pending',
      currentStep: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
      resultCount: 0,
      logs: [],
      retryCount: 0
    };

    this.jobs = [newJob, ...this.jobs];
    this.notify();
    
    // Direct dispatch for manual jobs (bypassing scheduler loop but using worker)
    this.runWorker(jobId, site, url);
    return jobId;
  }

  subscribe(callback: (jobs: ScrapeJob[]) => void) {
    this.listeners.push(callback);
    callback(this.jobs);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  getResults(jobId?: string): Listing[] {
    if (jobId) return this.results.filter(r => r.jobId === jobId);
    return this.results;
  }

  private notify() {
    this.listeners.forEach(l => l(this.jobs));
  }

  private addLog(jobId: string, message: string, level: LogEntry['level'] = 'info') {
    this.jobs = this.jobs.map(j => {
      if (j.id === jobId) {
        return {
          ...j,
          logs: [...j.logs, {
            id: Math.random().toString(36),
            timestamp: new Date().toLocaleTimeString(),
            level,
            message
          }]
        };
      }
      return j;
    });
    this.notify();
  }

  // --- Worker Execution (Simulating Cloud Run / Apify) ---
  private async runWorker(jobId: string, site: Marketplace, url: string) {
    // NOTE: In the new architecture, the concurrency locks are ALREADY held by the scheduler.
    // We just execute here.
    
    const workerId = `worker-apify-${Math.random().toString(36).substr(2, 5)}`;
    
    const updateJob = (updates: Partial<ScrapeJob>) => {
      this.jobs = this.jobs.map(j => j.id === jobId ? { ...j, ...updates } : j);
      this.notify();
    };

    try {
      // 1. Provisioning
      updateJob({ status: 'provisioning', workerId, currentStep: 'booting_worker' });
      this.addLog(jobId, `[Apify] Actor allocation: ${workerId}`);
      await this.delay(800);
      
      // 2. Browser Launch
      updateJob({ status: 'running', currentStep: 'browser_launch', progress: 10 });
      this.addLog(jobId, `[Apify] Launching playwright-stealth...`);
      await this.delay(1000);

      // --- SIMULATED FAILURE INJECTION START ---
      const currentJob = this.jobs.find(j => j.id === jobId);
      if (currentJob && (currentJob.retryCount || 0) === 0 && Math.random() < 0.2) {
        throw new Error("Simulated ETIMEDOUT (Proxy Rotate)");
      }
      // --- SIMULATED FAILURE INJECTION END ---

      // 3. Scraper Execution
      let generatedResults: Listing[] = [];
      const logWrapper = (msg: string, level: LogEntry['level'] = 'info') => this.addLog(jobId, msg, level);

      if (site === 'amazon') {
        generatedResults = await amazonScraper.scrape(jobId, url, logWrapper);
      } else {
        // Generic / Other
        logWrapper(`[Apify] Processing ${url} via generic actor...`);
        updateJob({ progress: 50, currentStep: 'navigating' });
        await this.delay(1500);
        generatedResults = this.generateGenericResults(jobId, site, url);
      }

      // 4. Save Results
      this.results = [...generatedResults, ...this.results];

      updateJob({ currentStep: 'saving_results', progress: 90 });
      this.addLog(jobId, `[Supabase] Upserting ${generatedResults.length} listings...`);
      await this.delay(500);

      // 5. Completion
      updateJob({ 
        status: 'completed', 
        currentStep: 'idle', 
        progress: 100, 
        completedAt: new Date().toISOString(),
        resultCount: generatedResults.length 
      });
      this.addLog(jobId, `[System] Run successful. Releasing locks.`, 'success');

    } catch (error) {
       const job = this.jobs.find(j => j.id === jobId);
       const retryCount = job?.retryCount || 0;
       
       // Jitter Backoff
       const backoffBase = 3000; // 3s
       const jitter = Math.random() * 1000;
       const backoffMs = backoffBase * Math.pow(2, retryCount) + jitter;

       this.addLog(jobId, `[Worker] Failed: ${(error as Error).message}`, 'error');
       
       if (retryCount < 3) {
         this.addLog(jobId, `[Scheduler] Re-queueing with jitter. Next attempt in ${Math.round(backoffMs)}ms`, 'warning');
         updateJob({ 
           status: 'pending', 
           retryCount: retryCount + 1,
           nextRetryAt: new Date(Date.now() + backoffMs).toISOString(),
           workerId: undefined
         });
         // In a real implementation, we'd release the concurrency lock here but keep the monitor lock? 
         // Actually, simpler to fail the run and let the scheduler retry the monitor or handle run-level retries.
         // For this demo: we simulate a retry within the same monitor window.
       } else {
         updateJob({ status: 'failed', currentStep: 'idle', progress: 0 });
         this.addLog(jobId, `[Scheduler] Max retries exceeded.`, 'error');
       }
    } finally {
      // CRITICAL: Release Concurrency Locks
      const job = this.jobs.find(j => j.id === jobId);
      if (job) await scheduler.completeRun(job);
    }

    this.activeWorkers--;
  }

  private generateGenericResults(jobId: string, site: Marketplace, url: string): Listing[] {
    // ... existing generation logic ...
    const seed = this.hashSeed(`${jobId}:${site}:${url}`);
    const count = 3 + (seed % 3);
    const results: Listing[] = [];

    for (let i = 0; i < count; i++) {
      const price = 50 + ((seed + (i * 37)) % 450);
      const sellerIndex = 100 + ((seed + (i * 13)) % 900);
      const profitPotential = 20 + ((seed + (i * 17)) % 80);
      results.push({
        id: `res-${jobId}-${i}`,
        jobId: jobId,
        title: this.getFakeTitle(site, seed + i),
        price,
        currency: '$',
        location: 'Online',
        link: url,
        imageUrl: `https://picsum.photos/seed/${jobId}${i}/300/300`,
        rating: 4.5,
        reviews: 100,
        marketplace: site,
        condition: 'Used - Good',
        sellerName: `Seller_${sellerIndex}`,
        isSpam: false,
        postedTime: 'Just now',
        automationStatus: 'idle',
        profitPotential,
        isSaved: false
      });
    }
    return results;
  }

  private getFakeTitle(site: Marketplace, seed: number): string {
    const products = ['Sony WH-1000XM5', 'MacBook Pro M2', 'Vintage Levis 501', 'PlayStation 5 Slim', 'Herman Miller Aeron'];
    const index = seed % products.length;
    return products[index];
  }

  private delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }

  private hashSeed(input: string) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
  }
}

export const magnusFlipperService = new MagnusFlipperBackend();
