export const BASE_URL = __ENV.STAGING_API_URL || __ENV.BASE_URL || 'http://localhost:8080';
export const thresholds = JSON.parse(open('./thresholds.json'));

export function getThresholds(name) {
  return thresholds[name] || {};
}
