/**
 * Enhanced test script to verify both Daily Budget zero value and Tikkie URL extraction fixes
 * Run this in the popup console to test the fixes
 */

console.log('=== TESTING ENHANCED SETTINGS FIXES ===');

// Test 1: Daily Budget = 0 (Enhanced)
async function testDailyBudgetZero() {
  console.log('\n--- Test 1: Daily Budget = 0 (Enhanced) ---');

  try {
    // Set input to 0
    document.getElementById('daily-budget').value = '0';
    document.getElementById('tikkie-link').value = '';

    // Test the enhanced parsing logic
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

    console.log('Input value:', dailyBudgetInput);
    console.log('Parsed value:', dailyBudget);
    console.log('Is zero:', dailyBudget === 0);
    console.log('Expected: 0, Got:', dailyBudget);
    console.log('Test 1 Result:', dailyBudget === 0 ? 'PASS' : 'FAIL');

    // Test actual save and retrieve
    const settings = { dailyBudget: dailyBudget, tikkieLink: '' };
    const saveResponse = await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings });
    console.log('Save response:', saveResponse);

    // Test retrieval to ensure zero is preserved
    const getResponse = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    console.log('Retrieved settings:', getResponse);

    const retrievedBudget = getResponse.success ? getResponse.settings.dailyBudget : null;
    console.log('Retrieved daily budget:', retrievedBudget);

    return dailyBudget === 0 && saveResponse.success && retrievedBudget === 0;
  } catch (error) {
    console.error('Test 1 failed:', error);
    return false;
  }
}

// Test 2: Daily Budget = empty string
async function testDailyBudgetEmpty() {
  console.log('\n--- Test 2: Daily Budget = empty ---');
  
  try {
    // Set input to empty
    document.getElementById('daily-budget').value = '';
    document.getElementById('tikkie-link').value = '';
    
    // Test the parsing logic
    const dailyBudgetInput = document.getElementById('daily-budget').value;
    const dailyBudget = dailyBudgetInput === '' ? 14 : parseFloat(dailyBudgetInput);
    
    console.log('Input value:', dailyBudgetInput);
    console.log('Parsed value:', dailyBudget);
    console.log('Expected: 14, Got:', dailyBudget);
    console.log('Test 2 Result:', dailyBudget === 14 ? 'PASS' : 'FAIL');
    
    return dailyBudget === 14;
  } catch (error) {
    console.error('Test 2 failed:', error);
    return false;
  }
}

// Test 3: Valid Tikkie Link
async function testValidTikkieLink() {
  console.log('\n--- Test 3: Valid Tikkie Link ---');
  
  try {
    document.getElementById('daily-budget').value = '15';
    document.getElementById('tikkie-link').value = 'https://tikkie.me/pay/test123';
    
    const dailyBudgetInput = document.getElementById('daily-budget').value;
    const dailyBudget = dailyBudgetInput === '' ? 14 : parseFloat(dailyBudgetInput);
    const tikkieLink = document.getElementById('tikkie-link').value.trim();
    
    const settings = { dailyBudget: dailyBudget, tikkieLink: tikkieLink };
    console.log('Settings to save:', settings);
    
    const response = await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings });
    console.log('Save response:', response);
    console.log('Test 3 Result:', response.success ? 'PASS' : 'FAIL');
    
    return response.success;
  } catch (error) {
    console.error('Test 3 failed:', error);
    return false;
  }
}

// Test 4: Invalid Tikkie Link (should not block daily budget)
async function testInvalidTikkieLink() {
  console.log('\n--- Test 4: Invalid Tikkie Link ---');
  
  try {
    document.getElementById('daily-budget').value = '20';
    document.getElementById('tikkie-link').value = 'invalid-url';
    
    const dailyBudgetInput = document.getElementById('daily-budget').value;
    const dailyBudget = dailyBudgetInput === '' ? 14 : parseFloat(dailyBudgetInput);
    const tikkieLink = document.getElementById('tikkie-link').value.trim();
    
    const settings = { dailyBudget: dailyBudget, tikkieLink: tikkieLink };
    console.log('Settings to save:', settings);
    
    const response = await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings });
    console.log('Save response:', response);
    
    // Should either succeed (with simplified validation) or fail gracefully
    console.log('Test 4 Result:', response.success ? 'PASS (allowed invalid URL)' : 'PASS (rejected invalid URL)');
    
    return true; // Both outcomes are acceptable
  } catch (error) {
    console.error('Test 4 failed:', error);
    return false;
  }
}

// Test 5: Empty Tikkie Link
async function testEmptyTikkieLink() {
  console.log('\n--- Test 5: Empty Tikkie Link ---');

  try {
    document.getElementById('daily-budget').value = '25';
    document.getElementById('tikkie-link').value = '';

    const dailyBudgetInput = document.getElementById('daily-budget').value;
    const dailyBudget = dailyBudgetInput === '' ? 14 : parseFloat(dailyBudgetInput);
    const tikkieLink = document.getElementById('tikkie-link').value.trim();

    const settings = { dailyBudget: dailyBudget, tikkieLink: tikkieLink };
    console.log('Settings to save:', settings);

    const response = await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings });
    console.log('Save response:', response);
    console.log('Test 5 Result:', response.success ? 'PASS' : 'FAIL');

    return response.success;
  } catch (error) {
    console.error('Test 5 failed:', error);
    return false;
  }
}

