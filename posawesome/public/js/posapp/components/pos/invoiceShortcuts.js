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

	// Keyboard shortcut: / key - Edit price
	shortEditPrice(e) {
		if (e.key === "/") {
			e.preventDefault();
			e.stopPropagation();
			this.editPrice();
		}
	},

	// Keyboard shortcut: . key - Edit quantity
	shortEditQuantity(e) {
		if (e.key === ".") {
			e.preventDefault();
			e.stopPropagation();
			this.editQuantity();
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
						<div style="padding: 8px; border-bottom: 1px solid #eee; margin-bottom: 8px;">
							<div style="font-weight: bold;">${invoice.name}</div>
							<div style="font-size: 12px; color: #666;">${invoice.customer_name || invoice.customer}</div>
							<div style="font-size: 12px; color: #666;">${invoice.posting_date} - ${this.formatCurrency(invoice.grand_total)}</div>
							<div style="margin-top: 8px;">
								<button onclick="window.recallInvoice('${invoice.name}')" style="background: #4CAF50; color: white; border: none; padding: 4px 8px; margin-right: 4px; cursor: pointer;">Return</button>
								<button onclick="window.printInvoice('${invoice.name}')" style="background: #2196F3; color: white; border: none; padding: 4px 8px; cursor: pointer;">Print</button>
							</div>
						</div>
					`).join('')}
				</div>
			`,
			primary_action: {
				label: __("Close"),
				action: () => dialog.hide(),
			},
		});

		// Add global functions to recall and print invoice
		window.recallInvoice = (invoiceName) => {
			this.loadInvoiceByName(invoiceName);
			dialog.hide();
		};

		window.printInvoice = (invoiceName) => {
			this.printInvoiceByName(invoiceName);
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

	// Method to print invoice by name
	async printInvoiceByName(invoiceName) {
		try {
			const print_format = this.pos_profile.print_format_for_online || this.pos_profile.print_format;
			const letter_head = this.pos_profile.letter_head || 0;
			const url =
				frappe.urllib.get_base_url() +
				"/printview?doctype=Sales%20Invoice&name=" +
				invoiceName +
				"&trigger_print=1" +
				"&format=" +
				print_format +
				"&no_letterhead=" +
				letter_head;

			if (this.pos_profile.posa_silent_print) {
				// Import silent print if available
				import("../plugins/print.js").then(({ silentPrint }) => {
					silentPrint(url);
				}).catch(() => {
					// Fallback to regular print
					const printWindow = window.open(url, "Print");
					printWindow.addEventListener(
						"load",
						function () {
							printWindow.print();
						},
						{ once: true },
					);
				});
			} else {
				const printWindow = window.open(url, "Print");
				printWindow.addEventListener(
					"load",
					function () {
						printWindow.print();
					},
					{ once: true },
				);
			}

			this.eventBus.emit("show_message", {
				title: __("Printing invoice"),
				color: "success",
			});
		} catch (error) {
			console.error("Error printing invoice:", error);
			this.eventBus.emit("show_message", {
				title: __("Error printing invoice"),
				color: "error",
			});
		}
	},

	// Method to handle cash payment and print - AUTO SUBMIT VERSION
	async cashPaymentAndPrint() {
		try {
			// Basic validation
			if (!this.items || this.items.length === 0) {
				this.eventBus.emit("show_message", {
					title: __("Please add items to the invoice first"),
					color: "warning",
				});
				return;
			}

			if (!this.customer) {
				this.eventBus.emit("show_message", {
					title: __("Please select a customer first"),
					color: "warning",
				});
				return;
			}

			// Calculate total amount
			const totalAmount = this.items.reduce((sum, item) => {
				return sum + (item.amount || (item.rate * item.qty) || 0);
			}, 0);

			// Ensure invoice_doc exists and has proper structure
			if (!this.invoice_doc) {
				this.invoice_doc = {};
			}

			// Set essential invoice data
			this.invoice_doc.doctype = "Sales Invoice";
			this.invoice_doc.customer = this.customer;
			this.invoice_doc.items = this.items.map(item => ({
				...item,
				doctype: "Sales Invoice Item"
			}));
			this.invoice_doc.grand_total = totalAmount;
			this.invoice_doc.total = totalAmount;
			this.invoice_doc.net_total = totalAmount;
			this.invoice_doc.rounded_total = totalAmount;
			this.invoice_doc.base_grand_total = totalAmount;
			this.invoice_doc.base_total = totalAmount;
			this.invoice_doc.base_net_total = totalAmount;
			this.invoice_doc.base_rounded_total = totalAmount;
			this.invoice_doc.currency = this.pos_profile?.currency || "KWD";
			this.invoice_doc.company = this.pos_profile?.company || "Yes Fresh";
			this.invoice_doc.conversion_rate = 1;
			this.invoice_doc.plc_conversion_rate = 1;
			this.invoice_doc.price_list_currency = this.pos_profile?.currency || "KWD";
			this.invoice_doc.is_pos = 1;

			// Initialize payments array with default payment methods from POS profile
			if (!this.invoice_doc.payments) {
				this.invoice_doc.payments = [];
			}

			// Add default payment methods from POS profile
			if (this.pos_profile && this.pos_profile.payments) {
				this.invoice_doc.payments = this.pos_profile.payments.map(payment => ({
					...payment,
					amount: 0,
					base_amount: 0
				}));
			}

			// Set default payment to cash if available
			const cashPayment = this.invoice_doc.payments.find(p => 
				p.mode_of_payment && p.mode_of_payment.toLowerCase().includes("cash")
			);
			if (cashPayment) {
				cashPayment.amount = totalAmount;
				cashPayment.base_amount = totalAmount;
				cashPayment.default = 1;
			}

			// Send the complete invoice document to payment component
			this.eventBus.emit("send_invoice_doc_payment", this.invoice_doc);
			
			// Direct submission with cash payment and print
			setTimeout(() => {
				// Use the proper submission method that returns invoice name
				frappe.call({
					method: "posawesome.posawesome.api.invoices.submit_invoice",
					args: {
						data: {
							total_change: 0,
							paid_change: 0,
							credit_change: 0,
							redeemed_customer_credit: 0,
							customer_credit_dict: [],
							is_cashback: true
						},
						invoice: this.invoice_doc
					},
					callback: (r) => {
						if (r.message && r.message.name) {
							// Print the invoice with the correct name
							this.printInvoiceByName(r.message.name);
							
							// Show success message
							this.eventBus.emit("show_message", {
								title: __("Invoice {0} submitted and printed", [r.message.name]),
								color: "success",
							});
							
							// Clear the invoice
							this.eventBus.emit("clear_invoice");
						} else {
							this.eventBus.emit("show_message", {
								title: __("Invoice submitted but print failed"),
								color: "warning",
							});
						}
					},
					error: (r) => {
						this.eventBus.emit("show_message", {
							title: __("Error submitting invoice"),
							color: "error",
						});
					}
				});
			}, 300);

		} catch (error) {
			console.error("Error in cash payment and print:", error);
			this.eventBus.emit("show_message", {
				title: __("Error processing cash payment"),
				color: "error",
			});
		}
	},

	// Method to edit price
	editPrice() {
		if (this.items && this.items.length > 0) {
			// First, expand the first item if not already expanded
			const firstItem = this.items[0];
			if (!this.expanded.includes(firstItem.posa_row_id)) {
				this.expanded = [firstItem.posa_row_id];
			}
			
			// Focus on the first item's price field after a delay to ensure expansion
			this.$nextTick(() => {
				setTimeout(() => {
					// Look for the rate input field in the expanded item details
					const priceInput = document.querySelector('#rate input, input[id="rate"]');
					if (priceInput) {
						priceInput.focus();
						priceInput.select();
					} else {
						this.eventBus.emit("show_message", {
							title: __("Price field not found. Please expand the item first."),
							color: "warning",
						});
					}
				}, 100);
			});
		} else {
			this.eventBus.emit("show_message", {
				title: __("No items to edit"),
				color: "warning",
			});
		}
	},

	// Method to edit quantity - Show popup for last item
	editQuantity() {
		if (this.items && this.items.length > 0) {
			// Get the last item (most recently added)
			const lastItem = this.items[this.items.length - 1];
			
			// Show a popup dialog to change quantity
			frappe.prompt(__("Enter new quantity for {0}", [lastItem.item_name || lastItem.item_code]), 
				({ value }) => {
					const newQty = parseFloat(value);
					if (!isNaN(newQty) && newQty > 0) {
						// Update the item quantity
						lastItem.qty = newQty;
						lastItem.amount = (lastItem.rate || 0) * newQty;
						lastItem.base_amount = lastItem.amount;
						
						// Trigger stock calculation if available
						if (this.calcStockQty) {
							this.calcStockQty(lastItem, newQty);
						}
						
						// Force update to refresh the display
						this.$forceUpdate();
						
						this.eventBus.emit("show_message", {
							title: __("Quantity updated to {0}", [newQty]),
							color: "success",
						});
					} else {
						this.eventBus.emit("show_message", {
							title: __("Invalid quantity value"),
							color: "error",
						});
					}
				},
				__("Update Quantity"),
				__("Cancel"),
				lastItem.qty || 1
			);
		} else {
			this.eventBus.emit("show_message", {
				title: __("No items to edit"),
				color: "warning",
			});
		}
	},
};
