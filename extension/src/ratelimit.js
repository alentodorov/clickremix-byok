// Rate Limiting Module for ClickRemix
// Simple monthly quota tracking using chrome.storage.sync

// Import logger if it's not already available (handles both background.js and popup.js contexts)
if (typeof logger === "undefined") {
  if (typeof importScripts === "function") {
    importScripts("logger.js");
  }
}

const RATE_LIMIT_CONFIG = {
  MONTHLY_LIMIT: 999999, // No limit for BYOK version, just tracking
  STORAGE_KEY: "ratelimit_quota",
};

/**
 * Initialize rate limit quota on first use
 */
async function initializeRateLimit() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([RATE_LIMIT_CONFIG.STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        logger.error(
          "Storage sync error during init:",
          chrome.runtime.lastError,
        );
        resolve();
        return;
      }

      // Only initialize if doesn't exist
      if (!result[RATE_LIMIT_CONFIG.STORAGE_KEY]) {
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7); // "2025-11"

        const initialQuota = {
          monthlyRequests: 0,
          monthlyLimit: RATE_LIMIT_CONFIG.MONTHLY_LIMIT,
          lastResetMonth: currentMonth,
          totalRequestsAllTime: 0,
          firstUseDate: now.toISOString().split("T")[0],
        };

        chrome.storage.sync.set(
          { [RATE_LIMIT_CONFIG.STORAGE_KEY]: initialQuota },
          () => {
            if (chrome.runtime.lastError) {
              logger.error(
                "Failed to initialize rate limit:",
                chrome.runtime.lastError,
              );
            } else {
              logger.log("Rate limit initialized:", initialQuota);
            }
            resolve();
          },
        );
      } else {
        logger.log(
          "Rate limit already initialized:",
          result[RATE_LIMIT_CONFIG.STORAGE_KEY],
        );
        resolve();
      }
    });
  });
}

/**
 * Check if we're in a new month and should reset the counter
 */
function shouldResetMonthly(lastResetMonth) {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // "2025-11"
  return currentMonth !== lastResetMonth;
}

/**
 * Get Unix timestamp for the 1st of next month at 00:00 UTC
 */
function getNextMonthResetTime() {
  const now = new Date();
  const nextMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
  return nextMonth.getTime();
}

/**
 * Check if a request is allowed based on current quota
 * BYOK version: Always allows requests, just for tracking
 * Returns: { allowed: boolean, reason: string|null, resetTime: number|null, remaining: number }
 */
async function checkRateLimit() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([RATE_LIMIT_CONFIG.STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        logger.error(
          "Storage sync error during check:",
          chrome.runtime.lastError,
        );
        // On error, allow request but log
        resolve({
          allowed: true,
          reason: null,
          resetTime: null,
          remaining: RATE_LIMIT_CONFIG.MONTHLY_LIMIT,
        });
        return;
      }

      let quota = result[RATE_LIMIT_CONFIG.STORAGE_KEY];

      // If quota doesn't exist or is corrupted, initialize and allow
      if (!quota || typeof quota.monthlyRequests !== "number") {
        logger.warn(
          "Rate limit quota missing or corrupted, reinitializing...",
        );
        initializeRateLimit().then(() => {
          resolve({
            allowed: true,
            reason: null,
            resetTime: null,
            remaining: RATE_LIMIT_CONFIG.MONTHLY_LIMIT,
          });
        });
        return;
      }

      // Check if we need to reset for new month
      if (shouldResetMonthly(quota.lastResetMonth)) {
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);

        quota.monthlyRequests = 0;
        quota.lastResetMonth = currentMonth;

        // Save the reset quota
        chrome.storage.sync.set(
          { [RATE_LIMIT_CONFIG.STORAGE_KEY]: quota },
          () => {
            if (chrome.runtime.lastError) {
              logger.error(
                "Failed to reset monthly quota:",
                chrome.runtime.lastError,
              );
            } else {
              logger.log("Monthly quota reset for new month:", currentMonth);
            }
          },
        );
      }

      // BYOK version: Always allow, no limit enforcement
      const remaining = quota.monthlyLimit - quota.monthlyRequests;

      resolve({
        allowed: true,
        reason: null,
        resetTime: getNextMonthResetTime(),
        remaining: Math.max(0, remaining),
      });
    });
  });
}

/**
 * Increment the request counter after a request is made
 */
