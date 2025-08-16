# Settings Configuration Debug Guide

## Issues Identified

After analyzing the code, I've found several potential issues that could prevent settings from saving or loading properly:

### 1. **Security Manager Dependency Issue**
The background script imports `security.js` but there might be issues with:
- Security manager initialization
- Encryption/decryption failures
- Rate limiting blocking saves

### 2. **Missing Error Handling in Popup**
The popup might not be showing all error messages properly.

### 3. **Chrome Storage API Issues**
- Storage permissions
- Sync vs local storage conflicts
- Storage quota limits

## Debugging Steps

### Step 1: Check Chrome Extension Console

1. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/`
   - Find "Group Order Splitter"
   - Click "Details"

2. **Check Background Script Console**
   - Click "Inspect views: background page"
   - Look for errors in the console
   - Check for security manager errors

3. **Check Popup Console**
   - Right-click on extension icon → "Inspect popup"
   - Look for JavaScript errors
   - Check network tab for failed requests

### Step 2: Test Storage API Directly

Open the background script console and run:

```javascript
// Test basic storage
chrome.storage.sync.set({test: 'value'}, () => {
  console.log('Storage set result:', chrome.runtime.lastError);
});

chrome.storage.sync.get(['test'], (result) => {
  console.log('Storage get result:', result, chrome.runtime.lastError);
});

// Test settings storage
chrome.storage.sync.get(['dailyBudget', 'tikkieLink'], (result) => {
  console.log('Current settings:', result);
});
```

### Step 3: Test Message Passing

In popup console:

```javascript
// Test message to background
chrome.runtime.sendMessage({type: 'GET_SETTINGS'}, (response) => {
  console.log('GET_SETTINGS response:', response);
});

// Test settings update
chrome.runtime.sendMessage({
  type: 'UPDATE_SETTINGS', 
  settings: {dailyBudget: 15, tikkieLink: ''}
}, (response) => {
  console.log('UPDATE_SETTINGS response:', response);
});
```

### Step 4: Check Security Manager

In background console:

```javascript
// Check if security manager is loaded
console.log('Security manager:', typeof securityManager);

// Test security manager functions
try {
  securityManager.validateExtensionContext();
  console.log('Security validation passed');
} catch (error) {
  console.error('Security validation failed:', error);
}
```

## Common Issues and Solutions

### Issue 1: "securityManager is not defined"

**Symptoms**: Background script errors about securityManager
**Solution**: Check if security.js is loading properly

**Fix**: Add error handling in background.js:

```javascript
// Add at the top of background.js after importScripts
if (typeof securityManager === 'undefined') {
  console.error('Security manager failed to load');
  // Provide fallback functionality
}
```

### Issue 2: Storage Permission Denied

**Symptoms**: Chrome.runtime.lastError about storage permissions
**Solution**: Check manifest.json permissions

**Fix**: Ensure manifest.json has:
```json
"permissions": ["storage", "activeTab"]
```

### Issue 3: Rate Limiting Blocking Saves

**Symptoms**: "Rate limit exceeded" errors
**Solution**: Clear rate limiting data

**Fix**: In background console:
```javascript
localStorage.clear(); // Clear rate limiting data
```

### Issue 4: Encryption Failures

**Symptoms**: Tikkie link not saving, encryption errors
**Solution**: Test without Tikkie link first

**Fix**: Save settings with empty Tikkie link to isolate the issue

## Testing Procedure

### Test 1: Basic Settings Save/Load

1. Open extension popup
2. Change daily budget to 20
3. Leave Tikkie link empty
4. Click "Save Settings"
5. Close and reopen popup
6. Check if budget shows 20

### Test 2: Tikkie Link Encryption

1. Set daily budget to 15
2. Add Tikkie link: `https://tikkie.me/pay/test`
3. Save settings
4. Check background console for encryption logs
5. Reopen popup and verify link appears

### Test 3: Content Script Sync

1. Save settings in popup
2. Go to a Thuisbezorgd page
3. Open browser console on the page
4. Check if content script received settings:
   ```javascript
   console.log('Content script settings:', currentSettings);
   ```

## Quick Fixes to Try

### Fix 1: Add Debug Logging

Add this to popup.js saveSettings function:

```javascript
console.log('Attempting to save settings:', settings);
console.log('Response received:', response);
```

### Fix 2: Bypass Security for Testing

Temporarily modify background.js handleUpdateSettings:

```javascript
// Comment out security checks for testing
// securityManager.validateExtensionContext();
// securityManager.checkRateLimit('settings_update', 10, 60000);
```

### Fix 3: Use Local Storage Instead

Test with chrome.storage.local instead of sync:

```javascript
// In background.js, replace chrome.storage.sync with chrome.storage.local
await chrome.storage.local.set(settingsToStore);
```

## Expected Behavior

When working correctly:

1. **Save Settings**: Shows "Settings saved successfully" message
2. **Load Settings**: Values appear when reopening popup
3. **Content Script**: Receives updated settings automatically
4. **Background Console**: Shows successful storage operations
5. **No Errors**: No red errors in any console

