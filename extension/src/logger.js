// Logging utility for ClickRemix extension
// In production builds, this flag is set to false to disable verbose logging
const DEBUG_MODE = true; // Will be replaced during build

const logger = {
  // Debug logs - only shown in development
  log: (...args) => {
    if (DEBUG_MODE) {
      console.log(...args);
    }
  },

  // Warnings - only shown in development
  warn: (...args) => {
    if (DEBUG_MODE) {
      console.warn(...args);
    }
  },

  // Errors - always shown (critical for debugging user issues)
  error: (...args) => {
    console.error(...args);
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = logger;
}
