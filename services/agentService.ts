import { Listing } from '../types';

// Mock Backend Endpoint Configuration
const API_ENDPOINT = 'https://api.magnus-flipper.com/v1/agent/send';

interface AgentResponse {
  success: boolean;
  error?: string;
  messageId?: string;
}

export const agentService = {
  /**
   * Internal helper to execute the network request simulation.
   */
  async _executeRequest(payload: any): Promise<AgentResponse> {
    console.log(`[AgentService] POST ${API_ENDPOINT}`, JSON.stringify(payload, null, 2));

    return new Promise((resolve) => {
      // Realistic delay between 800ms and 2500ms
      const delay = 800 + Math.random() * 1700;
      
      setTimeout(() => {
        // 90% success rate simulation (slightly lowered to allow observing retries during demo)
        const isSuccess = Math.random() > 0.10; 
        
        if (isSuccess) {
          resolve({ success: true, messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` });
        } else {
          // Simulate specific error types
          const errorType = Math.random() > 0.4 ? 'Rate Limit Exceeded' : 'Captcha Challenge Required';
          resolve({ 
            success: false, 
            error: `Platform Error: ${errorType}` 
          });
        }
      }, delay);
    });
  },

  /**
   * Simulates sending a message to a seller via a backend API.
   * Constructs a realistic payload and handles network latency/errors.
   * Includes exponential backoff for 'Rate Limit Exceeded' errors.
   */
  async sendMessage(listing: Listing, messageTemplate: string): Promise<AgentResponse> {
    // 1. Construct the message body using the template
    const messageBody = messageTemplate
      .replace('{seller}', listing.sellerName)
      .replace('{item}', listing.title)
      .replace('{price}', `${listing.currency}${listing.price}`)
      .replace('{condition}', listing.condition)
      .replace('{link}', listing.link);

    // 2. Prepare the JSON payload that would be sent to the server
    const payload = {
      recipient: {
        id: listing.sellerName, // Using name as proxy for ID
        platform: listing.marketplace
      },
      listingId: listing.id,
      content: messageBody,
      timestamp: new Date().toISOString(),
      meta: {
        profitPotential: listing.profitPotential,
        condition: listing.condition,
        pricingType: listing.pricingType,
        antiBot: listing.antiBot
      }
    };

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (true) {
      // Call the internal request helper
      const result = await this._executeRequest(payload);

      if (result.success) {
        return result;
      }

      // Check if the error is a Rate Limit and we have retries left
      if (result.error && result.error.includes('Rate Limit Exceeded') && attempt < MAX_RETRIES) {
        attempt++;
        // Exponential Backoff: 1s, 2s, 4s
        const backoffMs = 1000 * Math.pow(2, attempt - 1);
        
        console.warn(`[AgentService] Rate Limit encountered. Retrying in ${backoffMs}ms (Attempt ${attempt}/${MAX_RETRIES})...`);
        
        // Wait for the backoff period
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      // If not retryable or max retries reached, return the failure
      return result;
    }
  }
};