## Immediate Fixes to Try

### Fix 1: Use Debug Scripts

I've created simplified debug versions of the scripts. Replace temporarily:

1. **Backup current files**:
   ```bash
   cp popup.js popup.js.backup
   cp background.js background.js.backup
   ```

2. **Use debug versions**:
   ```bash
   cp debug-popup.js popup.js
   cp debug-background.js background.js
   ```

3. **Reload extension** and test settings

### Fix 2: Check Security Manager Issues

The main issue is likely in the security manager. Add this to background.js:

```javascript
// Add error handling for security manager
let securityManager;
try {
  importScripts('security.js');
} catch (error) {
  console.error('Security manager failed to load:', error);
  // Create dummy security manager
  securityManager = {
    validateExtensionContext: () => {},
    checkRateLimit: () => true,
    encrypt: (data) => Promise.resolve(data),
    decrypt: (data) => Promise.resolve(data),
    logSecurityEvent: () => {}
  };
}
```

### Fix 3: Bypass Encryption Temporarily

In background.js handleUpdateSettings, comment out encryption:

```javascript
// Comment out this section temporarily
/*
if (validation.url && validation.url.trim().length > 0) {
  try {
    const encryptedLink = await securityManager.encrypt(validation.url);
    settingsToStore.tikkieLink = `encrypted:${encryptedLink}`;
  } catch (error) {
    // ... encryption error handling
  }
} else {
  settingsToStore.tikkieLink = '';
}
*/

// Replace with simple storage
settingsToStore.tikkieLink = newSettings.tikkieLink || '';
```

### Fix 4: Add Comprehensive Error Logging

Add this to popup.js saveSettings function:

```javascript
async function saveSettings() {
  console.log('=== SAVE SETTINGS DEBUG ===');

  try {
    const dailyBudget = parseFloat(document.getElementById('daily-budget').value) || 14;
    const tikkieLink = document.getElementById('tikkie-link').value.trim();

    const settings = { dailyBudget, tikkieLink };
    console.log('1. Settings to save:', settings);

    // Test direct storage first
    try {
      await chrome.storage.sync.set(settings);
      console.log('2. Direct storage successful');
    } catch (directError) {
      console.error('2. Direct storage failed:', directError);
    }

    // Test message-based save
    console.log('3. Sending message to background...');
    const response = await sendMessage({ type: 'UPDATE_SETTINGS', settings });
    console.log('4. Background response:', response);

    if (response && response.success) {
      updateStatus('Settings saved successfully', 'success');
      console.log('5. Save completed successfully');
    } else {
      throw new Error(response?.error || 'Unknown error');
    }

  } catch (error) {
    console.error('=== SAVE FAILED ===', error);
    updateStatus(`Save failed: ${error.message}`, 'error');
  }
}
```

## Step-by-Step Troubleshooting

### Step 1: Quick Test
1. Open extension popup
2. Open browser console (F12)
3. Try saving settings
4. Check for any red errors

### Step 2: Background Script Check
1. Go to `chrome://extensions/`
2. Find your extension, click "Details"
3. Click "Inspect views: background page"
4. Check console for errors
5. Try this command:
   ```javascript
   chrome.storage.sync.get(null, (result) => console.log('All storage:', result));
   ```

### Step 3: Use Debug Version
1. Replace popup.js with debug-popup.js
2. Replace background.js with debug-background.js
3. Reload extension
4. Test settings - debug info will show in popup

### Step 4: Manual Storage Test
In background console:
```javascript
// Test manual save
chrome.storage.sync.set({dailyBudget: 25, tikkieLink: 'test'}, () => {
  console.log('Manual save result:', chrome.runtime.lastError);
});

// Test manual load
chrome.storage.sync.get(['dailyBudget', 'tikkieLink'], (result) => {
  console.log('Manual load result:', result, chrome.runtime.lastError);
});
```

## Most Likely Issues and Solutions

### Issue 1: Security Manager Not Loading
**Symptoms**: "securityManager is not defined" errors
**Solution**: Use Fix 2 above to add error handling

### Issue 2: Storage Permission Issues
**Symptoms**: "Cannot access chrome.storage" errors
**Solution**: Check manifest.json has `"permissions": ["storage"]`

### Issue 3: Message Passing Failures
**Symptoms**: Timeout errors, no response from background
**Solution**: Use debug scripts to isolate the issue

### Issue 4: Encryption Failures
**Symptoms**: Tikkie link not saving, crypto errors
**Solution**: Use Fix 3 to bypass encryption temporarily

## Next Steps

If issues persist after these tests:

1. **Check Chrome Version**: Ensure using Chrome 88+ for Manifest V3
2. **Reinstall Extension**: Remove and reload the extension
3. **Check Storage Quota**: Verify Chrome storage limits
4. **Test in Incognito**: Rule out profile-specific issues
5. **Contact Support**: Provide console logs and error messages
