# Group Order Splitter

A Chrome extension that splits payment costs for Thuisbezorgd group orders when exceeding company budgets. Simplify cost sharing with automated calculations and Tikkie integration.

## 🎯 Features

- **Smart Payment Calculation**: Automatically calculates fair payment splits when orders exceed budgets
- **Individual Breakdown**: Detailed payment breakdown for each participant with color-coded status
- **Tikkie Integration**: Generate ready-to-share payment messages with your Tikkie link
- **Secure & Private**: All processing done locally with encrypted storage of sensitive data
- **Professional Interface**: Clean, intuitive popup design with responsive layout

## 🚀 Installation

### From Chrome Web Store (Recommended)
1. Visit the Chrome Web Store
2. Search for "Group Order Splitter"
3. Click "Add to Chrome"
4. The extension icon will appear in your toolbar

### Manual Installation (Development)
1. Download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder

## 📖 How to Use

1. **Place Your Order**: Order on Thuisbezorgd.nl as usual
2. **Open Extension**: Click the extension icon when your order exceeds budget
3. **Calculate Split**: Click "Calculate Now" to see payment breakdown
4. **View Details**: Click "Show Individual Payment Breakdown" for full details
5. **Collect Payments**: Use generated Tikkie message to collect from team members

## ⚙️ Settings

Configure the extension to match your needs:

- **Daily Budget**: Set your company's budget limit (default: €14 per person)
- **Tikkie Link**: Add your Tikkie payment link for easy money collection

## 🔒 Privacy & Security

Your privacy is our priority:
- ✅ All calculations performed locally in your browser
- ✅ Tikkie links encrypted with AES-GCM before storage
- ✅ No personal data sent to external servers
- ✅ No tracking or analytics
- ✅ Minimal permissions required

## 🌐 Supported Pages

Works on all Thuisbezorgd.nl order pages:
- Food tracker pages (`/foodtracker/`)
- Order confirmation pages (`/order-confirmation`)
- Both Dutch and English language versions

## 📋 Requirements

- Chrome browser (version 88 or later)
- Active Thuisbezorgd.nl group order with multiple participants
## 🎨 Interface

The extension provides:
- Clean popup interface for quick calculations
- Detailed modal with individual payment breakdowns
- Color-coded status indicators (green/yellow/blue)
- Professional payment collection messages

## 🔄 Updates

This extension is regularly updated with:
- Enhanced calculation accuracy
- Improved user interface
- Better error handling
- New features based on user feedback

## 📞 Support

For questions or issues:
- Check the extension settings for configuration options
- Ensure you're on a valid Thuisbezorgd order page
- Verify your Chrome browser is up to date

## 📄 License & Privacy

- Open source development
- Comprehensive privacy policy included
- No data collection or tracking
- User data remains on your device
5. Click "Save Settings"

## Supported Pages

The extension works on the following Thuisbezorgd.nl pages:
- Order confirmation pages (`/order-confirmation*`)
- Order tracking pages (`/foodtracker/*`)
- Both English and Dutch language versions

## Technical Details

### Architecture
- **Manifest V3**: Uses the latest Chrome extension manifest version
- **Content Script**: Analyzes page content and displays results
- **Background Script**: Manages settings and coordinates communication
- **Popup Interface**: Provides user controls and configuration options

### Parsing Strategy
The extension uses a dual-strategy approach for maximum compatibility:
1. **Structured Parsing**: Attempts to parse data from DOM elements with specific selectors
2. **Text Parsing**: Falls back to analyzing visible text content if structured parsing fails

### Data Processing
- Handles multiple languages (English/Dutch)
- Supports various currency formats
- Processes discounts and vouchers correctly
- Accounts for service fees and delivery charges

## Troubleshooting

### Extension Not Working
- Ensure you're on a supported Thuisbezorgd.nl page
- Check that the page has fully loaded
- Try refreshing the page and waiting a few seconds
- Use the manual calculation button in the popup

### Incorrect Calculations
- Verify the daily budget setting is correct
- Check if all participants are properly detected
- Look for any unusual page formatting that might affect parsing
- Use the calculation breakdown to verify the numbers

### No Results Displayed
- Make sure the page contains order information
- Check browser console for any error messages
- Try manually triggering calculation from the popup
- Ensure the extension has proper permissions

## Development

### File Structure
```
chrome-order-extra-calculator/
├── manifest.json          # Extension configuration
├── content.js            # Main parsing and calculation logic
├── content.css           # Styling for floating panel
├── background.js         # Background script for coordination
├── popup.html           # Popup interface HTML
├── popup.css            # Popup interface styling
├── popup.js             # Popup interface logic
├── icons/               # Extension icons
└── README.md           # This file
```

### Key Functions
- `parseOrderData()`: Extracts order information from the page
- `calculateDistribution()`: Performs cost distribution calculations
- `displayResults()`: Shows results in floating panel
- `handleTriggerCalculation()`: Processes manual calculation requests

## Privacy

This extension:
- Only runs on Thuisbezorgd.nl pages
- Does not collect or transmit any personal data
- Stores only user preferences locally
- Does not access data from other websites

## License

This project is open source and available under the MIT License.

## Support

For issues, feature requests, or questions, please create an issue in the project repository.
