/**
 * Simplified Debug Version of Background Script
 * Use this to test basic functionality without security features
 */

console.log('Debug background script loading...');

// Simple default settings without security features
const DEFAULT_SETTINGS = {
  dailyBudget: 14,
  currency: 'EUR',
  tikkieLink: ''
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Debug: Extension installed');
  
  try {
    // Set default settings if not already set
    const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    console.log('Debug: Current settings on install:', settings);
    
    // Merge with defaults
    const mergedSettings = { ...DEFAULT_SETTINGS, ...settings };
    await chrome.storage.sync.set(mergedSettings);
    console.log('Debug: Default settings set:', mergedSettings);
  } catch (error) {
    console.error('Debug: Error setting default settings:', error);
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Debug: Received message:', message);
  
  switch (message.type) {
    case 'GET_SETTINGS':
      handleGetSettingsDebug(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'UPDATE_SETTINGS':
      handleUpdateSettingsDebug(message.settings, sendResponse);
      return true;
      
    case 'CALCULATE_ORDER':
      handleCalculateOrderDebug(message.data, sendResponse);
      return true;
      
    case 'LOG_ERROR':
      console.error('Debug: Content script error:', message.error);
      break;
      
    default:
      console.warn('Debug: Unknown message type:', message.type);
  }
});

// Simplified settings getter
async function handleGetSettingsDebug(sendResponse) {
  console.log('Debug: Getting settings...');
  
  try {
    const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    console.log('Debug: Raw storage result:', result);
    
    const settings = { ...DEFAULT_SETTINGS, ...result };
    console.log('Debug: Merged settings:', settings);
    
    sendResponse({ success: true, settings });
  } catch (error) {
    console.error('Debug: Error getting settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Simplified settings updater
async function handleUpdateSettingsDebug(newSettings, sendResponse) {
  console.log('Debug: Updating settings:', newSettings);
  
  try {
    // Validate settings
    if (typeof newSettings !== 'object' || newSettings === null) {
      throw new Error('Invalid settings object');
    }
    
    // Validate daily budget
    if (newSettings.dailyBudget !== undefined) {
      const budget = parseFloat(newSettings.dailyBudget);
      if (isNaN(budget) || budget < 0) {
        throw new Error('Invalid daily budget');
      }
      newSettings.dailyBudget = budget;
    }
    
    // Validate Tikkie link
    if (newSettings.tikkieLink !== undefined) {
      const link = newSettings.tikkieLink.trim();
      if (link && !isValidTikkieUrl(link)) {
        throw new Error('Invalid Tikkie URL format');
      }
      newSettings.tikkieLink = link;
    }
    
    // Store settings directly (no encryption for debugging)
    await chrome.storage.sync.set(newSettings);
    console.log('Debug: Settings stored successfully');
    
    sendResponse({ success: true });
    
    // Notify content scripts about settings change
    try {
      const tabs = await chrome.tabs.query({ url: 'https://www.thuisbezorgd.nl/*' });
      console.log('Debug: Notifying tabs:', tabs.length);
      
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_UPDATED',
          settings: newSettings
        }).catch((error) => {
          console.log('Debug: Tab notification failed (expected for tabs without content script):', error.message);
        });
      });
    } catch (error) {
      console.warn('Debug: Error notifying tabs:', error);
    }
    
  } catch (error) {
    console.error('Debug: Error updating settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Simple Tikkie URL validation
function isValidTikkieUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'tikkie.me' && urlObj.pathname.startsWith('/pay/');
  } catch {
    return false;
  }
}

// Simplified calculation handler
async function handleCalculateOrderDebug(orderData, sendResponse) {
  console.log('Debug: Calculating order:', orderData);
  
  try {
    const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    console.log('Debug: Using settings for calculation:', settings);
    
    // Simple calculation (you can replace this with your actual calculation logic)
    const result = {
      message: 'Debug calculation completed',
      settings: settings,
      orderData: orderData
    };
    
    sendResponse({ success: true, result });
  } catch (error) {
    console.error('Debug: Error calculating order:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Test storage functionality on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Debug: Extension startup');
  await testStorageFunctionality();
});

// Also test when background script loads
testStorageFunctionality();

async function testStorageFunctionality() {
  console.log('Debug: Testing storage functionality...');
  
  try {
    // Test basic storage
    const testKey = 'debug_test_' + Date.now();
    const testValue = { test: true, timestamp: Date.now() };
    
    await chrome.storage.sync.set({ [testKey]: testValue });
    console.log('Debug: Test storage set successful');
    
    const result = await chrome.storage.sync.get([testKey]);
    console.log('Debug: Test storage get result:', result);
    
    // Clean up test data
    await chrome.storage.sync.remove([testKey]);
    console.log('Debug: Test storage cleanup successful');
    
    // Test settings storage
    const currentSettings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    console.log('Debug: Current settings in storage:', currentSettings);
    
  } catch (error) {
    console.error('Debug: Storage test failed:', error);
  }
}

// Log all storage changes for debugging
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Debug: Storage changed in', namespace, ':', changes);
});

console.log('Debug background script loaded successfully');
