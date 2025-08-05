export default {
	shortOpenFirstItem(e) {
		if (e.key.toLowerCase() === "a" && (e.ctrlKey || e.metaKey)) {
			try {
				e.preventDefault();
				e.stopPropagation();

				if (!this.items || this.items.length === 0) {
					console.log("No items to expand/collapse");
					return;
				}

				const firstItem = this.items[0];
				console.log("Processing first item:", firstItem.item_code);

				// Check if first item is currently expanded using its ID
				const isExpanded = this.expanded.includes(firstItem.posa_row_id);

				// Toggle expanded state using item ID
				if (isExpanded) {
					console.log("Collapsing item:", firstItem.item_code);
					this.expanded = [];
				} else {
					console.log("Expanding item:", firstItem.item_code);
					this.expanded = [firstItem.posa_row_id];
					// Update item details when expanding
					this.$nextTick(() => {
						this.update_item_detail(firstItem);
					});
				}
			} catch (error) {
				console.error("Error in shortOpenFirstItem:", error);
				this.eventBus.emit("show_message", {
					title: __("Error toggling item details"),
					color: "error",
				});
			}
		}
	},

	handleExpandedUpdate(newExpanded) {
		console.log("Expanded state updated:", newExpanded);
		this.expanded = newExpanded;

		// Update item details for newly expanded items
		if (newExpanded && newExpanded.length > 0) {
			const expandedItemId = newExpanded[0];
			const expandedItem = this.items.find((item) => item.posa_row_id === expandedItemId);
			if (expandedItem) {
				this.$nextTick(() => {
					this.update_item_detail(expandedItem);
				});
			}
		}
	},

	// Keyboard shortcut: open payment dialog
	shortOpenPayment(e) {
		if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			this.show_payment();
		}
	},

	// Keyboard shortcut: delete first item from the invoice
	shortDeleteFirstItem(e) {
		if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			this.remove_item(this.items[0]);
		}
	},

	shortSelectDiscount(e) {
		console.log("Shortcut pressed:", e.key, e.ctrlKey);
		if (e.key.toLowerCase() === "e" && (e.ctrlKey || e.metaKey)) {
			console.log("Focusing discount field");
			e.preventDefault();
			e.stopPropagation();
			if (this.$refs.discount) {
				this.$refs.discount.focus();
				console.log("Discount field focused");
			} else {
				console.log("Discount field ref not found");
			}
		}
	},

	// Keyboard shortcut: Home key - Open cash drawer
	shortOpenCashDrawer(e) {
		if (e.key === "Home") {
			e.preventDefault();
			e.stopPropagation();
			this.openCashDrawer();
		}
	},

	// Keyboard shortcut: End key - Recall today's invoices
	shortRecallTodaysInvoices(e) {
		if (e.key === "End") {
			e.preventDefault();
			e.stopPropagation();
			this.recallTodaysInvoices();
		}
	},

	// Keyboard shortcut: F4 key - Cash payment and print
	shortCashPaymentAndPrint(e) {
		if (e.key === "F4") {
			e.preventDefault();
			e.stopPropagation();
			this.cashPaymentAndPrint();
		}
	},

	// Method to open cash drawer
	async openCashDrawer() {
		try {
			const result = await frappe.call({
				method: "posawesome.posawesome.api.invoices.open_cash_drawer",
				args: {},
			});
			
			if (result.message && result.message.success) {
				this.eventBus.emit("show_message", {
					title: __("Cash drawer opened"),
					color: "success",
				});
			} else {
				this.eventBus.emit("show_message", {
					title: __("Failed to open cash drawer"),
					color: "error",
				});
			}
		} catch (error) {
			console.error("Error opening cash drawer:", error);
			this.eventBus.emit("show_message", {
				title: __("Error opening cash drawer"),
				color: "error",
			});
		}
	},

	// Method to recall today's invoices
	async recallTodaysInvoices() {
		try {
			if (!this.pos_profile || !this.pos_profile.company) {
				this.eventBus.emit("show_message", {
					title: __("Please select a POS profile first"),
					color: "warning",
				});
				return;
			}

			const result = await frappe.call({
				method: "posawesome.posawesome.api.invoices.get_todays_invoices",
				args: {
					company: this.pos_profile.company,
					user: frappe.session.user,
				},
			});

			if (result.message && result.message.length > 0) {
				// Show a dialog to select which invoice to recall
				this.showInvoiceSelectionDialog(result.message);
			} else {
				this.eventBus.emit("show_message", {
					title: __("No invoices found for today"),
					color: "info",
				});
			}
		} catch (error) {
			console.error("Error recalling today's invoices:", error);
			this.eventBus.emit("show_message", {
				title: __("Error recalling invoices"),
				color: "error",
			});
		}
	},

	// Method to show invoice selection dialog
	showInvoiceSelectionDialog(invoices) {
		// Create a simple dialog to select an invoice
		const dialog = frappe.msgprint({
			title: __("Select Invoice to Recall"),
			message: `
				<div style="max-height: 300px; overflow-y: auto;">
					${invoices.map((invoice, index) => `
						<div style="padding: 8px; border-bottom: 1px solid #eee; cursor: pointer;" 
							 onclick="window.recallInvoice('${invoice.name}')">
							<strong>${invoice.name}</strong> - ${invoice.customer_name || invoice.customer}<br>
							<small>${invoice.posting_date} - ${this.formatCurrency(invoice.grand_total)}</small>
						</div>
					`).join('')}
				</div>
			`,
			primary_action: {
				label: __("Close"),
				action: () => dialog.hide(),
			},
		});

		// Add global function to recall invoice
		window.recallInvoice = (invoiceName) => {
			this.loadInvoiceByName(invoiceName);
			dialog.hide();
		};
	},

	// Method to load invoice by name
	async loadInvoiceByName(invoiceName) {
		try {
			const result = await frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Sales Invoice",
					name: invoiceName,
				},
			});

			if (result.message) {
				// Load the invoice into the current session
				this.load_invoice(result.message);
				this.eventBus.emit("show_message", {
					title: __("Invoice loaded successfully"),
					color: "success",
				});
			}
		} catch (error) {
			console.error("Error loading invoice:", error);
			this.eventBus.emit("show_message", {
				title: __("Error loading invoice"),
				color: "error",
			});
		}
	},

	// Method to handle cash payment and print
	async cashPaymentAndPrint() {
		try {
			// First, check if there are items in the invoice
			if (!this.items || this.items.length === 0) {
				this.eventBus.emit("show_message", {
					title: __("Please add items to the invoice first"),
					color: "warning",
				});
				return;
			}

			// Check if customer is selected - check both this.customer and invoice_doc.customer
			if (!this.customer && (!this.invoice_doc || !this.invoice_doc.customer)) {
				this.eventBus.emit("show_message", {
					title: __("Please select a customer first"),
					color: "warning",
				});
				return;
			}

			// Ensure customer is set in invoice_doc if it's only in this.customer
			if (this.customer && (!this.invoice_doc || !this.invoice_doc.customer)) {
				if (!this.invoice_doc) {
					this.invoice_doc = {};
				}
				this.invoice_doc.customer = this.customer;
			}

			// Set cash payment to the full amount
			this.setCashPaymentToFullAmount();

			// Submit the invoice with print flag
			this.submitInvoiceWithPrint();
		} catch (error) {
			console.error("Error in cash payment and print:", error);
			this.eventBus.emit("show_message", {
				title: __("Error processing cash payment"),
				color: "error",
			});
		}
	},

	// Helper method to set cash payment to full amount
	setCashPaymentToFullAmount() {
		if (!this.invoice_doc) {
			this.invoice_doc = {};
		}
		
		if (!this.invoice_doc.payments) {
			// Initialize payments if not exists
			this.invoice_doc.payments = [];
		}

		// Calculate total amount from items if not available in invoice_doc
		let totalAmount = this.invoice_doc.grand_total || this.invoice_doc.rounded_total || 0;
		
		if (totalAmount === 0 && this.items && this.items.length > 0) {
			// Calculate from items
			totalAmount = this.items.reduce((sum, item) => {
				return sum + (item.amount || (item.rate * item.qty) || 0);
			}, 0);
		}
		
		// Find cash payment method and set it to full amount
		let cashPaymentFound = false;
		this.invoice_doc.payments.forEach((payment) => {
			if (payment.mode_of_payment.toLowerCase().includes("cash")) {
				payment.amount = totalAmount;
				payment.base_amount = totalAmount;
				cashPaymentFound = true;
			}
		});

		// If no cash payment found, create one
		if (!cashPaymentFound && this.pos_profile && this.pos_profile.payments) {
			const cashPayment = this.pos_profile.payments.find(p => 
				p.mode_of_payment.toLowerCase().includes("cash")
			);
			if (cashPayment) {
				this.invoice_doc.payments.push({
					mode_of_payment: cashPayment.mode_of_payment,
					amount: totalAmount,
					base_amount: totalAmount,
					type: "Cash"
				});
			}
		}

		// Clear other payment methods
		this.invoice_doc.payments.forEach((payment) => {
			if (!payment.mode_of_payment.toLowerCase().includes("cash")) {
				payment.amount = 0;
				payment.base_amount = 0;
			}
		});

		// Update the display
		this.$forceUpdate();
	},

	// Helper method to submit invoice with print
	submitInvoiceWithPrint() {
		// Emit event to trigger payment submission with print
		this.eventBus.emit("submit_invoice_with_print");
	},
};