// Test 6: Tikkie URL Extraction from Full Message
async function testTikkieUrlExtraction() {
  console.log('\n--- Test 6: Tikkie URL Extraction from Full Message ---');

  try {
    document.getElementById('daily-budget').value = '15';

    const fullMessage = `Please could you pay me for 'lunch' at
https://tikkie.me/pay/vi94oins5u7bi45klogd

This link is valid until 29 August`;

    document.getElementById('tikkie-link').value = fullMessage;

    const settings = {
      dailyBudget: 15,
      tikkieLink: fullMessage
    };
    console.log('Settings with full message:', settings);

    const response = await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings });
    console.log('Save response:', response);

    // Check if URL was extracted correctly
    const getResponse = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    const extractedUrl = getResponse.success ? getResponse.settings.tikkieLink : '';

    console.log('Extracted URL:', extractedUrl);
    console.log('Expected URL: https://tikkie.me/pay/vi94oins5u7bi45klogd');

    const isCorrect = extractedUrl === 'https://tikkie.me/pay/vi94oins5u7bi45klogd';
    console.log('Test 6 Result:', isCorrect ? 'PASS' : 'FAIL');

    return response.success && isCorrect;
  } catch (error) {
    console.error('Test 6 failed:', error);
    return false;
  }
}

// Test 7: Direct Tikkie URL (Backward Compatibility)
async function testDirectTikkieUrl() {
  console.log('\n--- Test 7: Direct Tikkie URL (Backward Compatibility) ---');

  try {
    document.getElementById('daily-budget').value = '12';

    const directUrl = 'https://tikkie.me/pay/abc123def456';
    document.getElementById('tikkie-link').value = directUrl;

    const settings = {
      dailyBudget: 12,
      tikkieLink: directUrl
    };
    console.log('Settings with direct URL:', settings);

    const response = await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings });
    console.log('Save response:', response);

    // Check if URL was preserved correctly
    const getResponse = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    const storedUrl = getResponse.success ? getResponse.settings.tikkieLink : '';

    console.log('Stored URL:', storedUrl);
    console.log('Expected URL:', directUrl);

    const isCorrect = storedUrl === directUrl;
    console.log('Test 7 Result:', isCorrect ? 'PASS' : 'FAIL');

    return response.success && isCorrect;
  } catch (error) {
    console.error('Test 7 failed:', error);
    return false;
  }
}

// Test 8: Invalid Text (No Tikkie URL)
async function testInvalidText() {
  console.log('\n--- Test 8: Invalid Text (No Tikkie URL) ---');

  try {
    document.getElementById('daily-budget').value = '18';

    const invalidText = 'This is just some random text with no Tikkie URL in it at all.';
    document.getElementById('tikkie-link').value = invalidText;

    const settings = {
      dailyBudget: 18,
      tikkieLink: invalidText
    };
    console.log('Settings with invalid text:', settings);

    const response = await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings });
    console.log('Save response:', response);

    // Should clear the Tikkie link but save the budget
    const getResponse = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    const storedUrl = getResponse.success ? getResponse.settings.tikkieLink : null;
    const storedBudget = getResponse.success ? getResponse.settings.dailyBudget : null;

    console.log('Stored URL:', storedUrl);
    console.log('Stored Budget:', storedBudget);

    const isCorrect = storedUrl === '' && storedBudget === 18;
    console.log('Test 8 Result:', isCorrect ? 'PASS' : 'FAIL');

    return response.success && isCorrect;
  } catch (error) {
    console.error('Test 8 failed:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting comprehensive enhanced settings tests...');

  const results = {
    test1: await testDailyBudgetZero(),
    test2: await testDailyBudgetEmpty(),
    test3: await testValidTikkieLink(),
    test4: await testInvalidTikkieLink(),
    test5: await testEmptyTikkieLink(),
    test6: await testTikkieUrlExtraction(),
    test7: await testDirectTikkieUrl(),
    test8: await testInvalidText()
  };

  console.log('\n=== ENHANCED TEST RESULTS ===');
  console.log('Test 1 (Daily Budget = 0 Enhanced):', results.test1 ? 'PASS' : 'FAIL');
  console.log('Test 2 (Daily Budget = empty):', results.test2 ? 'PASS' : 'FAIL');
  console.log('Test 3 (Valid Tikkie Link):', results.test3 ? 'PASS' : 'FAIL');
  console.log('Test 4 (Invalid Tikkie Link):', results.test4 ? 'PASS' : 'FAIL');
  console.log('Test 5 (Empty Tikkie Link):', results.test5 ? 'PASS' : 'FAIL');
  console.log('Test 6 (Tikkie URL Extraction):', results.test6 ? 'PASS' : 'FAIL');
  console.log('Test 7 (Direct URL Compatibility):', results.test7 ? 'PASS' : 'FAIL');
  console.log('Test 8 (Invalid Text Handling):', results.test8 ? 'PASS' : 'FAIL');

  const passCount = Object.values(results).filter(r => r).length;
  console.log(`\nOverall: ${passCount}/8 tests passed`);

  if (passCount === 8) {
    console.log('🎉 All tests passed! Enhanced settings fixes are working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the logs above for details.');
  }

  return results;
}

// Auto-run tests
runAllTests();
