/**
 * Popup script for Group Order Splitter
 * Handles user interface and communication with background script
 */

document.addEventListener('DOMContentLoaded', async () => {
  await initializePopup();
  setupEventListeners();
  await loadSettings();
  await checkCurrentTab();
});

// Initialize popup interface
async function initializePopup() {
  console.log('Initializing popup...');
  updateStatus('Ready', 'success');
}

// Setup event listeners
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', (e) => {
      switchTab(e.target.dataset.tab);
    });
  });

  // Splitter actions
  document.getElementById('calculate-button').addEventListener('click', triggerCalculation);
  document.getElementById('refresh-button').addEventListener('click', refreshPageData);

  // Breakdown toggle
  document.getElementById('breakdown-toggle').addEventListener('click', toggleBreakdown);

  // Tikkie copy button
  document.getElementById('copy-tikkie-button').addEventListener('click', copyTikkieMessage);

  // Settings actions
  document.getElementById('save-settings').addEventListener('click', saveSettings);
  document.getElementById('reset-settings').addEventListener('click', resetSettings);
}

// Switch between tabs
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(tabName).classList.add('active');
}

// Load settings from storage
async function loadSettings() {
  try {
    const response = await sendMessage({ type: 'GET_SETTINGS' });
    if (response.success) {
      const settings = response.settings;
      document.getElementById('daily-budget').value = settings.dailyBudget;
      document.getElementById('tikkie-link').value = settings.tikkieLink || '';
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save settings to storage with security validation
async function saveSettings() {
  try {
    const tikkieInput = document.getElementById('tikkie-link');
    const tikkieValue = tikkieInput.value.trim();

    // Client-side validation of Tikkie URL before sending
    if (tikkieValue) {
      // Basic validation
      if (!tikkieValue.startsWith('https://')) {
        showError('Tikkie URL must use HTTPS for security', 'security');
        tikkieInput.focus();
        return;
      }

      if (!tikkieValue.includes('tikkie.me')) {
        showError('Only official Tikkie URLs (tikkie.me) are allowed', 'security');
        tikkieInput.focus();
        return;
      }

      // Check for suspicious patterns
      const suspiciousPatterns = [
        /javascript:/i,
        /data:/i,
        /<script/i,
        /onload=/i,
        /eval\(/i
      ];

      if (suspiciousPatterns.some(pattern => pattern.test(tikkieValue))) {
        showError('URL contains suspicious content and cannot be saved', 'security');
        tikkieInput.focus();
        return;
      }
    }

    const dailyBudgetInput = document.getElementById('daily-budget').value;
    let dailyBudget;

    if (dailyBudgetInput === '' || dailyBudgetInput === null || dailyBudgetInput === undefined) {
      dailyBudget = 14; // Use default only for truly empty values
    } else {
      dailyBudget = parseFloat(dailyBudgetInput);
      // Validate that it's a valid number
      if (isNaN(dailyBudget) || dailyBudget < 0) {
        dailyBudget = 14; // Use default for invalid values
      }
    }

    const settings = {
      dailyBudget: dailyBudget,
      tikkieLink: tikkieValue
    };

    const response = await sendMessage({ type: 'UPDATE_SETTINGS', settings });

    if (response && response.success) {
      updateStatus('Settings saved successfully', 'success');
      setTimeout(() => updateStatus('Ready', 'success'), 2000);
    } else {
      throw new Error(response?.error || 'Unknown error from background script');
    }
  } catch (error) {
    console.error('Error saving settings:', error);

    // Show specific error message if it's a security-related error
    if (error.message.includes('Invalid Tikkie URL') ||
        error.message.includes('Rate limit') ||
        error.message.includes('securely store')) {
      showError(error.message, 'security');
    } else {
      showError('Failed to save settings: ' + error.message, 'general');
    }

    updateStatus('Failed to save settings', 'error');
  }
}

// Reset settings to defaults
async function resetSettings() {
  document.getElementById('daily-budget').value = 14;
  document.getElementById('tikkie-link').value = '';
  await saveSettings();
}

// Check if current tab is a valid order page
async function checkCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('thuisbezorgd.nl')) {
      if (tab.url.includes('foodtracker') || tab.url.includes('order-confirmation')) {
        updateStatus('Order page detected', 'success');
        document.getElementById('calculate-button').disabled = false;
        document.getElementById('refresh-button').disabled = false;
      } else {
        updateStatus('Navigate to an order page to use splitter', 'warning');
        document.getElementById('calculate-button').disabled = true;
        document.getElementById('refresh-button').disabled = true;
      }
    } else {
      updateStatus('Please visit Thuisbezorgd.nl order page', 'warning');
      document.getElementById('calculate-button').disabled = true;
      document.getElementById('refresh-button').disabled = true;
    }
  } catch (error) {
    console.error('Error checking current tab:', error);
    updateStatus('Unable to detect page', 'error');
  }
}

// Trigger calculation on current tab
async function triggerCalculation() {
  try {
    // Validate extension environment first
    validateExtensionEnvironment();

    updateStatus('Calculating...', 'loading');
    hideResults();
    hideError();

    // Get current tab with validation
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error('No active tab found');
    }

    if (!tab.url || !tab.url.includes('thuisbezorgd.nl')) {
      showError('Please navigate to a Thuisbezorgd.nl order page first', 'parsing');
      updateStatus('Wrong page', 'error');
      return;
    }

    // Send message to content script with enhanced error handling
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_CALCULATION' });

    if (response && response.success) {
      displayResults(response.results, response.breakdown, response.withinBudget, response.orderCreator);
      updateStatus('Calculation complete', 'success');
    } else {
      const errorMsg = response?.error || 'Calculation failed';

      // Categorize error for better user guidance
      let category = 'calculation';
      if (errorMsg.includes('parse') || errorMsg.includes('not a valid order page')) {
        category = 'parsing';
      } else if (errorMsg.includes('connection') || errorMsg.includes('network')) {
        category = 'network';
      }

      showError(errorMsg, category);
      updateStatus('Calculation failed', 'error');
    }

  } catch (error) {
    console.error('Error triggering calculation:', error);

    // Enhanced error categorization
    let category = 'general';
    let message = error.message || 'Failed to calculate order distribution';

    if (error.message && (
      error.message.includes('Could not establish connection') ||
      error.message.includes('Receiving end does not exist') ||
      error.message.includes('Extension context invalidated') ||
      error.message.includes('connection lost')
    )) {
      category = 'connection';
      message = 'Connection to page lost. Please refresh the page and try again.';
    } else if (error.message && error.message.includes('timeout')) {
      category = 'network';
      message = 'Request timed out. Please check your connection and try again.';
    } else if (error.message && error.message.includes('No active tab')) {
      category = 'general';
      message = 'No active browser tab found. Please ensure you have a tab open.';
    }

    showError(message, category);
    updateStatus('Calculation failed', 'error');
  }
}

