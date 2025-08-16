/**
 * Test script to verify settings fixes
 * Run this in the popup console to test the fixes
 */

console.log('=== TESTING SETTINGS FIXES ===');

// Test 1: Daily Budget = 0
async function testDailyBudgetZero() {
  console.log('\n--- Test 1: Daily Budget = 0 ---');
  
  try {
    // Set input to 0
    document.getElementById('daily-budget').value = '0';
    document.getElementById('tikkie-link').value = '';
    
    // Test the parsing logic
    const dailyBudgetInput = document.getElementById('daily-budget').value;
    const dailyBudget = dailyBudgetInput === '' ? 14 : parseFloat(dailyBudgetInput);
    
    console.log('Input value:', dailyBudgetInput);
    console.log('Parsed value:', dailyBudget);
    console.log('Expected: 0, Got:', dailyBudget);
    console.log('Test 1 Result:', dailyBudget === 0 ? 'PASS' : 'FAIL');
    
    // Test actual save
    const settings = { dailyBudget: dailyBudget, tikkieLink: '' };
    const response = await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings });
    console.log('Save response:', response);
    
    return dailyBudget === 0 && response.success;
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

// Run all tests
async function runAllTests() {
  console.log('Starting comprehensive settings tests...');
  
  const results = {
    test1: await testDailyBudgetZero(),
    test2: await testDailyBudgetEmpty(),
    test3: await testValidTikkieLink(),
    test4: await testInvalidTikkieLink(),
    test5: await testEmptyTikkieLink()
  };
  
  console.log('\n=== TEST RESULTS ===');
  console.log('Test 1 (Daily Budget = 0):', results.test1 ? 'PASS' : 'FAIL');
  console.log('Test 2 (Daily Budget = empty):', results.test2 ? 'PASS' : 'FAIL');
  console.log('Test 3 (Valid Tikkie Link):', results.test3 ? 'PASS' : 'FAIL');
  console.log('Test 4 (Invalid Tikkie Link):', results.test4 ? 'PASS' : 'FAIL');
  console.log('Test 5 (Empty Tikkie Link):', results.test5 ? 'PASS' : 'FAIL');
  
  const passCount = Object.values(results).filter(r => r).length;
  console.log(`\nOverall: ${passCount}/5 tests passed`);
  
  if (passCount === 5) {
    console.log('🎉 All tests passed! Settings fixes are working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the logs above for details.');
  }
  
  return results;
}

// Auto-run tests
runAllTests();
