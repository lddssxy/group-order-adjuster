# Chrome Web Store Publishing Guide

## Prerequisites Checklist

Before publishing, ensure you have:
- [ ] Chrome Web Store Developer account ($5 registration fee)
- [ ] Verified email address
- [ ] Contact email set in your account
- [ ] Extension files ready and tested

## Step-by-Step Publishing Process

### 1. Account Setup

1. **Go to Chrome Web Store Developer Dashboard**
   - Visit: https://chrome.google.com/webstore/devconsole/
   - Sign in with your Google account

2. **Pay Registration Fee**
   - One-time $5 fee required
   - Payment via credit card or Google Pay

3. **Set Contact Email**
   - Go to "Account" tab in dashboard
   - Enter your contact email address
   - **Important**: Use a professional email you check regularly

4. **Verify Email**
   - Check your email for verification link
   - Click the verification link
   - Return to dashboard to confirm verification

### 2. Create New Extension Item

1. **Click "Add new item"**
2. **Upload Extension Package**
   - Create a ZIP file containing all extension files
   - Upload the ZIP file
   - Wait for automatic analysis

### 3. Fill Required Information

#### Store Listing Tab
- **Name**: Group Order Splitter
- **Summary**: Split payment costs for Thuisbezorgd group orders when exceeding company budgets
- **Description**: Use the detailed description from STORE_DESCRIPTIONS.md
- **Category**: Productivity
- **Language**: English (or your preferred language)

#### Screenshots & Media
- **Screenshots**: At least 1 screenshot (1280x800 or 640x400)
- **Promotional images**: Optional but recommended
- **Video**: Optional

#### Privacy Practices Tab (CRITICAL)

Copy the following justifications from `CHROME_WEB_STORE_JUSTIFICATIONS.md`:

**Single Purpose Description:**
```
Group Order Splitter is designed for a single, specific purpose: to automatically calculate and split payment costs for group lunch orders on Thuisbezorgd.nl when they exceed company budget limits. The extension helps teams fairly distribute costs by reading order information, calculating individual costs and shared expenses, determining payment obligations, and generating payment messages for easy money collection.
```

**activeTab Permission Justification:**
```
The extension needs activeTab permission to read order information from Thuisbezorgd.nl order pages when users click the extension icon. This data (participant names, order amounts, fees) is essential for calculating cost splits. Data is processed locally and never transmitted externally. Only activates when explicitly triggered by user on relevant pages.
```

**Host Permission Justification:**
```
Host permissions for thuisbezorgd.nl are required to inject content scripts on specific order pages (foodtracker and order-confirmation) for automatic cost calculation. This enables seamless user experience without manual data entry. Access is restricted to only necessary Thuisbezorgd.nl URLs and no other websites.
```

**Storage Permission Justification:**
```
Storage permission is needed to save user settings locally: daily budget setting and encrypted Tikkie payment link. All data is stored in Chrome's secure local storage, never transmitted externally. Users have full control to modify or delete stored settings at any time.
```

**Remote Code Justification:**
```
NO REMOTE CODE IS USED. All JavaScript code is bundled with the extension. No external script loading, remote code execution, eval(), or dynamic code execution. No CDN dependencies or external libraries loaded at runtime. All functionality implemented in local extension files.
```

**Data Usage Compliance Certification:**
```
I certify that this extension complies with Chrome Web Store policies: (1) Transparent disclosure of all data collection, (2) Minimal data collection only for core functionality, (3) User control over all data, (4) Appropriate security measures, (5) Honest functionality description, (6) Single clear purpose. Extension processes data locally, uses encryption for sensitive data, and provides users full control over their information.
```

### 4. Distribution Settings

- **Visibility**: Public
- **Regions**: Select appropriate regions (Netherlands recommended for Thuisbezorgd users)
- **Pricing**: Free

### 5. Review and Submit

1. **Review all information**
2. **Check all required fields are completed**
3. **Submit for review**

## Common Issues and Solutions

### Issue: "A justification for X is required"
**Solution**: Fill out the Privacy Practices tab with the justifications provided above

### Issue: "Contact email not verified"
**Solution**: 
1. Go to Account tab
2. Check your email for verification link
3. Click the verification link
4. Refresh the dashboard

### Issue: "Single purpose description required"
**Solution**: Use the single purpose description provided in the justifications

### Issue: "Data usage compliance certification required"
**Solution**: Check the certification box after filling all privacy practice justifications

## After Submission

1. **Review Process**: Usually takes 1-3 business days
2. **Possible Outcomes**:
   - **Approved**: Extension goes live immediately
   - **Rejected**: You'll receive feedback on what needs to be fixed

3. **If Rejected**:
   - Read the rejection email carefully
   - Fix the issues mentioned
   - Resubmit the extension

## Post-Publication

1. **Monitor Reviews**: Respond to user feedback
2. **Updates**: Submit updates through the same dashboard
3. **Analytics**: Use Chrome Web Store analytics to track usage

## Important Notes

- **Review Time**: Allow 1-3 business days for review
- **Policy Compliance**: Ensure your extension follows all Chrome Web Store policies
- **Testing**: Test your extension thoroughly before submission
- **Documentation**: Keep privacy policy and justifications up to date

## Support Resources

- **Chrome Web Store Help**: https://support.google.com/chrome_webstore/
- **Developer Policies**: https://developer.chrome.com/docs/webstore/program-policies/
- **Publishing Guide**: https://developer.chrome.com/docs/webstore/publish/
