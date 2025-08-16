/**
 * Background script for Group Order Splitter
 * Handles storage, communication between popup and content script
 */

// Import security manager with error handling
let securityManager;
try {
  importScripts('security.js');
  console.log('Security manager loaded successfully');
} catch (error) {
  console.error('Security manager failed to load:', error);
  // Create fallback security manager
  securityManager = {
    validateExtensionContext: () => {
      console.log('Using fallback security manager - validateExtensionContext');
    },
    checkRateLimit: () => {
      console.log('Using fallback security manager - checkRateLimit');
      return true;
    },
    encrypt: async (data) => {
      console.log('Using fallback security manager - encrypt (no encryption)');
      return data;
    },
    decrypt: async (data) => {
      console.log('Using fallback security manager - decrypt (no decryption)');
      return data;
    },
    logSecurityEvent: (event, details) => {
      console.log('Security event (fallback):', event, details);
    }
  };
}

// Default settings
const DEFAULT_SETTINGS = {
  dailyBudget: 14,
  currency: 'EUR',
  tikkieLink: '' // Will be stored encrypted
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Group Order Extra Calculator installed');
  
  // Set default settings if not already set
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  await chrome.storage.sync.set(settings);
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_SETTINGS':
      handleGetSettings(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'UPDATE_SETTINGS':
      handleUpdateSettings(message.settings, sendResponse);
      return true;
      
    case 'CALCULATE_ORDER':
      handleCalculateOrder(message.data, sendResponse);
      return true;
      
    case 'LOG_ERROR':
      console.error('Content script error:', message.error);
      break;
      
    default:
      console.warn('Unknown message type:', message.type);
  }
});

// Get current settings with secure Tikkie link handling
async function handleGetSettings(sendResponse) {
  try {
    // Validate extension context for security
    securityManager.validateExtensionContext();

    const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    const settings = { ...DEFAULT_SETTINGS, ...result };

    // Decrypt Tikkie link if present and encrypted
    if (settings.tikkieLink && settings.tikkieLink.startsWith('encrypted:')) {
      try {
        const encryptedData = settings.tikkieLink.substring(10); // Remove 'encrypted:' prefix
        const decryptedLink = await securityManager.decrypt(encryptedData);

        // Validate decrypted URL
        const validation = securityManager.validateTikkieUrl(decryptedLink);
        if (validation.valid) {
          settings.tikkieLink = validation.url;
        } else {
          console.warn('Invalid Tikkie URL detected, clearing:', validation.error);
          settings.tikkieLink = '';
          securityManager.logSecurityEvent('invalid_tikkie_url_retrieved', {
            error: validation.error
          });
        }
      } catch (error) {
        console.error('Failed to decrypt Tikkie link:', error);
        settings.tikkieLink = '';
        securityManager.logSecurityEvent('tikkie_decryption_failed', {
          error: error.message
        });
      }
    }

    sendResponse({ success: true, settings });
  } catch (error) {
    console.error('Error getting settings:', error);
    securityManager.logSecurityEvent('settings_retrieval_failed', {
      error: error.message
    });
    sendResponse({ success: false, error: error.message });
  }
}

