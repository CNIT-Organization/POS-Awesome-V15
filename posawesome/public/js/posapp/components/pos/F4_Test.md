# F4 Shortcut Test Guide

## Overview
The F4 shortcut in POS Awesome should automatically submit an invoice with cash payment and print it silently (without opening the print view page).

## What F4 Should Do
1. **Validate Requirements**: Check that items are added, customer is selected, and POS shift is open
2. **Process Invoice**: Create invoice document with proper calculations
3. **Set Cash Payment**: Automatically set cash payment to the full invoice amount
4. **Submit Invoice**: Send invoice to backend for processing
5. **Silent Print**: Print invoice directly without opening print view page
6. **Clear Invoice**: Reset the POS for the next customer

## Testing Steps

### 1. Basic Setup
- Ensure you have items in the invoice
- Select a customer
- Have an active POS shift open
- Make sure you have a POS profile configured
- **IMPORTANT**: Enable `posa_silent_print` in your POS Profile

### 2. Test F4 Shortcut
- Press **F4** key
- Check browser console for logging messages
- Verify that the invoice is submitted
- Check that printing happens without opening print view page

### 3. Console Logs to Look For
```
F4 key pressed - triggering cash payment and print
This shortcut should use silent printing for better cashier experience
cashPaymentAndPrint method called - direct submission mode
All validations passed - preparing invoice using same method as show_payment()
Invoice prepared using server method, submitting directly...
printInvoiceByName called for invoice: [INVOICE_NAME]
Attempting to use silent printing for F4 shortcut...
Using silent printing (posa_silent_print enabled)
Calling silentPrint function...
silentPrint called successfully for F4 shortcut
```

### 4. Troubleshooting

#### If F4 doesn't work:
- Check if the shortcut is properly registered in Invoice.vue
- Verify that invoiceShortcuts.js is imported and mixed in
- Check browser console for JavaScript errors

#### If printing opens print view page:
- **Check POS Profile Setting**: Ensure `posa_silent_print` is enabled (set to 1)
- Verify that silentPrint function is available (should be imported at top of file)
- Check browser console for any error messages

#### If silent printing fails:
- Check browser console for error messages
- Verify that the iframe-based printing is working
- Check if there are any browser security restrictions
- Ensure the print.js plugin is accessible at `../../plugins/print.js`

## Expected Behavior
- **F4 pressed** → Invoice automatically submitted with cash payment
- **Printing** → Happens silently in background (no new window/page)
- **Result** → Invoice printed and POS cleared for next customer
- **Cashier Experience** → Faster customer handling, no waiting for print dialogs

## Configuration
**REQUIRED**: The `posa_silent_print` setting must be enabled in your POS Profile for the F4 shortcut to use silent printing.

## Recent Fixes Applied
- Fixed import path for `silentPrint` function (now uses `../../plugins/print.js`)
- Added direct import at top of file for better reliability
- Simplified error handling and logging
- Used the same working implementation as `invoiceOfferMethods.js`

## Notes
- Silent printing uses an iframe-based approach to avoid opening new windows
- If silent printing fails, it falls back to regular printing
- The shortcut includes comprehensive error handling and logging
- All operations are logged to the console for debugging purposes
- The import path has been corrected to match the working implementation