// Refresh page data
async function refreshPageData() {
  try {
    updateStatus('Refreshing page...', 'loading');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.reload(tab.id);
    updateStatus('Page refreshed', 'success');
    setTimeout(() => updateStatus('Ready', 'success'), 2000);
  } catch (error) {
    console.error('Error refreshing page:', error);
    updateStatus('Failed to refresh page', 'error');
  }
}

// Display calculation results
function displayResults(results, breakdown, withinBudget = false, orderCreator = null) {
  const resultsSection = document.getElementById('results-section');

  // Store breakdown data for toggle
  if (breakdown) {
    document.getElementById('breakdown-content').innerHTML = createBreakdownHTML(breakdown);
  }

  // Show Tikkie payment section if there are payments to collect
  const hasPaymentObligations = Object.keys(results).length > 0 && !withinBudget;
  if (hasPaymentObligations) {
    showTikkieSection(results, orderCreator);
  } else {
    hideTikkieSection();
  }

  resultsSection.style.display = 'block';
}

// Create breakdown HTML
function createBreakdownHTML(breakdown) {
  return `
    <div class="breakdown-row">
      <span>Order Subtotal:</span>
      <span>€${breakdown.orderSubtotal.toFixed(2)}</span>
    </div>
    <div class="breakdown-row">
      <span>Delivery Fee:</span>
      <span>€${breakdown.delivery.toFixed(2)}</span>
    </div>
    <div class="breakdown-row">
      <span>Service Fee:</span>
      <span>€${breakdown.service.toFixed(2)}</span>
    </div>
    <div class="breakdown-row">
      <span>Discount:</span>
      <span>€${breakdown.discount.toFixed(2)}</span>
    </div>
    <div class="breakdown-row total">
      <span>Grand Total:</span>
      <span>€${breakdown.grandTotal.toFixed(2)}</span>
    </div>
    <div class="breakdown-row">
      <span>Total Budget (${breakdown.participantCount} people):</span>
      <span>€${breakdown.totalBudget.toFixed(2)}</span>
    </div>
    <div class="breakdown-row total">
      <span>Extra Amount:</span>
      <span>€${Math.max(0, breakdown.grandTotal - breakdown.totalBudget).toFixed(2)}</span>
    </div>
  `;
}

