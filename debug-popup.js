/**
 * Simplified Debug Version of Popup.js
 * Use this to test basic settings functionality without security features
 */

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDebugPopup);

async function initializeDebugPopup() {
  console.log('Debug popup initializing...');
  
  // Add debug info
  addDebugInfo();
  
  // Load settings
  await loadSettingsDebug();
  
  // Setup event listeners
  setupEventListeners();
}

function addDebugInfo() {
  const debugDiv = document.createElement('div');
  debugDiv.id = 'debug-info';
  debugDiv.style.cssText = `
    background: #f0f0f0;
    padding: 10px;
    margin: 10px 0;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
  `;
  debugDiv.innerHTML = `
    <strong>Debug Info:</strong><br>
    Extension ID: ${chrome.runtime.id}<br>
    <div id="debug-messages"></div>
  `;
  
  // Insert at the top of the popup
  const firstTab = document.querySelector('.tab-content');
  if (firstTab) {
    firstTab.insertBefore(debugDiv, firstTab.firstChild);
  }
}

function debugLog(message) {
  console.log('[DEBUG]', message);
  const debugMessages = document.getElementById('debug-messages');
  if (debugMessages) {
    debugMessages.innerHTML += `${new Date().toLocaleTimeString()}: ${message}<br>`;
  }
}

async function loadSettingsDebug() {
  debugLog('Loading settings...');
  
  try {
    // Test direct storage access first
    const directResult = await chrome.storage.sync.get(['dailyBudget', 'tikkieLink']);
    debugLog(`Direct storage result: ${JSON.stringify(directResult)}`);
    
    // Test message-based access
    const response = await sendMessageDebug({ type: 'GET_SETTINGS' });
    debugLog(`Message response: ${JSON.stringify(response)}`);
    
    if (response && response.success) {
      const settings = response.settings;
      document.getElementById('daily-budget').value = settings.dailyBudget || 14;
      document.getElementById('tikkie-link').value = settings.tikkieLink || '';
      debugLog('Settings loaded successfully');
    } else {
      debugLog(`Settings load failed: ${response?.error || 'Unknown error'}`);
      // Load defaults
      document.getElementById('daily-budget').value = 14;
      document.getElementById('tikkie-link').value = '';
    }
  } catch (error) {
    debugLog(`Settings load error: ${error.message}`);
    console.error('Error loading settings:', error);
  }
}

async function saveSettingsDebug() {
  debugLog('Saving settings...');
  
  try {
    const dailyBudget = parseFloat(document.getElementById('daily-budget').value) || 14;
    const tikkieLink = document.getElementById('tikkie-link').value.trim();
    
    const settings = {
      dailyBudget: dailyBudget,
      tikkieLink: tikkieLink
    };
    
    debugLog(`Settings to save: ${JSON.stringify(settings)}`);
    
    // Test direct storage first
    try {
      await chrome.storage.sync.set(settings);
      debugLog('Direct storage save successful');
    } catch (directError) {
      debugLog(`Direct storage save failed: ${directError.message}`);
    }
    
    // Test message-based save
    const response = await sendMessageDebug({ type: 'UPDATE_SETTINGS', settings });
    debugLog(`Save response: ${JSON.stringify(response)}`);
    
    if (response && response.success) {
      updateStatusDebug('Settings saved successfully', 'success');
      debugLog('Settings saved via message successfully');
    } else {
      throw new Error(response?.error || 'Save failed');
    }
    
  } catch (error) {
    debugLog(`Save error: ${error.message}`);
    updateStatusDebug(`Save failed: ${error.message}`, 'error');
    console.error('Error saving settings:', error);
  }
}

function sendMessageDebug(message, timeout = 5000) {
  return new Promise((resolve, reject) => {
    debugLog(`Sending message: ${JSON.stringify(message)}`);
    
    const timeoutId = setTimeout(() => {
      debugLog('Message timeout');
      reject(new Error('Request timeout'));
    }, timeout);

    try {
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeoutId);
        
        if (chrome.runtime.lastError) {
          debugLog(`Chrome runtime error: ${chrome.runtime.lastError.message}`);
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          debugLog(`Message response received: ${JSON.stringify(response)}`);
          resolve(response);
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      debugLog(`Message send error: ${error.message}`);
      reject(error);
    }
  });
}

function updateStatusDebug(text, type = 'success') {
  debugLog(`Status: ${text} (${type})`);
  
  const indicator = document.getElementById('status-indicator');
  if (indicator) {
    const statusText = indicator.querySelector('.status-text');
    if (statusText) {
      statusText.textContent = text;
      
      // Remove existing status classes
      indicator.classList.remove('error', 'warning', 'loading');
      
      // Add new status class
      if (type !== 'success') {
        indicator.classList.add(type);
      }
    }
  }
}

function setupEventListeners() {
  // Save settings button
  const saveButton = document.getElementById('save-settings');
  if (saveButton) {
    saveButton.addEventListener('click', saveSettingsDebug);
    debugLog('Save button listener added');
  }
  
  // Reset settings button
  const resetButton = document.getElementById('reset-settings');
  if (resetButton) {
    resetButton.addEventListener('click', async () => {
      debugLog('Resetting settings...');
      document.getElementById('daily-budget').value = 14;
      document.getElementById('tikkie-link').value = '';
      await saveSettingsDebug();
    });
    debugLog('Reset button listener added');
  }
  
  // Add test buttons
  addTestButtons();
}

function addTestButtons() {
  const testDiv = document.createElement('div');
  testDiv.style.cssText = 'margin: 10px 0; padding: 10px; background: #e8f4f8; border-radius: 4px;';
  testDiv.innerHTML = `
    <strong>Debug Tests:</strong><br>
    <button id="test-storage" style="margin: 2px;">Test Storage</button>
    <button id="test-messages" style="margin: 2px;">Test Messages</button>
    <button id="clear-storage" style="margin: 2px;">Clear Storage</button>
  `;
  
  const debugInfo = document.getElementById('debug-info');
  if (debugInfo) {
    debugInfo.appendChild(testDiv);
  }
  
  // Test storage button
  document.getElementById('test-storage').addEventListener('click', async () => {
    debugLog('Testing storage...');
    try {
      await chrome.storage.sync.set({test: Date.now()});
      const result = await chrome.storage.sync.get(['test']);
      debugLog(`Storage test result: ${JSON.stringify(result)}`);
    } catch (error) {
      debugLog(`Storage test failed: ${error.message}`);
    }
  });
  
  // Test messages button
  document.getElementById('test-messages').addEventListener('click', async () => {
    debugLog('Testing messages...');
    try {
      const response = await sendMessageDebug({type: 'GET_SETTINGS'});
      debugLog(`Message test successful: ${JSON.stringify(response)}`);
    } catch (error) {
      debugLog(`Message test failed: ${error.message}`);
    }
  });
  
  // Clear storage button
  document.getElementById('clear-storage').addEventListener('click', async () => {
    debugLog('Clearing storage...');
    try {
      await chrome.storage.sync.clear();
      debugLog('Storage cleared');
      await loadSettingsDebug();
    } catch (error) {
      debugLog(`Clear storage failed: ${error.message}`);
    }
  });
}
