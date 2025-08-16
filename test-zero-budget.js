/**
 * Quick test script to verify zero budget handling
 * Run this in the popup console
 */

console.log('=== TESTING ZERO BUDGET FIX ===');

async function testZeroBudgetFlow() {
  console.log('\n--- Testing Zero Budget Complete Flow ---');
  
  try {
    // Step 1: Set budget to 0 in UI
    document.getElementById('daily-budget').value = '0';
    document.getElementById('tikkie-link').value = '';
    console.log('1. Set UI values - Budget: 0, Tikkie: empty');
    
    // Step 2: Test the parsing logic
    const dailyBudgetInput = document.getElementById('daily-budget').value;
    let dailyBudget;
    
    if (dailyBudgetInput === '' || dailyBudgetInput === null || dailyBudgetInput === undefined) {
      dailyBudget = 14;
    } else {
      dailyBudget = parseFloat(dailyBudgetInput);
      if (isNaN(dailyBudget) || dailyBudget < 0) {
        dailyBudget = 14;
      }
    }
    
    console.log('2. Parsing result - Input:', dailyBudgetInput, 'Parsed:', dailyBudget, 'Is zero:', dailyBudget === 0);
    
    // Step 3: Save settings
    const settings = { dailyBudget: dailyBudget, tikkieLink: '' };
    console.log('3. Settings to save:', settings);
    
    const saveResponse = await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings });
    console.log('4. Save response:', saveResponse);
    
    if (!saveResponse.success) {
      console.error('Save failed:', saveResponse.error);
      return false;
    }
    
    // Step 4: Retrieve settings to verify
    const getResponse = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    console.log('5. Retrieved settings:', getResponse);
    
    if (!getResponse.success) {
      console.error('Retrieve failed:', getResponse.error);
      return false;
    }
    
    const retrievedBudget = getResponse.settings.dailyBudget;
    console.log('6. Retrieved budget:', retrievedBudget, 'Type:', typeof retrievedBudget);
    
    // Step 5: Test direct storage access
    const directStorage = await chrome.storage.sync.get(['dailyBudget']);
    console.log('7. Direct storage result:', directStorage);
    
    // Step 6: Verify the value is exactly 0
    const isZero = retrievedBudget === 0;
    const isZeroStrict = retrievedBudget === 0 && typeof retrievedBudget === 'number';
    
    console.log('8. Verification:');
    console.log('   - Retrieved budget === 0:', isZero);
    console.log('   - Retrieved budget === 0 (strict):', isZeroStrict);
    console.log('   - Direct storage dailyBudget:', directStorage.dailyBudget);
    
    return isZeroStrict;
    
  } catch (error) {
    console.error('Test failed with error:', error);
    return false;
  }
}

async function testBackgroundStorageHandling() {
  console.log('\n--- Testing Background Storage Handling ---');
  
  try {
    // Test the background script's settings merging logic
    const testSettings = { dailyBudget: 0, tikkieLink: '' };
    
    console.log('Testing background script with zero budget...');
    const response = await chrome.runtime.sendMessage({ 
      type: 'UPDATE_SETTINGS', 
      settings: testSettings 
    });
    
    console.log('Background response:', response);
    
    // Check what's actually stored
    const stored = await chrome.storage.sync.get(['dailyBudget']);
    console.log('Actually stored in Chrome storage:', stored);
    
    return response.success && stored.dailyBudget === 0;
    
  } catch (error) {
    console.error('Background test failed:', error);
    return false;
  }
}

async function runZeroBudgetTests() {
  console.log('Starting zero budget tests...');
  
  const test1 = await testZeroBudgetFlow();
  const test2 = await testBackgroundStorageHandling();
  
  console.log('\n=== ZERO BUDGET TEST RESULTS ===');
  console.log('Test 1 (Complete Flow):', test1 ? 'PASS' : 'FAIL');
  console.log('Test 2 (Background Storage):', test2 ? 'PASS' : 'FAIL');
  
  if (test1 && test2) {
    console.log('🎉 Zero budget fix is working correctly!');
  } else {
    console.log('❌ Zero budget fix needs more work.');
    console.log('Next steps:');
    console.log('1. Check background script console for errors');
    console.log('2. Verify settings merging logic');
    console.log('3. Check content script receives correct values');
  }
  
  return { test1, test2 };
}

// Auto-run the tests
runZeroBudgetTests();
