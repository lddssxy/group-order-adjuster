/**
 * Background script for Group Order Splitter
 * Handles storage, communication between popup and content script
 */

// Import security manager
importScripts('security.js');

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
  try {
    // Validate extension context for security
    securityManager.validateExtensionContext();

    // Rate limiting for settings updates
    securityManager.checkRateLimit('settings_update', 10, 60000);

    // Create a copy of settings for processing
    const settingsToStore = { ...newSettings };

    // Validate and encrypt Tikkie link if present
    if (settingsToStore.tikkieLink !== undefined) {
      const validation = securityManager.validateTikkieUrl(settingsToStore.tikkieLink);

      if (!validation.valid) {
        securityManager.logSecurityEvent('invalid_tikkie_url_submitted', {
          error: validation.error
        });
        sendResponse({
          success: false,
          error: `Invalid Tikkie URL: ${validation.error}`
        });
        return;
      }

      // Encrypt the validated URL if not empty
      if (validation.url && validation.url.trim().length > 0) {
        try {
          const encryptedLink = await securityManager.encrypt(validation.url);
          settingsToStore.tikkieLink = `encrypted:${encryptedLink}`;

          securityManager.logSecurityEvent('tikkie_url_encrypted', {
            urlLength: validation.url.length
          });
        } catch (error) {
          console.error('Failed to encrypt Tikkie link:', error);
          securityManager.logSecurityEvent('tikkie_encryption_failed', {
            error: error.message
          });
          sendResponse({
            success: false,
            error: 'Failed to securely store Tikkie link'
          });
          return;
        }
      } else {
        // Empty URL, store as is
        settingsToStore.tikkieLink = '';
      }
    }

    // Store settings
    await chrome.storage.sync.set(settingsToStore);
    sendResponse({ success: true });

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
