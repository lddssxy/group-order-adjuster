# Group Order Splitter v1.1.0 Release Notes

## 🎉 What's New

### ✨ Enhanced Settings Management
- **Fixed Daily Budget Zero Value Support**: You can now set Daily Budget to €0 for scenarios where no company budget is available
- **Smart Tikkie Link Processing**: Paste complete Tikkie payment messages - the extension automatically extracts the URL
- **Improved Settings Persistence**: All settings now save and load correctly across browser sessions

### 🔧 Major Bug Fixes

#### Daily Budget Zero Value Issue
- **Problem**: Setting Daily Budget to €0 would revert to default €14
- **Solution**: Fixed parsing logic throughout the extension to properly handle zero values
- **Impact**: Now supports scenarios where participants pay full costs without company budget

#### Tikkie Link Format Enhancement
- **Problem**: Only accepted direct URLs, not full Tikkie messages
- **Solution**: Added smart URL extraction from complete message text
- **Impact**: Much easier workflow - just paste the entire Tikkie message

### 🎯 User Experience Improvements

#### Simplified Settings Interface
- **Removed unnecessary options**: Auto-calculate and show breakdown are now always enabled
- **Cleaner UI**: Streamlined settings with only essential options
- **Better input handling**: Tikkie field now uses textarea for easier text pasting

#### Enhanced Error Handling
- **Robust fallback mechanisms**: Settings save even if one component fails
- **Better user feedback**: Clear error messages and status indicators
- **Improved reliability**: More stable operation across different scenarios

## 📋 Technical Improvements

### Code Quality
- **Removed debug code**: Cleaned up all development logging for production
- **Optimized performance**: Streamlined message passing and storage operations
- **Enhanced security**: Improved input validation and error handling

### Compatibility
- **Chrome Manifest V3**: Fully compatible with latest Chrome extension standards
- **Cross-browser ready**: Prepared for future Firefox and Edge support
- **Responsive design**: Works well on different screen sizes

## 🚀 How to Update

### For New Users
1. Install from Chrome Web Store
2. Configure Daily Budget and Tikkie Link in settings
3. Visit any Thuisbezorgd order page to start using

### For Existing Users
1. Extension will auto-update from Chrome Web Store
2. Your existing settings will be preserved
3. New features are immediately available

## 📖 Usage Examples

### Zero Budget Scenario
```
Daily Budget: €0
Result: All participants pay their full individual costs
Perfect for: Personal group orders, team lunches without company budget
```

### Tikkie Message Processing
```
Input: "Please could you pay me for 'lunch' at
https://tikkie.me/pay/vi94oins5u7bi45klogd

This link is valid until 29 August"

Output: https://tikkie.me/pay/vi94oins5u7bi45klogd
```

## 🔧 Settings Reference

### Daily Budget
- **Purpose**: Company budget allowance per person
- **Range**: €0 to any positive amount
- **Default**: €14
- **Zero value**: Supported - no company budget applied

### Tikkie Payment Link
- **Input**: Direct URL or complete Tikkie message
- **Processing**: Automatic URL extraction
- **Validation**: Ensures valid Tikkie URLs only
- **Usage**: Generates payment collection messages

## 🐛 Known Issues

### Minor Limitations
- **Page refresh required**: Settings changes need page reload to take effect in calculations
- **Thuisbezorgd only**: Currently supports Thuisbezorgd.nl only
- **Dutch/English**: Optimized for Dutch and English Thuisbezorgd interfaces

### Workarounds
- **Settings not applying**: Refresh the Thuisbezorgd page after changing settings
- **Calculation not triggering**: Click the extension icon to manually trigger calculation
- **Tikkie link issues**: Ensure the pasted text contains a valid tikkie.me URL

## 🔮 Coming Soon

### Planned Features
- **Multi-platform support**: Uber Eats, Deliveroo integration
- **Advanced splitting**: Custom split ratios and rules
- **Payment tracking**: Track who has paid via Tikkie integration
- **Export options**: PDF receipts and CSV exports

### Performance Improvements
- **Faster parsing**: Optimized order data extraction
- **Better caching**: Reduced API calls and improved responsiveness
- **Enhanced UI**: More intuitive interface and better mobile support

## 📞 Support

### Getting Help
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check README.md for detailed usage instructions
- **Privacy**: Review PRIVACY_POLICY.md for data handling information

### Feedback
We value your feedback! Please share your experience and suggestions to help us improve the extension.

---

**Version**: 1.1.0  
**Release Date**: August 2024  
**Compatibility**: Chrome 88+, Manifest V3  
**File Size**: ~70KB  
**Permissions**: Storage, ActiveTab