// Show Tikkie payment section
async function showTikkieSection(results, orderCreator) {
  const tikkieSection = document.getElementById('tikkie-section');
  const tikkieMessage = document.getElementById('tikkie-message');

  // Get Tikkie link from settings
  const settings = await getSettings();
  const tikkieLink = settings.tikkieLink || '';

  // Generate payment message
  const message = generateTikkieMessage(results, orderCreator, tikkieLink);
  tikkieMessage.value = message;

  tikkieSection.style.display = 'block';
}

// Hide Tikkie payment section
function hideTikkieSection() {
  const tikkieSection = document.getElementById('tikkie-section');
  tikkieSection.style.display = 'none';
}

// Generate Tikkie payment message
function generateTikkieMessage(results, orderCreator, tikkieLink) {
  const paymentList = [];
  let totalAmount = 0;

  // Collect payment information
  Object.entries(results).forEach(([name, details]) => {
    if (details.status === 'pays' && details.finalPayment > 0) {
      paymentList.push({
        name: name,
        amount: details.finalPayment
      });
      totalAmount += details.finalPayment;
    }
  });

  if (paymentList.length === 0) {
    return 'No payments required for this order.';
  }

  // Build message
  let message = '💳 Payment Request for Group Order\n\n';

  if (tikkieLink) {
    message += `Please transfer your share to: ${tikkieLink}\n\n`;
  } else {
    message += 'Please transfer your share using the payment details below:\n\n';
  }

  message += 'Payment breakdown:\n';
  paymentList.forEach(payment => {
    message += `• ${payment.name}: €${payment.amount.toFixed(2)}\n`;
  });

  message += `\nTotal to collect: €${totalAmount.toFixed(2)}`;

  if (orderCreator) {
    message += `\nPayments to: ${orderCreator}`;
  }

  message += '\n\nThank you!';

  return message;
}

// Toggle breakdown visibility
function toggleBreakdown() {
  const breakdownSection = document.getElementById('breakdown-section');
  const toggleButton = document.getElementById('breakdown-toggle');

  if (!breakdownSection || !toggleButton) {
    console.error('Breakdown elements not found');
    return;
  }

  // Check current visibility (handle both style.display and computed style)
  const isHidden = breakdownSection.style.display === 'none' ||
                   window.getComputedStyle(breakdownSection).display === 'none';

  if (isHidden) {
    breakdownSection.style.display = 'block';
    toggleButton.textContent = 'Hide Calculation Details';
  } else {
    breakdownSection.style.display = 'none';
    toggleButton.textContent = 'Show Calculation Details';
  }
}

// Show error message
function showError(message) {
  const errorSection = document.getElementById('error-section');
  const errorMessage = document.getElementById('error-message');
  
  errorMessage.textContent = message;
  errorSection.style.display = 'block';
}

// Hide error message
function hideError() {
  document.getElementById('error-section').style.display = 'none';
}

// Hide results
function hideResults() {
  document.getElementById('results-section').style.display = 'none';
}

