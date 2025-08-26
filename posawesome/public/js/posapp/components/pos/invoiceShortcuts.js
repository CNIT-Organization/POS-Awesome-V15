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

				const isExpanded = this.expanded.includes(firstItem.posa_row_id);

				if (isExpanded) {
					console.log("Collapsing item:", firstItem.item_code);
					this.expanded = [];
				} else {
					console.log("Expanding item:", firstItem.item_code);
					this.expanded = [firstItem.posa_row_id];
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

	shortOpenPayment(e) {
		if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			this.show_payment();
		}
	},

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



	shortRecallTodaysInvoices(e) {
		if (e.key === "End") {
			e.preventDefault();
			e.stopPropagation();
			this.recallTodaysInvoices();
		}
	},

	shortCashPaymentAndPrint(e) {
		if (e.key === "F4") {
			console.log("F4 key pressed - triggering cash payment and print");
			e.preventDefault();
			e.stopPropagation();
			this.cashPaymentAndPrint();
		}
	},

	shortSubmitAndPrint(e) {
		if (e.key === "F6" || e.keyCode === 117 || e.which === 117) {
			e.preventDefault();
			e.stopPropagation();
			
			// F6: Use existing built-in functions - same as clicking "Pay" then "Submit & Print"
			this.eventBus.emit("show_payment", "true");
			
			// Listen for when payment page is ready, then submit
			const checkPaymentReady = () => {
				if (this.invoice_doc && this.invoice_doc.payments && this.invoice_doc.payments.length > 0) {
					// Payment page is ready, submit with print
					this.eventBus.emit("submit_with_print");
					// Remove the listener since we don't need it anymore
					this.eventBus.off("register_invoice", checkPaymentReady);
				} else {
					// Not ready yet, check again in 100ms
					setTimeout(checkPaymentReady, 100);
				}
			};
			
			// Start checking after a short delay
			setTimeout(checkPaymentReady, 200);
		}
	},

	shortEditPrice(e) {
		if (e.key === "/") {
			e.preventDefault();
			e.stopPropagation();
			this.editPrice();
		}
	},

	shortEditQuantity(e) {
		if (e.key === "F5") {
			e.preventDefault();
			e.stopPropagation();
			this.editQuantity();
		}
	},

	shortShowShortcutsHelp(e) {
		if (e.key === "F1") {
			e.preventDefault();
			e.stopPropagation();
			this.showShortcutsHelp();
		}
	},

	showShortcutsHelp() {
		const shortcuts = [
			{
				category: "🎯 Quick Actions",
				shortcuts: [
					{ key: "F1", description: "Show this shortcuts help dialog" },
					{ key: "F4", description: "Quick cash payment → submit → print" },
					{ key: "F6", description: "Submit current invoice and print directly" },
					{ key: "End", description: "Recall today's invoices with Return/Print options" }
				]
			},
			{
				category: "📝 Item Management",
				shortcuts: [
					{ key: "/", description: "Edit price of first item" },
					{ key: "F5", description: "Edit quantity of first item (popup)" },
					{ key: "Ctrl+A", description: "Toggle expand/collapse first item details" },
					{ key: "Ctrl+D", description: "Delete first item from invoice" }
				]
			},
			{
				category: "💰 Payment & Invoice",
				shortcuts: [
					{ key: "Ctrl+S", description: "Open payment dialog" },
					{ key: "Ctrl+E", description: "Focus discount field" },
					{ key: "Ctrl+X", description: "Submit payment (when in payment screen)" }
				]
			},
			{
				category: "🖨️ Printing & Receipts",
				shortcuts: [
					{ key: "F4", description: "Auto-print after cash payment" },
					{ key: "F6", description: "Submit and print current invoice" },
					{ key: "End → Print", description: "Print any today's invoice" }
				]
			},
			{
				category: "💾 Invoice Management",
				shortcuts: [
					{ key: "End → Return", description: "Load any today's invoice back to POS" },
					{ key: "Hold Button", description: "Save current invoice as draft and clear" },
					{ key: "Release Button", description: "Load previously saved draft invoices" }
				]
			}
		];

		let helpContent = `
			<div style="max-height: 70vh; overflow-y: auto; font-family: Arial, sans-serif;">
				<div style="text-align: center; margin-bottom: 20px; padding: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px;">
					<h2 style="margin: 0; font-size: 24px;">🎯 POS Awesome Keyboard Shortcuts</h2>
					<p style="margin: 5px 0 0 0; opacity: 0.9;">Master your POS workflow with these powerful shortcuts</p>
				</div>
		`;

		shortcuts.forEach(category => {
			helpContent += `
				<div style="margin-bottom: 25px; background: #f8f9fa; border-radius: 8px; padding: 15px; border-left: 4px solid #667eea;">
					<h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">${category.category}</h3>
					<div style="display: grid; gap: 8px;">
			`;
			
			category.shortcuts.forEach(shortcut => {
				helpContent += `
					<div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e9ecef;">
						<span style="font-weight: bold; color: #495057; min-width: 120px; text-align: center; padding: 4px 8px; background: #e9ecef; border-radius: 4px; font-family: 'Courier New', monospace;">${shortcut.key}</span>
						<span style="color: #6c757d; margin-left: 15px;">${shortcut.description}</span>
					</div>
				`;
			});
			
			helpContent += `
					</div>
				</div>
			`;
		});

		helpContent += `
				<div style="margin-top: 20px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px;">
					<h4 style="margin: 0 0 10px 0; color: #856404;">💡 Pro Tips:</h4>
					<ul style="margin: 0; padding-left: 20px; color: #856404;">
						<li>Use <strong>F4</strong> for quick cash transactions</li>
						<li>Use <strong>F6</strong> to submit and print current invoice</li>
						<li>Press <strong>End</strong> to find and reprint today's invoices</li>
						<li>Use <strong>/</strong> and <strong>.</strong> to quickly edit first item</li>
						<li>Hold invoices for later with the <strong>Hold</strong> button</li>
					</ul>
				</div>
			</div>
		`;

		const dialog = frappe.msgprint({
			title: __("POS Awesome Keyboard Shortcuts"),
			message: helpContent,
			primary_action: {
				label: __("Got it!"),
				action: () => dialog.hide(),
			},
			secondary_action: {
				label: __("Print Shortcuts"),
				action: () => this.printShortcutsHelp(),
			},
		});
	},

	printShortcutsHelp() {
		const shortcuts = [
			{ key: "F1", description: "Show shortcuts help" },
			{ key: "F4", description: "Quick cash payment → submit → print" },
			{ key: "F6", description: "Submit current invoice and print directly" },
			{ key: "Home", description: "Open cash drawer" },
			{ key: "End", description: "Recall today's invoices" },
			{ key: "/", description: "Edit price of first item" },
			{ key: "F5", description: "Edit quantity of first item" },
			{ key: "Ctrl+A", description: "Toggle first item details" },
			{ key: "Ctrl+D", description: "Delete first item" },
			{ key: "Ctrl+S", description: "Open payment dialog" },
			{ key: "Ctrl+E", description: "Focus discount field" },
			{ key: "Ctrl+X", description: "Submit payment" }
		];

		let printContent = `
			<html>
			<head>
				<title>POS Awesome Shortcuts</title>
				<style>
					body { font-family: Arial, sans-serif; margin: 20px; }
					.header { text-align: center; margin-bottom: 30px; }
					.shortcut { margin: 10px 0; padding: 10px; border: 1px solid #ccc; }
					.key { font-weight: bold; background: #f0f0f0; padding: 5px 10px; border-radius: 3px; }
					.description { margin-left: 10px; }
					.category { margin: 20px 0; font-weight: bold; font-size: 18px; }
				</style>
			</head>
			<body>
				<div class="header">
					<h1>🎯 POS Awesome Keyboard Shortcuts</h1>
					<p>Master your POS workflow with these powerful shortcuts</p>
				</div>
		`;

		shortcuts.forEach(shortcut => {
			printContent += `
				<div class="shortcut">
					<span class="key">${shortcut.key}</span>
					<span class="description">${shortcut.description}</span>
				</div>
			`;
		});

		printContent += `
				<div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
					<h3>💡 Pro Tips:</h3>
					<ul>
						<li>Use F4 for quick cash transactions</li>
						<li>Use F6 to submit and print current invoice</li>
						<li>Press End to find and reprint today's invoices</li>
						<li>Use / and . to quickly edit first item</li>
						<li>Hold invoices for later with the Hold button</li>
					</ul>
				</div>
			</body>
			</html>
		`;

		const printWindow = window.open('', '_blank');
		printWindow.document.write(printContent);
		printWindow.document.close();
		printWindow.print();
	},



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

	showInvoiceSelectionDialog(invoices) {
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

		window.recallInvoice = (invoiceName) => {
			this.loadInvoiceByName(invoiceName);
			dialog.hide();
		};

		window.printInvoice = (invoiceName) => {
			this.printInvoiceByName(invoiceName);
		};
	},

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
				import("../plugins/print.js").then(({ silentPrint }) => {
					silentPrint(url);
				}).catch(() => {
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

	/**
	 * F4 Shortcut: Direct cash payment and print
	 * 
	 * This method handles the complete invoice submission process:
	 * 1. Validates all required data (items, customer, POS shift, profile)
	 * 2. Uses the same invoice processing as show_payment() for consistency
	 * 3. Sets cash payment to the correct amount based on server-calculated totals
	 * 4. Submits invoice directly to backend
	 * 5. Prints invoice automatically
	 * 6. Clears invoice for next use
	 */
	async cashPaymentAndPrint() {
		try {
			console.log("cashPaymentAndPrint method called - direct submission mode");
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

			if (!this.pos_opening_shift || !this.pos_opening_shift.name) {
				this.eventBus.emit("show_message", {
					title: __("No active POS shift found. Please start a POS shift first."),
					color: "error",
				});
				return;
			}

			if (this.pos_opening_shift.status !== "Open") {
				this.eventBus.emit("show_message", {
					title: __("POS shift is not open. Please start a new POS shift first."),
					color: "error",
				});
				return;
			}

			if (!this.pos_profile || !this.pos_profile.name) {
				this.eventBus.emit("show_message", {
					title: __("No POS profile found. Please select a POS profile first."),
					color: "error",
				});
				return;
			}

			if (this.pos_opening_shift.pos_profile !== this.pos_profile.name) {
				this.eventBus.emit("show_message", {
					title: __("POS shift is not for the same POS profile. Please start a new POS shift."),
					color: "error",
				});
				return;
			}

			if (this.pos_opening_shift.company !== this.pos_profile.company) {
				this.eventBus.emit("show_message", {
					title: __("POS shift is not for the same company. Please start a new POS shift."),
					color: "error",
				});
				return;
			}

			console.log("All validations passed - preparing invoice using same method as show_payment()");
			
			// USE THE SAME METHOD AS show_payment() FOR CONSISTENCY
			let invoice_doc;
			if (
				this.invoiceType === "Order" &&
				this.pos_profile.posa_create_only_sales_order &&
				!this.new_delivery_date &&
				!this.invoice_doc.posa_delivery_date
			) {
				console.log("Building local Sales Order doc for payment");
				invoice_doc = this.get_invoice_doc();
			} else if (this.invoice_doc.doctype == "Sales Order" && this.invoiceType === "Invoice") {
				console.log("Processing Sales Order payment");
				invoice_doc = await this.process_invoice_from_order();
			} else {
				console.log("Processing regular invoice");
				invoice_doc = this.process_invoice();
			}

			if (!invoice_doc) {
				console.log("Failed to process invoice");
				this.eventBus.emit("show_message", {
					title: __("Error processing invoice"),
					color: "error",
				});
				return;
			}

			// Update invoice_doc with current currency info (same as show_payment)
			invoice_doc.currency = this.selected_currency || this.pos_profile.currency;
			invoice_doc.conversion_rate = this.conversion_rate || 1;
			invoice_doc.plc_conversion_rate = this.exchange_rate || 1;

			// Check if this is a return invoice (same logic as show_payment)
			if (this.isReturnInvoice || invoice_doc.is_return) {
				console.log("Preparing RETURN invoice for payment with:", {
					is_return: invoice_doc.is_return,
					invoiceType: this.invoiceType,
					return_against: invoice_doc.return_against,
					items: invoice_doc.items.length,
					grand_total: invoice_doc.grand_total,
				});

				// For return invoices, explicitly ensure all amounts are negative
				invoice_doc.is_return = 1;
				if (invoice_doc.grand_total > 0) invoice_doc.grand_total = -Math.abs(invoice_doc.grand_total);
				if (invoice_doc.rounded_total > 0)
					invoice_doc.rounded_total = -Math.abs(invoice_doc.rounded_total);
				if (invoice_doc.total > 0) invoice_doc.total = -Math.abs(invoice_doc.total);
				if (invoice_doc.base_grand_total > 0)
					invoice_doc.base_grand_total = -Math.abs(invoice_doc.base_grand_total);
				if (invoice_doc.base_rounded_total > 0)
					invoice_doc.base_rounded_total = -Math.abs(invoice_doc.base_rounded_total);
				if (invoice_doc.base_total > 0) invoice_doc.base_total = -Math.abs(invoice_doc.base_total);

				// Ensure all items have negative quantity and amount
				if (invoice_doc.items && invoice_doc.items.length) {
					invoice_doc.items.forEach((item) => {
						if (item.qty > 0) item.qty = -Math.abs(item.qty);
						if (item.stock_qty > 0) item.stock_qty = -Math.abs(item.stock_qty);
						if (item.amount > 0) item.amount = -Math.abs(item.amount);
					});
				}
			}

			// Get payments with correct sign (positive/negative) - same as show_payment
			invoice_doc.payments = this.get_payments();
			console.log("Generated payments:", invoice_doc.payments);

			// Double-check return invoice payments are negative
			if ((this.isReturnInvoice || invoice_doc.is_return) && invoice_doc.payments.length) {
				invoice_doc.payments.forEach((payment) => {
					if (payment.amount > 0) payment.amount = -Math.abs(payment.amount);
					if (payment.base_amount > 0) payment.base_amount = -Math.abs(payment.base_amount);
				});
				console.log("Ensured negative payment amounts for return:", invoice_doc.payments);
			}

			// Set up cash payment for the full amount based on server-calculated totals
			if (invoice_doc.payments && invoice_doc.payments.length) {
				const cashPayment = invoice_doc.payments.find(p => 
					p.mode_of_payment && p.mode_of_payment.toLowerCase().includes("cash")
				);
				
				if (cashPayment) {
					// Use the same logic as the regular payment flow
					// The server has already calculated the correct totals with taxes and rounding
					let finalPaymentAmount;
					if (invoice_doc.disable_rounded_total) {
						// No rounding: use grand_total
						finalPaymentAmount = this.flt(invoice_doc.grand_total, 3);
					} else {
						// With rounding: use rounded_total
						finalPaymentAmount = this.flt(invoice_doc.rounded_total, 3);
					}
					
					console.log("Setting cash payment using server-calculated totals:");
					console.log("- grand_total (server):", invoice_doc.grand_total);
					console.log("- rounded_total (server):", invoice_doc.rounded_total);
					console.log("- disable_rounded_total:", invoice_doc.disable_rounded_total);
					console.log("- final payment amount:", finalPaymentAmount);
					
					cashPayment.amount = finalPaymentAmount;
					cashPayment.base_amount = finalPaymentAmount;
					cashPayment.default = 1;
					
					// FINAL VERIFICATION: Ensure no outstanding amount
					const expectedOutstanding = invoice_doc.grand_total - finalPaymentAmount;
					console.log("Final verification - no outstanding amount:");
					console.log("- grand_total (server):", invoice_doc.grand_total);
					console.log("- cash_payment:", finalPaymentAmount);
					console.log("- expected_outstanding:", expectedOutstanding);
					console.log("- Should be 0 or negative (change):", expectedOutstanding <= 0 ? "✅" : "❌");
				}
			}

			console.log("Invoice prepared using server method, submitting directly...");
			console.log("Final invoice amounts (from server):");
			console.log("- grand_total:", invoice_doc.grand_total);
			console.log("- rounded_total:", invoice_doc.rounded_total);
			console.log("- disable_rounded_total:", invoice_doc.disable_rounded_total);
			console.log("- write_off_amount:", invoice_doc.write_off_amount);
			console.log("- paid_amount:", invoice_doc.paid_amount);
			console.log("- cash payment amount:", invoice_doc.payments ? invoice_doc.payments.find(p => p.default)?.amount : "No cash payment");
			
			// Submit the invoice directly without opening payment dialog
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
					invoice: invoice_doc
				},
				callback: (r) => {
					if (r.message && r.message.name) {
						// Print the invoice immediately
						this.printInvoiceByName(r.message.name);
						
						this.eventBus.emit("show_message", {
							title: __("Invoice {0} submitted and printed", [r.message.name]),
							color: "success",
						});
						
						// Clear the invoice for next use
						this.eventBus.emit("clear_invoice");
					} else {
						this.eventBus.emit("show_message", {
							title: __("Invoice submitted but print failed"),
							color: "warning",
						});
					}
				},
				error: (r) => {
					console.error("Error submitting invoice:", r);
					this.eventBus.emit("show_message", {
						title: __("Error submitting invoice"),
						color: "error",
					});
				}
			});

		} catch (error) {
			console.error("Error in cashPaymentAndPrint:", error);
			this.eventBus.emit("show_message", {
				title: __("Error processing cash payment"),
				color: "error",
				message: error.message,
			});
		}
	},



	/**
	 * F6 Shortcut: Direct submit and print current invoice
	 * 
	 * This method handles the complete invoice submission process:
	 * 1. Validates all required data (items, customer, POS shift, profile)
	 * 2. Creates invoice document with current items and amounts
	 * 3. Sets up proper payment structure
	 * 4. Submits invoice directly to backend
	 * 5. Prints invoice automatically
	 * 6. Clears invoice for next use
	 */
	async submitAndPrintDirect() {
		try {
			
			// Validate required data
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

			if (!this.pos_opening_shift || !this.pos_opening_shift.name) {
				this.eventBus.emit("show_message", {
					title: __("No active POS shift found. Please start a POS shift first."),
					color: "error",
				});
				return;
			}

			if (this.pos_opening_shift.status !== "Open") {
				this.eventBus.emit("show_message", {
					title: __("POS shift is not open. Please start a new POS shift first."),
					color: "error",
				});
				return;
			}

			if (!this.pos_profile || !this.pos_profile.name) {
				this.eventBus.emit("show_message", {
					title: __("No POS profile found. Please select a POS profile first."),
					color: "error",
				});
				return;
			}

			if (this.pos_opening_shift.pos_profile !== this.pos_profile.name) {
				this.eventBus.emit("show_message", {
					title: __("POS shift is not for the same POS profile. Please start a new POS shift."),
					color: "error",
				});
				return;
			}

			if (this.pos_opening_shift.company !== this.pos_profile.company) {
				this.eventBus.emit("show_message", {
					title: __("POS shift is not for the same company. Please start a new POS shift."),
					color: "error",
				});
				return;
			}

			// Calculate totals from current items
			const netTotal = this.items.reduce((sum, item) => {
				return sum + (item.amount || (item.rate * item.qty) || 0);
			}, 0);

			// Add delivery charges if applicable
			const totalWithDelivery = netTotal + (this.delivery_charges_rate || 0);
			
			// Calculate tax amount if applicable
			const taxAmount = this.total_tax || 0;
			
			// Calculate grand total
			const grandTotal = totalWithDelivery + taxAmount;
			
			// Round the total to currency precision
			const roundedTotal = this.flt(grandTotal, this.currency_precision || 2);

			// Prepare the invoice document
			const invoiceDoc = {
				doctype: "Sales Invoice",
				customer: this.customer,
				items: this.items.map(item => ({
					...item,
					doctype: "Sales Invoice Item"
				})),
				net_total: netTotal,
				total: totalWithDelivery,
				grand_total: grandTotal,
				rounded_total: roundedTotal,
				base_net_total: netTotal,
				base_total: totalWithDelivery,
				base_grand_total: grandTotal,
				base_rounded_total: roundedTotal,
				total_taxes_and_charges: taxAmount,
				base_total_taxes_and_charges: taxAmount,
				currency: this.selected_currency || this.pos_profile?.currency || "KWD",
				company: this.pos_profile?.company || "Yes Fresh",
				conversion_rate: this.conversion_rate || 1,
				plc_conversion_rate: this.exchange_rate || 1,
				price_list_currency: this.price_list_currency || this.pos_profile?.currency || "KWD",
				is_pos: 1,
				posa_pos_opening_shift: this.pos_opening_shift?.name,
				pos_profile: this.pos_profile?.name,
				posting_date: this.posting_date_display ? this.formatDateForBackend(this.posting_date_display) : frappe.datetime.nowdate(),
				due_date: this.posting_date_display ? this.formatDateForBackend(this.posting_date_display) : frappe.datetime.nowdate(),
				update_stock: 1,
				ignore_pricing_rule: 1,
				posa_is_printed: 1,
				paid_amount: roundedTotal,
				base_paid_amount: roundedTotal,
				discount_amount: this.discount_amount || 0,
				base_discount_amount: this.discount_amount || 0,
				additional_discount_percentage: this.additional_discount_percentage || 0,
				additional_discount_amount: this.additional_discount_amount || 0
			};

			// Set up payments - cash payment for the full amount
			if (this.pos_profile && this.pos_profile.payments) {
				invoiceDoc.payments = this.pos_profile.payments.map(payment => ({
					...payment,
					amount: 0,
					base_amount: 0
				}));

				const cashPayment = invoiceDoc.payments.find(p => 
					p.mode_of_payment && p.mode_of_payment.toLowerCase().includes("cash")
				);
				if (cashPayment) {
					cashPayment.amount = roundedTotal;
					cashPayment.base_amount = roundedTotal;
					cashPayment.default = 1;
				}
			}

			// Add delivery charges if applicable
			if (this.delivery_charges_rate > 0) {
				invoiceDoc.delivery_charges = this.delivery_charges_rate;
				invoiceDoc.base_delivery_charges = this.delivery_charges_rate;
			}


			
			// Submit the invoice directly
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
					invoice: invoiceDoc
				},
				callback: (r) => {
					if (r.message && r.message.name) {
						// Print the invoice immediately
						this.printInvoiceByName(r.message.name);
						
						this.eventBus.emit("show_message", {
							title: __("Invoice {0} submitted and printed", [r.message.name]),
							color: "success",
						});
						
						// Clear the invoice for next use
						this.eventBus.emit("clear_invoice");
					} else {
						this.eventBus.emit("show_message", {
							title: __("Invoice submitted but print failed"),
							color: "warning",
						});
					}
				},
				error: (r) => {
					console.error("Error submitting invoice:", r);
					this.eventBus.emit("show_message", {
						title: __("Error submitting invoice"),
						color: "error",
					});
				}
			});

		} catch (error) {
			this.eventBus.emit("show_message", {
				title: __("Error processing invoice submission"),
				color: "error",
			});
		}
	},

	editPrice() {
		if (this.items && this.items.length > 0) {
			const lastItem = this.items[this.items.length - 1];
			
			if (!this.expanded.includes(lastItem.posa_row_id)) {
				this.expanded = [lastItem.posa_row_id];
			}
			
			this.$nextTick(() => {
				setTimeout(() => {
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

	editQuantity() {
		if (this.items && this.items.length > 0) {
			const firstItem = this.items[0];
			
			frappe.prompt(__("Enter new quantity for {0}", [firstItem.item_name || firstItem.item_code]), 
				({ value }) => {
					const newQty = parseFloat(value);
					if (!isNaN(newQty) && newQty > 0) {

						firstItem.qty = newQty;
						firstItem.amount = (firstItem.rate || 0) * newQty;
						firstItem.base_amount = firstItem.amount;
						
						if (this.calcStockQty) {
							this.calcStockQty(firstItem, newQty);
						}
						
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
				firstItem.qty || 1
			);
		} else {
			this.eventBus.emit("show_message", {
				title: __("No items to edit"),
				color: "warning",
			});
		}
	},

	formatDateForBackend(date) {
		if (!date) return null;
		if (typeof date === "string") {
			if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
				return date;
			}
			if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(date)) {
				const [d, m, y] = date.split("-");
				return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
			}
		}
		const d = new Date(date);
		if (!isNaN(d.getTime())) {
			const year = d.getFullYear();
			const month = `0${d.getMonth() + 1}`.slice(-2);
			const day = `0${d.getDate()}`.slice(-2);
			return `${year}-${month}-${day}`;
		}
		return date;
	},
};
