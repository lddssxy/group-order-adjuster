/**
 * Enhanced Group Order Splitter - Content Script
 *
 * This content script runs on Thuisbezorgd order pages and automatically
 * splits costs for group lunch orders when they exceed company budgets.
 * It integrates with the popup interface and background script for a
 * complete user experience.
 */
(function () {
  'use strict';

  // Global state
  let currentSettings = {
    dailyBudget: 14
  };
  let calculationResults = null;
  let isCalculating = false;

  // Initialize content script
  function initialize() {
    console.log('Group Order Splitter: Content script loaded');
    loadSettings();
    setupMessageListeners();

    // Auto-calculate if enabled and page is ready
    if (document.readyState === 'complete') {
      scheduleAutoCalculation();
    } else {
      document.addEventListener('DOMContentLoaded', scheduleAutoCalculation);
    }
  }

  // Load settings from background script
  async function loadSettings() {
    try {
      const response = await sendMessage({ type: 'GET_SETTINGS' });
      if (response && response.success) {
        currentSettings = { ...currentSettings, ...response.settings };
      }
    } catch (error) {
      console.warn('Failed to load settings, using defaults:', error);
    }
  }

  // Setup message listeners for communication with popup
  function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'TRIGGER_CALCULATION':
          handleTriggerCalculation(sendResponse);
          return true; // Keep message channel open

        case 'SETTINGS_UPDATED':
          currentSettings = { ...currentSettings, ...message.settings };
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    });
  }

  // Handle calculation trigger from popup
  async function handleTriggerCalculation(sendResponse) {
    try {
      const result = await calculateAndDisplay(true);
      sendResponse({
        success: true,
        results: result.results,
        breakdown: result.breakdown,
        withinBudget: result.withinBudget,
        orderCreator: result.orderCreator
      });
    } catch (error) {
      console.error('Calculation failed:', error);
      sendResponse({
        success: false,
        error: error.message || 'Calculation failed'
      });
    }
  }

  // Schedule auto-calculation with delay
  function scheduleAutoCalculation() {
    const delayMs = 3000; // Wait for page to fully load
    setTimeout(() => {
      if (!isCalculating) {
        calculateAndDisplay(false);
      }
    }, delayMs);
  }

  /**
   * Enhanced calculation function that extracts order information from the page
   * and calculates cost distribution based on current settings.
   *
   * @param {boolean} fromPopup - Whether calculation was triggered from popup
   * @returns {Object} Calculation results and breakdown
   */
  async function calculateAndDisplay(fromPopup = false) {
    if (isCalculating) {
      throw new Error('Calculation already in progress');
    }

    isCalculating = true;

    try {
      // Show loading state if triggered from popup
      if (fromPopup) {
        showLoadingState();
      }

      // Parse order data from page
      const orderData = parseOrderData();

      if (!orderData.people || Object.keys(orderData.people).length === 0) {
        console.error('No participants found in order data:', orderData);
        throw new Error('No order data found on this page. Make sure you are on an order confirmation or tracking page.');
      }

      // Calculate distribution using current settings
      const results = calculateDistribution(orderData, currentSettings);

      // Store results for popup communication
      calculationResults = results;

      // Display results on page
      const displayBudget = (currentSettings.dailyBudget !== undefined && currentSettings.dailyBudget !== null) ? currentSettings.dailyBudget : 14;
      displayResults(results.results, results.breakdown, fromPopup, results.withinBudget, results.orderCreator, displayBudget);

      return results;

    } catch (error) {
      console.error('Calculation error:', error);

      // Send error to background for logging
      sendMessage({ type: 'LOG_ERROR', error: error.message });

      // Show error to user
      if (fromPopup) {
        throw error; // Re-throw for popup to handle
      } else {
        displayError(error.message);
      }

    } finally {
      isCalculating = false;
    }
  }

  /**
   * Enhanced order data parsing with comprehensive error handling and validation
   */
  function parseOrderData() {
    try {
      // Validate page context first
      validatePageContext();

      // Try multiple parsing strategies for better compatibility
      let orderData = null;

      // Strategy 1: Parse from structured elements (preferred)
      orderData = parseFromStructuredElements();

      // Strategy 2: Fallback to text parsing if structured parsing fails
      if (!orderData || Object.keys(orderData.people || {}).length === 0) {
        console.log('Structured parsing failed, trying text parsing...');
        orderData = parseFromText();
      }

      // Validate parsed data
      if (!orderData) {
        throw new Error('Unable to parse order data from page. Please ensure you are on a valid Thuisbezorgd order page.');
      }

      // Comprehensive data validation
      validateOrderData(orderData);

      return orderData;

    } catch (error) {
      // Enhanced error context
      const errorContext = gatherErrorContext();
      console.error('Order parsing failed:', error.message, errorContext);

      // Provide specific error messages based on context
      if (error.message.includes('not a valid order page')) {
        throw new Error('This page does not appear to be a Thuisbezorgd order page. Please navigate to an order confirmation or food tracker page.');
      } else if (error.message.includes('No participants found')) {
        throw new Error('No order participants detected. The order may still be loading or the page format has changed.');
      } else if (error.message.includes('Invalid price data')) {
        throw new Error('Order prices could not be parsed correctly. Please refresh the page and try again.');
      } else {
        throw new Error(`Order parsing failed: ${error.message}. Please refresh the page or contact support if the issue persists.`);
      }
    }
  }

  /**
   * Validate that we're on a valid order page
   */
  function validatePageContext() {
    const url = window.location.href;

    if (!url.includes('thuisbezorgd.nl')) {
      throw new Error('This extension only works on Thuisbezorgd.nl pages');
    }

    // Check for order-specific indicators
    const hasOrderIndicators =
      url.includes('foodtracker') ||
      url.includes('order-confirmation') ||
      document.querySelector('[data-qa="participant-name"]') ||
      document.querySelector('[data-qa="item-details-product-price"]') ||
      document.querySelector('.order-summary') ||
      document.querySelector('.participant-order');

    if (!hasOrderIndicators) {
      throw new Error('This does not appear to be a valid order page');
    }
  }

  /**
   * Validate parsed order data for completeness and correctness
   */
  function validateOrderData(orderData) {
    if (!orderData || typeof orderData !== 'object') {
      throw new Error('Invalid order data structure');
    }

    if (!orderData.people || typeof orderData.people !== 'object') {
      throw new Error('No participants found in order data');
    }

    const participantCount = Object.keys(orderData.people).length;
    if (participantCount === 0) {
      throw new Error('No participants found in the order');
    }

    if (participantCount > 50) {
      throw new Error('Too many participants detected (>50). This may indicate a parsing error.');
    }

    // Validate participant data
    for (const [name, amount] of Object.entries(orderData.people)) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new Error('Invalid participant name detected');
      }

      if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
        throw new Error(`Invalid price data for participant "${name}": ${amount}`);
      }

      if (amount > 1000) {
        throw new Error(`Unusually high amount detected for "${name}": €${amount}. Please verify the order data.`);
      }
    }

    // Validate fee data
    const fees = ['delivery', 'service', 'discount'];
    fees.forEach(fee => {
      if (orderData[fee] !== undefined) {
        if (typeof orderData[fee] !== 'number' || isNaN(orderData[fee])) {
          throw new Error(`Invalid ${fee} fee data: ${orderData[fee]}`);
        }
      }
    });

    console.log(`✅ Order data validation passed: ${participantCount} participants`);
  }

  /**
   * Gather error context for debugging
   */
  function gatherErrorContext() {
    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      pageTitle: document.title,
      participantElements: document.querySelectorAll('[data-qa="participant-name"]').length,
      priceElements: document.querySelectorAll('[data-qa="item-details-product-price"]').length,
      hasOrderSummary: !!document.querySelector('.order-summary'),
      documentReady: document.readyState
    };
  }

  /**
   * Parse order data from structured DOM elements - Enhanced for Thuisbezorgd.nl
   */
  function parseFromStructuredElements() {
    try {
      const people = {};
      let delivery = 0;
      let service = 0;
      let discount = 0;

      console.log('Attempting structured parsing for Thuisbezorgd.nl...');

      // Strategy 1: Look for participant-based structure
      const participantNames = document.querySelectorAll('[data-qa="participant-name"]');
      console.log(`Found ${participantNames.length} participants with data-qa="participant-name"`);

      if (participantNames.length > 0) {
        // Parse participant-based order structure
        participantNames.forEach(nameElement => {
          const participantName = nameElement.textContent.trim();
          console.log(`Processing participant: ${participantName}`);

          // Find the participant's container (usually a parent element)
          let participantContainer = nameElement.closest('[data-qa*="participant"]') ||
                                   nameElement.closest('.participant') ||
                                   nameElement.parentElement;

          // If no specific container, look for items following this participant
          if (!participantContainer) {
            participantContainer = findParticipantItemsContainer(nameElement);
          }

          if (participantContainer) {
            const participantTotal = parseParticipantItems(participantContainer, participantName);
            if (participantTotal > 0) {
              people[participantName] = participantTotal;
              console.log(`${participantName}: €${participantTotal.toFixed(2)}`);
            }
          }
        });
      }

      // Strategy 2: Look for order items with prices if participant parsing failed
      if (Object.keys(people).length === 0) {
        console.log('Participant parsing failed, trying item-based parsing...');
        const itemPrices = document.querySelectorAll('[data-qa="item-details-product-price"]');
        console.log(`Found ${itemPrices.length} items with data-qa="item-details-product-price"`);

        if (itemPrices.length > 0) {
          parseItemBasedStructure(itemPrices, people);
        }
      }

      // Strategy 3: Fallback to generic selectors
      if (Object.keys(people).length === 0) {
        console.log('Trying fallback selectors...');
        const fallbackSelectors = [
          '[data-qa*="order-item"]',
          '[data-qa*="basket-item"]',
          '.order-item',
          '.basket-item',
          '.menu-item'
        ];

        for (const selector of fallbackSelectors) {
          const items = document.querySelectorAll(selector);
          if (items.length > 0) {
            console.log(`Found ${items.length} items with selector: ${selector}`);
            parseItemsFromElements(items, people);
            break;
          }
        }
      }

      // Parse fees from structured elements
      const feeData = parseFeesFromElements();
      delivery = feeData.delivery;
      service = feeData.service;
      discount = feeData.discount;

      console.log('Structured parsing results:', { people, delivery, service, discount });

      // Return null if no people found to trigger text parsing
      if (Object.keys(people).length === 0) {
        console.log('No participants found in structured parsing, falling back to text parsing');
        return null;
      }

      return { people, delivery, service, discount };

    } catch (error) {
      console.warn('Structured parsing failed:', error);
      return null;
    }
  }

  /**
   * Fallback text-based parsing (original algorithm with improvements)
   */
  function parseFromText() {
    // Collect all visible text on the page
    const allText = document.body.innerText || '';
    const lines = allText
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const people = {};
    let currentPerson = null;

    // Improved person detection patterns
    const excludePatterns = [
      /^order/i,
      /^subtotal/i,
      /^total/i,
      /^delivery/i,
      /^service/i,
      /^discount/i,
      /^voucher/i,
      /^\d+$/,
      /^€/,
      /payment/i,
      /address/i,
      /phone/i,
      /email/i
    ];

    for (const line of lines) {
      // Stop collecting items once we reach the subtotal section
      if (line.match(/^(subtotal|total|delivery|service)/i)) {
        break;
      }

      const priceMatch = line.match(/€\s*([\d.,-]+)/);
      if (priceMatch) {
        // This line contains a price – assign it to the current person
        if (currentPerson) {
          const numStr = priceMatch[1].replace(/\./g, '').replace(',', '.');
          const price = parseFloat(numStr);
          if (!Number.isNaN(price) && price >= 0) {
            people[currentPerson] = (people[currentPerson] || 0) + price;
          }
        }
      } else {
        // Check if this could be a person name
        const hasDigit = /\d/.test(line);
        const hasEuro = /€/.test(line);
        const isExcluded = excludePatterns.some(pattern => pattern.test(line));

        if (!hasDigit && !hasEuro && !isExcluded && line.length > 1 && line.length < 50) {
          currentPerson = line;
          if (typeof people[currentPerson] === 'undefined') {
            people[currentPerson] = 0;
          }
        }
      }
    }

    // Parse fees from text
    const feeData = parseFeesFromText(lines);

    return {
      people,
      delivery: feeData.delivery,
      service: feeData.service,
      discount: feeData.discount
    };
  }

  /**
   * Find container that holds items for a specific participant
   */
  function findParticipantItemsContainer(nameElement) {
    // Look for a container that follows the participant name
    let container = nameElement.parentElement;
    while (container && container !== document.body) {
      // Check if this container has item price elements
      const priceElements = container.querySelectorAll('[data-qa="item-details-product-price"]');
      if (priceElements.length > 0) {
        return container;
      }
      container = container.parentElement;
    }
    return null;
  }

  /**
   * Parse items for a specific participant from their container
   */
  function parseParticipantItems(container, participantName) {
    let total = 0;

    // Look for price elements within this participant's container
    const priceElements = container.querySelectorAll('[data-qa="item-details-product-price"]');
    console.log(`Found ${priceElements.length} price elements for ${participantName}`);

    priceElements.forEach(priceElement => {
      const priceText = priceElement.textContent || priceElement.innerText || '';
      const priceMatch = priceText.match(/€\s*([\d.,-]+)/);

      if (priceMatch) {
        const numStr = priceMatch[1].replace(/\./g, '').replace(',', '.');
        const price = parseFloat(numStr);
        if (!Number.isNaN(price) && price >= 0) {
          total += price;
          console.log(`  Item price: €${price.toFixed(2)}`);
        }
      }
    });

    return total;
  }

  /**
   * Parse order structure based on item prices when participant structure is unclear
   */
  function parseItemBasedStructure(itemPrices, people) {
    console.log('Parsing item-based structure...');

    // Group items by their position/context to infer participants
    const itemGroups = [];
    let currentGroup = [];

    itemPrices.forEach((priceElement, index) => {
      const priceText = priceElement.textContent || priceElement.innerText || '';
      const priceMatch = priceText.match(/€\s*([\d.,-]+)/);

      if (priceMatch) {
        const numStr = priceMatch[1].replace(/\./g, '').replace(',', '.');
        const price = parseFloat(numStr);

        if (!Number.isNaN(price) && price >= 0) {
          // Look for participant name near this price element
          const participantName = findNearestParticipantName(priceElement);

          if (participantName) {
            people[participantName] = (people[participantName] || 0) + price;
            console.log(`Assigned €${price.toFixed(2)} to ${participantName}`);
          } else {
            // If no participant found, try to group items
            currentGroup.push(price);
          }
        }
      }
    });

    // If we have ungrouped items, try to assign them to a default participant
    if (currentGroup.length > 0 && Object.keys(people).length === 0) {
      const total = currentGroup.reduce((sum, price) => sum + price, 0);
      people['Unknown Participant'] = total;
      console.log(`Assigned €${total.toFixed(2)} to Unknown Participant`);
    }
  }

  /**
   * Find the nearest participant name to a price element
   */
  function findNearestParticipantName(priceElement) {
    // Search upward in the DOM tree for participant name
    let element = priceElement;
    while (element && element !== document.body) {
      // Look for participant name in current element or siblings
      const participantElement = element.querySelector('[data-qa="participant-name"]') ||
                                element.closest('[data-qa*="participant"]')?.querySelector('[data-qa="participant-name"]');

      if (participantElement) {
        return participantElement.textContent.trim();
      }

      // Also check previous siblings for participant names
      let sibling = element.previousElementSibling;
      while (sibling) {
        const nameElement = sibling.querySelector('[data-qa="participant-name"]');
        if (nameElement) {
          return nameElement.textContent.trim();
        }
        sibling = sibling.previousElementSibling;
      }

      element = element.parentElement;
    }

    return null;
  }

  /**
   * Parse items from DOM elements (fallback method)
   */
  function parseItemsFromElements(items, people) {
    let currentPerson = null;

    items.forEach(item => {
      const text = item.innerText || item.textContent || '';
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      for (const line of lines) {
        const priceMatch = line.match(/€\s*([\d.,-]+)/);
        if (priceMatch) {
          if (currentPerson) {
            const numStr = priceMatch[1].replace(/\./g, '').replace(',', '.');
            const price = parseFloat(numStr);
            if (!Number.isNaN(price) && price >= 0) {
              people[currentPerson] = (people[currentPerson] || 0) + price;
            }
          }
        } else if (line.length > 1 && line.length < 50 && !/\d/.test(line)) {
          currentPerson = line;
          if (typeof people[currentPerson] === 'undefined') {
            people[currentPerson] = 0;
          }
        }
      }
    });
  }

  /**
   * Parse fees from DOM elements - Enhanced for Thuisbezorgd.nl
   */
  function parseFeesFromElements() {
    let delivery = 0;
    let service = 0;
    let discount = 0;

    console.log('Parsing fees from structured elements...');

    // Strategy 1: Look for specific Thuisbezorgd.nl fee elements
    const deliveryElements = document.querySelectorAll('[data-qa*="delivery"], [data-qa*="bezorg"]');
    const serviceElements = document.querySelectorAll('[data-qa*="service"]');
    const discountElements = document.querySelectorAll('[data-qa*="discount"], [data-qa*="thuisbezorgd-pay"]');

    // Parse delivery fees
    deliveryElements.forEach(element => {
      const text = element.innerText || element.textContent || '';
      if (text.toLowerCase().includes('delivery') || text.toLowerCase().includes('bezorg')) {
        const priceMatch = text.match(/€\s*([\d.,-]+)/);
        if (priceMatch) {
          const value = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
          if (!Number.isNaN(value) && value > 0) {
            delivery += value;
            console.log(`Found delivery fee: €${value.toFixed(2)}`);
          }
        }
      }
    });

    // Parse service fees
    serviceElements.forEach(element => {
      const text = element.innerText || element.textContent || '';
      if (text.toLowerCase().includes('service')) {
        const priceMatch = text.match(/€\s*([\d.,-]+)/);
        if (priceMatch) {
          const value = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
          if (!Number.isNaN(value) && value > 0) {
            service += value;
            console.log(`Found service fee: €${value.toFixed(2)}`);
          }
        }
      }
    });

    // Parse discounts (including Thuisbezorgd Pay)
    discountElements.forEach(element => {
      const text = element.innerText || element.textContent || '';
      if (text.toLowerCase().includes('discount') ||
          text.toLowerCase().includes('korting') ||
          text.toLowerCase().includes('thuisbezorgd pay')) {

        // Look for negative amounts or amounts that should be treated as discounts
        const negativeMatch = text.match(/-€\s*([\d.,-]+)/);
        const positiveMatch = text.match(/€\s*([\d.,-]+)/);

        if (negativeMatch) {
          const value = parseFloat(negativeMatch[1].replace(/\./g, '').replace(',', '.'));
          if (!Number.isNaN(value)) {
            discount -= value; // Make it negative
            console.log(`Found discount (negative): -€${value.toFixed(2)}`);
          }
        } else if (positiveMatch) {
          const value = parseFloat(positiveMatch[1].replace(/\./g, '').replace(',', '.'));
          if (!Number.isNaN(value)) {
            // For Thuisbezorgd Pay, treat as negative discount
            if (text.toLowerCase().includes('thuisbezorgd pay')) {
              discount -= value;
              console.log(`Found Thuisbezorgd Pay discount: -€${value.toFixed(2)}`);
            } else {
              discount += value;
              console.log(`Found discount: €${value.toFixed(2)}`);
            }
          }
        }
      }
    });

    // Strategy 2: Fallback to text-based parsing if structured parsing found nothing
    if (delivery === 0 && service === 0 && discount === 0) {
      const textFees = parseFeesFromText(document.body.innerText.split('\n'));
      delivery = textFees.delivery;
      service = textFees.service;
      discount = textFees.discount;
    }

    console.log(`Fee parsing results: delivery=€${delivery.toFixed(2)}, service=€${service.toFixed(2)}, discount=€${discount.toFixed(2)}`);
    return { delivery, service, discount };
  }

  /**
   * Parse fees from text lines with improved multilingual support
   */
  function parseFeesFromText(lines) {
    let delivery = 0;
    let service = 0;
    let discount = 0;

    for (const line of lines) {
      // Delivery costs / Bezorgkosten
      let m = line.match(/^(Delivery costs?|Bezorgkosten|Delivery fee|Leveringskosten)\s+€\s*([\d.,-]+)/i);
      if (m) {
        delivery = parseFloat(m[2].replace(/\./g, '').replace(',', '.'));
        continue;
      }

      // Service fee / Servicekosten
      m = line.match(/^(Service fee|Servicekosten|Service charge)\s+€\s*([\d.,-]+)/i);
      if (m) {
        service = parseFloat(m[2].replace(/\./g, '').replace(',', '.'));
        continue;
      }

      // Discount / Thuisbezorgd Pay / Voucher etc.
      m = line.match(/^(Thuisbezorgd\s+Pay|Discount|Voucher|Kortingsbon|Korting|Coupon)\s+[-]?€\s*([\d.,-]+)/i);
      if (m) {
        let value = parseFloat(m[2].replace(/\./g, '').replace(',', '.'));

        // Thuisbezorgd Pay is always a discount (negative)
        if (m[1].toLowerCase().includes('thuisbezorgd')) {
          discount -= value;
          console.log(`Text parsing - Thuisbezorgd Pay discount: -€${value.toFixed(2)}`);
        } else {
          // Check if discount is marked as negative
          if (line.includes('-€') || line.includes('- €')) {
            discount -= value;
            console.log(`Text parsing - Negative discount: -€${value.toFixed(2)}`);
          } else {
            discount += value;
            console.log(`Text parsing - Positive discount: €${value.toFixed(2)}`);
          }
        }
        continue;
      }
    }

    return { delivery, service, discount };
  }
  /**
   * Calculate cost distribution with budget sharing logic
   * People with unused budget can help those who exceed budget
   */
  function calculateDistribution(orderData, settings) {
    const { people, delivery, service, discount } = orderData;
    // Use explicit check to handle zero values properly
    const budget = (settings.dailyBudget !== undefined && settings.dailyBudget !== null) ? settings.dailyBudget : 14;

    const participantNames = Object.keys(people);
    const orderSubtotal = Object.values(people).reduce((a, b) => a + b, 0);
    const grandTotal = orderSubtotal + delivery + service + discount;
    const totalCompanyBudget = budget * participantNames.length;



    // Identify order creator
    let orderCreator = null;
    const orderCreatorPatterns = ['you', 'yu', 'me', 'myself'];

    for (const name of participantNames) {
      if (orderCreatorPatterns.some(pattern => name.toLowerCase().includes(pattern))) {
        orderCreator = name;
        break;
      }
    }

    console.log(`Order creator identified: ${orderCreator || 'Not found'}`);

    // Calculate shared costs per person
    const sharedCostsTotal = delivery + service + discount;
    const sharedCostsPerPerson = sharedCostsTotal / participantNames.length;

    console.log(`Shared costs total: €${sharedCostsTotal.toFixed(2)}`);
    console.log(`Shared costs per person: €${sharedCostsPerPerson.toFixed(2)}`);

    // Step 1: Calculate each person's total cost and budget usage
    const participantDetails = {};
    let totalExtraBudget = 0; // Budget available from people under budget
    let totalOverBudget = 0;  // Amount needed by people over budget

    participantNames.forEach((name) => {
      const individualOrder = people[name];
      const sharedCosts = sharedCostsPerPerson;
      const totalCost = individualOrder + sharedCosts;
      const budgetUsage = Math.min(totalCost, budget);
      const extraBudget = Math.max(0, budget - totalCost);
      const overBudget = Math.max(0, totalCost - budget);

      participantDetails[name] = {
        individualOrder: parseFloat(individualOrder.toFixed(2)),
        sharedCosts: parseFloat(sharedCosts.toFixed(2)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        budgetUsage: parseFloat(budgetUsage.toFixed(2)),
        extraBudget: parseFloat(extraBudget.toFixed(2)),
        overBudget: parseFloat(overBudget.toFixed(2)),
        isOrderCreator: name === orderCreator
      };

      if (extraBudget > 0) {
        totalExtraBudget += extraBudget;
      }
      if (overBudget > 0) {
        totalOverBudget += overBudget;
      }

      console.log(`${name}: order=€${individualOrder.toFixed(2)}, shared=€${sharedCosts.toFixed(2)}, total=€${totalCost.toFixed(2)}, extra=€${extraBudget.toFixed(2)}, over=€${overBudget.toFixed(2)}`);
    });

    console.log(`Total extra budget available: €${totalExtraBudget.toFixed(2)}`);
    console.log(`Total over budget needed: €${totalOverBudget.toFixed(2)}`);

    // Step 2: Distribute extra budget to those who need it
    const finalPayments = {};

    participantNames.forEach((name) => {
      const details = participantDetails[name];

      if (details.overBudget > 0) {
        // This person needs to pay extra
        const proportionOfOverBudget = totalOverBudget > 0 ? details.overBudget / totalOverBudget : 0;
        const budgetHelpReceived = Math.min(details.overBudget, totalExtraBudget * proportionOfOverBudget);
        const finalPayment = Math.max(0, details.overBudget - budgetHelpReceived);

        finalPayments[name] = {
          ...details,
          budgetHelpReceived: parseFloat(budgetHelpReceived.toFixed(2)),
          finalPayment: parseFloat(finalPayment.toFixed(2)),
          status: finalPayment > 0 ? 'pays' : 'covered'
        };

        console.log(`${name}: over=€${details.overBudget.toFixed(2)}, help=€${budgetHelpReceived.toFixed(2)}, pays=€${finalPayment.toFixed(2)}`);
      } else {
        // This person has extra budget to share
        finalPayments[name] = {
          ...details,
          budgetHelpReceived: 0,
          finalPayment: 0,
          status: details.extraBudget > 0 ? 'helps_others' : 'exact'
        };

        console.log(`${name}: helps others with €${details.extraBudget.toFixed(2)}`);
      }
    });

    // Check if order is within total budget
    const withinBudget = grandTotal <= totalCompanyBudget;

    return {
      results: finalPayments,
      withinBudget,
      orderCreator,
      breakdown: {
        orderSubtotal,
        delivery,
        service,
        discount,
        grandTotal,
        totalBudget: totalCompanyBudget,
        sharedCostsTotal,
        sharedCostsPerPerson,
        totalExtraBudget,
        totalOverBudget,
        participantCount: participantNames.length
      }
    };
  }

  /**
   * Alternative calculation method: Split all costs proportionally after budget
   */
  function calculateAlternativeDistribution(orderData, settings) {
    const { people, delivery, service, discount } = orderData;
    const budget = (settings.dailyBudget !== undefined && settings.dailyBudget !== null) ? settings.dailyBudget : 14;
    const participantNames = Object.keys(people);
    const orderSubtotal = Object.values(people).reduce((a, b) => a + b, 0);
    const grandTotal = orderSubtotal + delivery + service + discount;
    const totalBudget = budget * participantNames.length;

    const results = {};

    if (grandTotal <= totalBudget) {
      // Order is within budget, no extra payments needed
      participantNames.forEach(name => {
        results[name] = 0;
      });
    } else {
      // Order exceeds budget, split the excess
      const excessAmount = grandTotal - totalBudget;
      const extraFeesTotal = delivery + service;
      const extraPerPerson = extraFeesTotal / participantNames.length;

      participantNames.forEach((name) => {
        const subtotal = people[name];
        let total = subtotal + extraPerPerson;

        // Apply proportional discount
        if (discount !== 0 && orderSubtotal > 0) {
          const ratio = subtotal / orderSubtotal;
          total += ratio * discount;
        }

        const overage = Math.max(0, total - budget);
        results[name] = parseFloat(overage.toFixed(2));
      });

      // Any remaining amount goes to order creator
      const participantTotal = Object.values(results).reduce((a, b) => a + b, 0);
      const remaining = excessAmount - participantTotal;
      if (remaining > 0) {
        results['You (Order Creator)'] = parseFloat(remaining.toFixed(2));
      }
    }

    return results;
  }

  /**
   * Show loading state in modal
   */
  function showLoadingState() {
    // Remove existing modal
    const existingBackdrop = document.getElementById('group-order-modal-backdrop');
    if (existingBackdrop) {
      existingBackdrop.remove();
    }

    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'group-order-modal-backdrop';

    const wrapper = createDisplayWrapper();

    // Create modal header
    const header = document.createElement('div');
    header.className = 'modal-header';

    const title = document.createElement('h2');
    title.className = 'modal-title';
    title.textContent = '⏳ Calculating...';

    header.appendChild(title);
    wrapper.appendChild(header);

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.textAlign = 'center';
    modalContent.style.padding = '40px';

    modalContent.innerHTML = `
      <div style="display: inline-block; width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <p style="margin-top: 20px; color: #666; font-size: 16px;">Analyzing order data...</p>
    `;

    wrapper.appendChild(modalContent);
    backdrop.appendChild(wrapper);
    document.body.appendChild(backdrop);
  }

  /**
   * Enhanced display function showing detailed payment breakdowns in a modal
   */
  function displayResults(results, breakdown, fromPopup = false, withinBudget = false, orderCreator = null, budget = 14) {
    // Remove existing modal and backdrop
    const existingBackdrop = document.getElementById('group-order-modal-backdrop');
    if (existingBackdrop) {
      existingBackdrop.remove();
    }

    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'group-order-modal-backdrop';

    // Create modal wrapper
    const wrapper = createDisplayWrapper();

    // Create modal header
    const header = document.createElement('div');
    header.className = 'modal-header';

    const title = document.createElement('h2');
    title.className = 'modal-title';

    if (withinBudget || Object.keys(results).length === 0) {
      title.textContent = '✅ No Payments Required';
    } else {
      title.textContent = '💰 Individual Payment Breakdown';
    }

    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '×';
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.addEventListener('click', () => {
      backdrop.remove();
    });

    header.appendChild(title);
    header.appendChild(closeButton);
    wrapper.appendChild(header);

    // Create modal content container
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // Results list
    const list = document.createElement('div');
    const hasPaymentObligations = Object.keys(results).length > 0 && !withinBudget;

    if (withinBudget || !hasPaymentObligations) {
      // Order is within budget or no payments needed
      const noBudgetRow = document.createElement('div');
      noBudgetRow.className = 'person-row';
      noBudgetRow.style.backgroundColor = '#d4edda';
      noBudgetRow.style.border = '1px solid #c3e6cb';
      noBudgetRow.style.color = '#155724';
      noBudgetRow.innerHTML = `
        <span class="person-name">🎉 All costs covered by company budget!</span>
        <span class="person-amount">€0.00</span>
      `;
      list.appendChild(noBudgetRow);
    } else {
      // Show detailed breakdown for all participants
      Object.entries(results).forEach(([name, details]) => {
        const row = document.createElement('div');
        row.className = 'person-row';
        row.style.padding = '12px';
        row.style.marginBottom = '8px';
        row.style.borderRadius = '6px';
        row.style.border = '2px solid';

        // Set background color based on status
        if (details.isOrderCreator) {
          if (details.status === 'helps_others') {
            row.style.backgroundColor = '#d4edda'; // Green for order creator helping others
            row.style.borderColor = '#c3e6cb';
            row.style.color = '#155724';
          } else {
            row.style.backgroundColor = '#e7f3ff'; // Blue for order creator
            row.style.borderColor = '#b3d9ff';
            row.style.color = '#004085';
          }
        } else if (details.status === 'pays') {
          row.style.backgroundColor = '#fff3cd'; // Yellow for those who need to pay
          row.style.borderColor = '#ffeaa7';
          row.style.color = '#856404';
        } else if (details.status === 'helps_others') {
          row.style.backgroundColor = '#d4edda'; // Green for those helping others
          row.style.borderColor = '#c3e6cb';
          row.style.color = '#155724';
        } else {
          row.style.backgroundColor = '#f8f9fa'; // Gray for exact budget
          row.style.borderColor = '#dee2e6';
          row.style.color = '#495057';
        }

        let statusIcon = '';
        let statusText = '';
        let statusBadgeClass = '';

        if (details.isOrderCreator) {
          statusIcon = '👑';
          statusText = 'Order Creator';
          statusBadgeClass = 'creator-badge';
        } else if (details.status === 'pays') {
          statusIcon = '💸';
          statusText = 'Needs to Pay';
          statusBadgeClass = 'pays-badge';
        } else if (details.status === 'helps_others') {
          statusIcon = '🤝';
          statusText = 'Helps Others';
          statusBadgeClass = 'helps-badge';
        } else {
          statusIcon = '✅';
          statusText = 'Exact Budget';
          statusBadgeClass = 'exact-badge';
        }

        // Build payment info section
        let paymentInfoHTML = '';
        if (details.isOrderCreator && details.extraBudget > 0) {
          paymentInfoHTML = `
            <div class="payment-info">
              <div style="color: #28a745; font-weight: 600;">
                💰 Extra budget: <span class="payment-amount">€${details.extraBudget.toFixed(2)}</span>
              </div>
            </div>
          `;
        } else if (details.status === 'pays') {
          paymentInfoHTML = `
            <div class="payment-info">
              <div style="margin-bottom: 4px;">
                <div style="color: #dc3545; font-weight: 600;">Above budget: €${details.overBudget.toFixed(2)}</div>
                ${details.budgetHelpReceived > 0 ?
                  `<div style="color: #28a745;">Help received: €${details.budgetHelpReceived.toFixed(2)}</div>` :
                  ''
                }
              </div>
              <div style="background-color: #fff3cd; padding: 6px; border-radius: 3px; border-left: 3px solid #ffc107;">
                <strong style="color: #856404;">Pay: <span class="payment-amount">€${details.finalPayment.toFixed(2)}</span></strong>
              </div>
            </div>
          `;
        } else if (details.status === 'helps_others') {
          paymentInfoHTML = `
            <div class="payment-info">
              <div style="color: #28a745; font-weight: 600;">
                🤝 Helping: <span class="payment-amount">€${details.extraBudget.toFixed(2)}</span>
              </div>
            </div>
          `;
        } else {
          paymentInfoHTML = `
            <div class="payment-info">
              <div style="color: #28a745; font-weight: 600;">
                ✅ Exact budget match
              </div>
            </div>
          `;
        }

        row.innerHTML = `
          <div class="person-header">
            <div class="person-name-status">${statusIcon} ${name}</div>
            <div class="person-status-badge ${statusBadgeClass}">${statusText}</div>
          </div>

          <div class="cost-breakdown">
            <div class="cost-item">
              <span>🍽️ Individual order:</span>
              <span>€${details.individualOrder.toFixed(2)}</span>
            </div>
            <div class="cost-item">
              <span>🚚 Share of delivery/service/discount:</span>
              <span>€${details.sharedCosts.toFixed(2)}</span>
            </div>
            <div class="cost-item total">
              <span>💰 Total cost:</span>
              <span>€${details.totalCost.toFixed(2)}</span>
            </div>
            <div class="cost-item">
              <span>🏢 Company budget:</span>
              <span>€${budget.toFixed(2)}</span>
            </div>
          </div>

          ${paymentInfoHTML}
        `;

        list.appendChild(row);
      });

      // Add summary row
      const totalPayments = Object.values(results)
        .filter(details => details.status === 'pays')
        .reduce((sum, details) => sum + details.finalPayment, 0);

      if (totalPayments > 0) {
        const summaryRow = document.createElement('div');
        summaryRow.className = 'summary-row';
        summaryRow.innerHTML = `
          💰 Total payments to ${orderCreator || 'order creator'}: €${totalPayments.toFixed(2)}
        `;
        list.appendChild(summaryRow);
      }
    }

    modalContent.appendChild(list);

    // Breakdown section (always show)
    if (breakdown) {
      const breakdownSection = createBreakdownSection(breakdown);
      modalContent.appendChild(breakdownSection);
    }

    // Summary
    const summary = document.createElement('div');
    summary.className = 'summary';
    summary.style.marginTop = '12px';
    summary.style.padding = '10px';
    summary.style.backgroundColor = '#f8f9fa';
    summary.style.borderRadius = '6px';
    summary.style.textAlign = 'center';
    summary.style.fontSize = '12px';
    summary.style.color = '#666';
    const summaryBudget = (currentSettings.dailyBudget !== undefined && currentSettings.dailyBudget !== null) ? currentSettings.dailyBudget : 14;
    summary.textContent = `Budget: €${summaryBudget}/person • ${breakdown?.participantCount || 0} people`;
    modalContent.appendChild(summary);

    // Recalculate button
    const recalcButton = document.createElement('button');
    recalcButton.className = 'recalculate-button';
    recalcButton.style.width = '100%';
    recalcButton.style.marginTop = '12px';
    recalcButton.style.padding = '10px';
    recalcButton.style.backgroundColor = '#667eea';
    recalcButton.style.color = 'white';
    recalcButton.style.border = 'none';
    recalcButton.style.borderRadius = '6px';
    recalcButton.style.fontSize = '13px';
    recalcButton.style.fontWeight = '500';
    recalcButton.style.cursor = 'pointer';
    recalcButton.textContent = 'Recalculate';
    recalcButton.addEventListener('click', () => {
      backdrop.remove();
      calculateAndDisplay(false);
    });
    modalContent.appendChild(recalcButton);

    // Append modal content to wrapper
    wrapper.appendChild(modalContent);

    // Append wrapper to backdrop
    backdrop.appendChild(wrapper);

    // Add backdrop click to close
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.remove();
      }
    });

    // Add escape key to close
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        backdrop.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Append to body
    document.body.appendChild(backdrop);
  }

  /**
   * Create the main display wrapper with base styling
   */
  function createDisplayWrapper() {
    const wrapper = document.createElement('div');
    wrapper.id = 'group-order-extra-display';
    return wrapper;
  }

  /**
   * Create breakdown section
   */
  function createBreakdownSection(breakdown) {
    const section = document.createElement('div');
    section.className = 'breakdown-section';
    section.style.marginTop = '12px';
    section.style.paddingTop = '12px';
    section.style.borderTop = '1px solid #e9ecef';
    section.style.fontSize = '12px';
    section.style.color = '#6c757d';

    const isOverBudget = breakdown.grandTotal > breakdown.totalBudget;
    const budgetDifference = Math.abs(breakdown.grandTotal - breakdown.totalBudget);

    section.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 6px;">Order Breakdown:</div>
      <div style="display: flex; justify-content: space-between;">
        <span>Food & Drinks:</span>
        <span>€${breakdown.orderSubtotal.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Delivery Fee:</span>
        <span>€${breakdown.delivery.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Service Fee:</span>
        <span>€${breakdown.service.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Discount:</span>
        <span>€${breakdown.discount.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: 600; border-top: 1px solid #dee2e6; padding-top: 4px; margin-top: 4px;">
        <span>Order Total:</span>
        <span>€${breakdown.grandTotal.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 4px; border-top: 1px solid #e9ecef;">
        <span>Company Budget (${breakdown.participantCount} people):</span>
        <span>€${breakdown.totalBudget.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: 600; color: ${isOverBudget ? '#dc3545' : '#28a745'};">
        <span>${isOverBudget ? '💸 Amount Over Budget:' : '✅ Amount Under Budget:'}</span>
        <span>€${budgetDifference.toFixed(2)}</span>
      </div>
      ${isOverBudget ? `
        <div style="margin-top: 8px; padding: 8px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; font-size: 11px;">
          <strong>Payment Logic:</strong> The €${budgetDifference.toFixed(2)} excess is split proportionally among participants based on their order amounts.
        </div>
      ` : `
        <div style="margin-top: 8px; padding: 8px; background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; font-size: 11px;">
          <strong>Great news!</strong> This order is fully covered by the company budget. No personal payments needed.
        </div>
      `}
    `;

    return section;
  }

  /**
   * Display error message in modal
   */
  function displayError(message) {
    // Remove existing modal
    const existingBackdrop = document.getElementById('group-order-modal-backdrop');
    if (existingBackdrop) {
      existingBackdrop.remove();
    }

    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'group-order-modal-backdrop';

    const wrapper = createDisplayWrapper();

    // Create modal header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';

    const title = document.createElement('h2');
    title.className = 'modal-title';
    title.textContent = '❌ Calculation Error';

    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', () => {
      backdrop.remove();
    });

    header.appendChild(title);
    header.appendChild(closeButton);
    wrapper.appendChild(header);

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.textAlign = 'center';
    modalContent.style.padding = '30px';

    modalContent.innerHTML = `
      <div style="background: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #f5c6cb;">
        ${message}
      </div>
      <button style="background: #dc3545; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-size: 14px;" onclick="this.closest('#group-order-modal-backdrop').remove()">
        Close
      </button>
    `;

    wrapper.appendChild(modalContent);
    backdrop.appendChild(wrapper);

    // Add backdrop click to close
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.remove();
      }
    });

    document.body.appendChild(backdrop);
  }























  /**
   * Send message to background script with timeout and retry logic
   */
  function sendMessage(message, timeout = 5000, retries = 2) {
    return new Promise((resolve, reject) => {
      let attemptCount = 0;

      function attemptSend() {
        attemptCount++;

        const timeoutId = setTimeout(() => {
          reject(new Error(`Message timeout after ${timeout}ms (attempt ${attemptCount}/${retries + 1})`));
        }, timeout);

        try {
          chrome.runtime.sendMessage(message, (response) => {
            clearTimeout(timeoutId);

            if (chrome.runtime.lastError) {
              const error = new Error(chrome.runtime.lastError.message);

              // Retry on connection errors
              if (attemptCount <= retries && (
                error.message.includes('Could not establish connection') ||
                error.message.includes('Extension context invalidated')
              )) {
                console.warn(`Message failed (attempt ${attemptCount}), retrying...`, error.message);
                setTimeout(attemptSend, 1000 * attemptCount); // Exponential backoff
                return;
              }

              reject(error);
            } else {
              resolve(response);
            }
          });
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      }

      attemptSend();
    });
  }

  /**
   * Safe DOM query with error handling
   */
  function safeQuerySelector(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (error) {
      console.warn(`Invalid selector: ${selector}`, error);
      return null;
    }
  }

  /**
   * Safe DOM query all with error handling
   */
  function safeQuerySelectorAll(selector, context = document) {
    try {
      return context.querySelectorAll(selector);
    } catch (error) {
      console.warn(`Invalid selector: ${selector}`, error);
      return [];
    }
  }

  /**
   * Safe number parsing with validation
   */
  function safeParseFloat(value, defaultValue = 0) {
    if (value === null || value === undefined) {
      return defaultValue;
    }

    if (typeof value === 'number') {
      return isNaN(value) ? defaultValue : value;
    }

    if (typeof value === 'string') {
      // Remove currency symbols and whitespace
      const cleaned = value.replace(/[€$£¥,\s]/g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? defaultValue : parsed;
    }

    return defaultValue;
  }

  /**
   * Debounced function execution to prevent rapid repeated calls
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Initialize the content script
  initialize();



})();