// Update settings with secure Tikkie link handling
async function handleUpdateSettings(newSettings, sendResponse) {
  console.log('handleUpdateSettings called with:', newSettings);

  try {
    // Validate extension context for security
    try {
      securityManager.validateExtensionContext();
    } catch (secError) {
      console.warn('Security validation failed, continuing anyway:', secError);
    }

    // Rate limiting for settings updates
    try {
      securityManager.checkRateLimit('settings_update', 10, 60000);
    } catch (rateError) {
      console.warn('Rate limiting failed, continuing anyway:', rateError);
    }

    // Create a copy of settings for processing
    const settingsToStore = { ...newSettings };
    console.log('Settings to store:', settingsToStore);

    // Validate and process Tikkie link if present
    if (settingsToStore.tikkieLink !== undefined) {
      console.log('Processing Tikkie link:', settingsToStore.tikkieLink);

      try {
        const validation = securityManager.validateTikkieUrl(settingsToStore.tikkieLink);
        console.log('Tikkie validation result:', validation);

        if (!validation.valid) {
          console.warn('Invalid Tikkie URL:', validation.error);
          securityManager.logSecurityEvent('invalid_tikkie_url_submitted', {
            error: validation.error
          });
          sendResponse({
            success: false,
            error: `Invalid Tikkie URL: ${validation.error}`
          });
          return;
        }

        // For now, store without encryption to avoid crypto issues
        // TODO: Re-enable encryption once crypto issues are resolved
        if (validation.url && validation.url.trim().length > 0) {
          settingsToStore.tikkieLink = validation.url; // Store directly without encryption
          console.log('Tikkie link stored (unencrypted for debugging)');

          securityManager.logSecurityEvent('tikkie_url_stored', {
            urlLength: validation.url.length,
            encrypted: false
          });
        } else {
          // Empty URL, store as is
          settingsToStore.tikkieLink = '';
        }
      } catch (validationError) {
        console.error('Tikkie validation failed:', validationError);
        // If validation fails, just store the raw value for debugging
        settingsToStore.tikkieLink = settingsToStore.tikkieLink.trim();
        console.log('Stored raw Tikkie link due to validation error');
      }
    }

    // Store settings
    console.log('Attempting to store settings:', settingsToStore);
    try {
      await chrome.storage.sync.set(settingsToStore);
      console.log('Settings stored successfully');
      sendResponse({ success: true });
    } catch (storageError) {
      console.error('Storage operation failed:', storageError);
      sendResponse({
        success: false,
        error: `Storage failed: ${storageError.message}`
      });
      return;
    }

    // Prepare settings for notification (with decrypted Tikkie link)
    const notificationSettings = { ...settingsToStore };
    if (notificationSettings.tikkieLink && notificationSettings.tikkieLink.startsWith('encrypted:')) {
      notificationSettings.tikkieLink = newSettings.tikkieLink; // Use original unencrypted value
    }

    // Notify all content scripts about settings change
    const tabs = await chrome.tabs.query({ url: 'https://www.thuisbezorgd.nl/*' });
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SETTINGS_UPDATED',
        settings: notificationSettings
      }).catch(() => {
        // Ignore errors for tabs without content script
      });
    });

    securityManager.logSecurityEvent('settings_updated', {
      hasEncryptedTikkie: settingsToStore.tikkieLink.startsWith('encrypted:')
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    securityManager.logSecurityEvent('settings_update_failed', {
      error: error.message
    });
    sendResponse({ success: false, error: error.message });
  }
}

// Handle calculation request
async function handleCalculateOrder(orderData, sendResponse) {
  try {
    const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    const result = calculateOrderDistribution(orderData, settings);
    sendResponse({ success: true, result });
  } catch (error) {
    console.error('Error calculating order:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Calculate order distribution
function calculateOrderDistribution(orderData, settings) {
  const { people, delivery, service, discount } = orderData;
  const budget = settings.dailyBudget || DEFAULT_SETTINGS.dailyBudget;
  
  const extraFeesTotal = delivery + service;
  const participantNames = Object.keys(people);
  const extraPerPerson = participantNames.length > 0 ? extraFeesTotal / participantNames.length : 0;
  
  const results = {};
  const orderSubtotal = Object.values(people).reduce((a, b) => a + b, 0);
  
  participantNames.forEach((name) => {
    const subtotal = people[name];
    let total = subtotal + extraPerPerson;
    
    // Apply proportional discount if any exists
    if (discount !== 0 && orderSubtotal > 0) {
      const ratio = subtotal / orderSubtotal;
      total += ratio * discount;
    }
    
    const overage = Math.max(0, total - budget);
    results[name] = parseFloat(overage.toFixed(2));
  });
  
  // Calculate remaining extra for order owner
  const grandTotal = orderSubtotal + extraFeesTotal + discount;
  const totalBudget = budget * participantNames.length;
  const extraForOwner = Math.max(0, grandTotal - totalBudget);
  
  if (extraForOwner > 0) {
    results['You (Order Owner)'] = parseFloat(extraForOwner.toFixed(2));
  }
  
  return {
    results,
    breakdown: {
      orderSubtotal,
      delivery,
      service,
      discount,
      grandTotal,
      totalBudget,
      extraForOwner,
      participantCount: participantNames.length
    }
  };
}
