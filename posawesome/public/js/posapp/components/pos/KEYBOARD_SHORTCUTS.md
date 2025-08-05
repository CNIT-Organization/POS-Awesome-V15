# POS Awesome Keyboard Shortcuts

This document describes the keyboard shortcuts available in POS Awesome.

## General Shortcuts

### Payment and Invoice Management
- **Ctrl+S** - Open payment dialog
- **Ctrl+X** - Submit payment (when in payment screen)
- **Ctrl+D** - Delete first item from invoice
- **Ctrl+A** - Toggle expand/collapse first item details
- **Ctrl+E** - Focus discount field

### New Shortcuts (Added)

#### Cash Drawer Control
- **Home** - Open cash drawer
  - Sends a command to the receipt printer to open the cash drawer
  - Requires proper printer setup with ESC/POS commands

#### Invoice Recall
- **End** - Recall today's invoices
  - Shows a dialog with all invoices from today
  - Allows you to select and load any invoice from today
  - Useful for reprinting or modifying today's invoices

#### Quick Cash Payment
- **F4** - Cash payment and print
  - Automatically sets cash as the payment method
  - Sets the payment amount to the full invoice total
  - Submits the invoice and prints it automatically
  - Requires items to be added and customer to be selected

## Implementation Details

### Cash Drawer
The cash drawer functionality uses a placeholder implementation that logs the command. In a real implementation, you would need to:

1. Configure your receipt printer to support ESC/POS commands
2. Modify the `open_cash_drawer()` method in `posawesome/api/invoices.py` to send actual printer commands
3. Typical ESC/POS command for cash drawer: `ESC p m t1 t2` where m=0, t1=0x19, t2=0xFA

### Invoice Recall
The invoice recall functionality:
1. Fetches all submitted invoices from today for the current company and user
2. Shows a selection dialog with invoice details
3. Allows loading any invoice into the current session
4. Useful for reprinting receipts or making modifications

### Quick Cash Payment
The F4 shortcut:
1. Validates that items are added and customer is selected
2. Automatically sets cash payment to the full invoice amount
3. Clears other payment methods
4. Submits the invoice and prints it automatically

## Technical Notes

- All shortcuts are registered globally when the Invoice component is mounted
- Shortcuts are properly cleaned up when components are unmounted
- Error handling is included for all operations
- User feedback is provided through toast messages
- The shortcuts work with the existing event bus system

## Configuration

The shortcuts are implemented in:
- `posawesome/public/js/posapp/components/pos/invoiceShortcuts.js` - Shortcut definitions
- `posawesome/public/js/posapp/components/pos/Invoice.vue` - Event registration
- `posawesome/public/js/posapp/components/pos/Payments.vue` - Payment handling
- `posawesome/posawesome/api/invoices.py` - Backend API methods 