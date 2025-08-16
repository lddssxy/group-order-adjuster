# Chrome Web Store Privacy Practices Justifications

## Single Purpose Description

**Group Order Splitter** is a Chrome extension designed for a single, specific purpose: **to automatically calculate and split payment costs for group lunch orders on Thuisbezorgd.nl when they exceed company budget limits**.

The extension helps teams fairly distribute costs by:
1. Reading order information from Thuisbezorgd order pages
2. Calculating individual costs and shared expenses (delivery, service fees)
3. Determining who owes money when orders exceed company budgets
4. Generating payment messages for easy money collection via Tikkie

## Permission Justifications

### 1. activeTab Permission

**Purpose**: To read order information from active Thuisbezorgd.nl order pages

**Justification**: 
- The extension needs to access the current tab's content to read order details (participant names, individual orders, costs, fees) from Thuisbezorgd.nl pages
- This data is essential for calculating cost splits and determining payment obligations
- Only activates when user clicks the extension icon on relevant pages
- No background access to tabs - only when explicitly triggered by user
- Data is processed locally and never transmitted externally

**Data Accessed**:
- Participant names from order pages
- Individual order amounts
- Delivery fees, service fees, discounts
- Order totals and subtotals

### 2. Host Permission (thuisbezorgd.nl)

**Purpose**: To inject content scripts on Thuisbezorgd.nl order pages for automatic calculation

**Justification**:
- Content scripts run on specific Thuisbezorgd.nl order pages (foodtracker and order-confirmation)
- Enables automatic cost calculation when order pages load
- Provides seamless user experience without manual data entry
- Restricted to only necessary Thuisbezorgd.nl URLs
- No access to other websites or sensitive pages

**Specific URLs**:
- `https://www.thuisbezorgd.nl/*/foodtracker/*`
- `https://www.thuisbezorgd.nl/*/order-confirmation*`

### 3. storage Permission

**Purpose**: To save user settings and preferences locally

**Justification**:
- Stores user's daily budget setting (company budget limit)
- Stores encrypted Tikkie payment link for message generation
- Enables consistent experience across browser sessions
- All data stored locally in Chrome's secure storage
- No external transmission of stored data
- User has full control to modify or delete stored settings

**Data Stored**:
- Daily budget amount (number)
- Tikkie payment link (encrypted with AES-GCM 256-bit encryption)

### 4. Remote Code Use

**Justification**: **NO REMOTE CODE IS USED**

- All JavaScript code is bundled with the extension
- No external script loading or remote code execution
- No eval() or similar dynamic code execution
- All functionality implemented in local extension files
- No CDN dependencies or external libraries loaded at runtime

## Data Usage Compliance

### Data Collection
- **Minimal Collection**: Only collects essential settings (budget, Tikkie link)
- **No Personal Data**: No collection of personal information beyond user-provided settings
- **No Tracking**: No analytics, tracking, or behavioral data collection
- **Local Processing**: All order data processed locally, never stored permanently

### Data Usage
- **Single Purpose**: Data used exclusively for cost splitting calculations
- **No Secondary Use**: No data used for advertising, analytics, or other purposes
- **User Control**: Users can modify or delete all stored data at any time

### Data Security
- **Encryption**: Sensitive data (Tikkie links) encrypted before storage
- **Local Storage**: All data stored in Chrome's secure local storage
- **No Transmission**: No data transmitted to external servers
- **Access Control**: Only the extension can access stored data

### Data Retention
- **Settings**: Retained until user uninstalls extension or clears data
- **Order Data**: Processed temporarily, never permanently stored
- **User Control**: Complete control over data retention and deletion

## Privacy Practices Certification

I certify that this extension's data usage complies with Chrome Web Store Developer Programme Policies:

1. **Transparency**: Clear disclosure of all data collection and usage
2. **Minimal Data**: Only collects data necessary for core functionality
3. **User Control**: Users have full control over their data
4. **Security**: Appropriate security measures for data protection
5. **No Deception**: Honest and accurate description of functionality
6. **Single Purpose**: Focused on one clear, beneficial purpose

## Contact Information

**Developer**: Yu Xia
**Email**: [Your email address - to be provided in Chrome Web Store account]
**Purpose**: For privacy-related questions and support

## Additional Notes

- Extension works entirely offline after installation
- No external API dependencies for core functionality
- Open source code available for transparency
- Regular security updates and maintenance
- Compliant with GDPR and privacy best practices