async function incrementRateLimitCounter() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([RATE_LIMIT_CONFIG.STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        logger.error(
          "Storage sync error during increment:",
          chrome.runtime.lastError,
        );
        resolve();
        return;
      }

      let quota = result[RATE_LIMIT_CONFIG.STORAGE_KEY];

      if (!quota) {
        logger.error("Cannot increment: quota not initialized");
        resolve();
        return;
      }

      // Check if we need to reset for new month
      if (shouldResetMonthly(quota.lastResetMonth)) {
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7);
        quota.monthlyRequests = 0;
        quota.lastResetMonth = currentMonth;
      }

      // Increment counters
      quota.monthlyRequests += 1;
      quota.totalRequestsAllTime = (quota.totalRequestsAllTime || 0) + 1;

      // Save updated quota
      chrome.storage.sync.set(
        { [RATE_LIMIT_CONFIG.STORAGE_KEY]: quota },
        () => {
          if (chrome.runtime.lastError) {
            logger.error(
              "Failed to increment counter:",
              chrome.runtime.lastError,
            );
          } else {
            logger.log("Rate limit counter incremented:", {
              monthlyRequests: quota.monthlyRequests,
              totalAllTime: quota.totalRequestsAllTime,
            });
          }
          resolve();
        },
      );
    });
  });
}

/**
 * Get current rate limit status for UI display
 * Returns: { monthlyUsed, monthlyRemaining, monthlyLimit, nextResetTime, canRequest }
 */
async function getRateLimitStatus() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([RATE_LIMIT_CONFIG.STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        logger.error(
          "Storage sync error during status check:",
          chrome.runtime.lastError,
        );
        resolve({
          monthlyUsed: 0,
          monthlyRemaining: RATE_LIMIT_CONFIG.MONTHLY_LIMIT,
          monthlyLimit: RATE_LIMIT_CONFIG.MONTHLY_LIMIT,
          nextResetTime: getNextMonthResetTime(),
          canRequest: true,
        });
        return;
      }

      let quota = result[RATE_LIMIT_CONFIG.STORAGE_KEY];

      if (!quota) {
        // Not initialized yet
        resolve({
          monthlyUsed: 0,
          monthlyRemaining: RATE_LIMIT_CONFIG.MONTHLY_LIMIT,
          monthlyLimit: RATE_LIMIT_CONFIG.MONTHLY_LIMIT,
          nextResetTime: getNextMonthResetTime(),
          canRequest: true,
        });
        return;
      }

      // Check if we need to reset for new month
      if (shouldResetMonthly(quota.lastResetMonth)) {
        quota.monthlyRequests = 0;
      }

      const remaining = quota.monthlyLimit - quota.monthlyRequests;

      resolve({
        monthlyUsed: quota.monthlyRequests,
        monthlyRemaining: Math.max(0, remaining),
        monthlyLimit: quota.monthlyLimit,
        nextResetTime: getNextMonthResetTime(),
        canRequest: quota.monthlyRequests < quota.monthlyLimit,
      });
    });
  });
}

/**
 * Manual reset function (for testing/debugging)
 */
async function resetRateLimitQuota() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([RATE_LIMIT_CONFIG.STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        logger.error(
          "Storage sync error during reset:",
          chrome.runtime.lastError,
        );
        resolve();
        return;
      }

      let quota = result[RATE_LIMIT_CONFIG.STORAGE_KEY];

      if (!quota) {
        logger.warn("No quota to reset");
        resolve();
        return;
      }

      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7);

      quota.monthlyRequests = 0;
      quota.lastResetMonth = currentMonth;

      chrome.storage.sync.set(
        { [RATE_LIMIT_CONFIG.STORAGE_KEY]: quota },
        () => {
          if (chrome.runtime.lastError) {
            logger.error("Failed to reset quota:", chrome.runtime.lastError);
          } else {
            logger.log("Rate limit quota manually reset");
          }
          resolve();
        },
      );
    });
  });
}

// Make functions available globally for popup.html
if (typeof window !== "undefined") {
  window.initializeRateLimit = initializeRateLimit;
  window.checkRateLimit = checkRateLimit;
  window.incrementRateLimitCounter = incrementRateLimitCounter;
  window.getRateLimitStatus = getRateLimitStatus;
  window.resetRateLimitQuota = resetRateLimitQuota;
}