// Update status indicator
function updateStatus(text, type = 'success') {
  const indicator = document.getElementById('status-indicator');
  const statusText = indicator.querySelector('.status-text');
  
  statusText.textContent = text;
  
  // Remove existing status classes
  indicator.classList.remove('error', 'warning', 'loading');
  
  // Add new status class
  if (type !== 'success') {
    indicator.classList.add(type);
  }
}

// Get settings from storage
async function getSettings() {
  try {
    const response = await sendMessage({ type: 'GET_SETTINGS' });
    if (response.success) {
      return response.settings;
    }
    return {};
  } catch (error) {
    console.error('Error getting settings:', error);
    return {};
  }
}

// Copy Tikkie message to clipboard
async function copyTikkieMessage() {
  const tikkieMessage = document.getElementById('tikkie-message');
  const copyButton = document.getElementById('copy-tikkie-button');

  try {
    await navigator.clipboard.writeText(tikkieMessage.value);

    // Update button to show success
    const originalHTML = copyButton.innerHTML;
    copyButton.innerHTML = '<span class="button-icon">✅</span> Copied!';
    copyButton.classList.add('copied');

    setTimeout(() => {
      copyButton.innerHTML = originalHTML;
      copyButton.classList.remove('copied');
    }, 2000);

  } catch (error) {
    console.error('Failed to copy message:', error);

    // Fallback: select text for manual copy
    tikkieMessage.select();
    tikkieMessage.setSelectionRange(0, 99999); // For mobile devices

    // Update button to show fallback
    const originalHTML = copyButton.innerHTML;
    copyButton.innerHTML = '<span class="button-icon">📋</span> Text Selected';

    setTimeout(() => {
      copyButton.innerHTML = originalHTML;
    }, 2000);
  }
}

// Send message to background script with enhanced error handling
function sendMessage(message, timeout = 5000) {
  return new Promise((resolve, reject) => {
    // Set up timeout
    const timeoutId = setTimeout(() => {
      reject(new Error('Request timeout - extension may need to be reloaded'));
    }, timeout);

    try {
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeoutId);

        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError.message;

          // Provide user-friendly error messages
          if (error.includes('Could not establish connection') ||
              error.includes('Receiving end does not exist')) {
            reject(new Error('Extension connection lost. Please refresh the page and try again.'));
          } else if (error.includes('Extension context invalidated')) {
            reject(new Error('Extension was reloaded. Please refresh the page.'));
          } else {
            reject(new Error(`Extension error: ${error}`));
          }
        } else if (!response) {
          reject(new Error('No response from extension background script'));
        } else if (response.success === false) {
          reject(new Error(response.error || 'Unknown error occurred'));
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to send message: ${error.message}`));
    }
  });
}

// Validate extension environment
function validateExtensionEnvironment() {
  if (!chrome || !chrome.runtime) {
    throw new Error('Chrome extension APIs not available');
  }

  if (!chrome.runtime.id) {
    throw new Error('Extension context is invalid - please reload the extension');
  }
}

// Enhanced error display with categorization
function showError(message, category = 'general') {
  const errorSection = document.getElementById('error-section');
  const errorMessage = document.getElementById('error-message');

  // Categorize errors and provide helpful context
  let displayMessage = message;
  let helpText = '';

  switch (category) {
    case 'connection':
      helpText = ' Try refreshing the page or reloading the extension.';
      break;
    case 'parsing':
      helpText = ' Make sure you are on a valid Thuisbezorgd order page.';
      break;
    case 'calculation':
      helpText = ' Check that all order data is loaded correctly.';
      break;
    case 'network':
      helpText = ' Check your internet connection and try again.';
      break;
  }

  errorMessage.innerHTML = `
    <div style="margin-bottom: 8px;">${displayMessage}</div>
    ${helpText ? `<div style="font-size: 12px; color: #666;">${helpText}</div>` : ''}
  `;

  errorSection.style.display = 'block';

  // Auto-hide error after 10 seconds for non-critical errors
  if (category !== 'connection' && category !== 'parsing') {
    setTimeout(() => {
      hideError();
    }, 10000);
  }
}
