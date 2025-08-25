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
			e.preventDefault();
			e.stopPropagation();
			this.cashPaymentAndPrint();
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

	async cashPaymentAndPrint() {
		try {
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

			const totalAmount = this.items.reduce((sum, item) => {
				return sum + (item.amount || (item.rate * item.qty) || 0);
			}, 0);

			const roundedTotal = this.flt(totalAmount, this.currency_precision);

			if (!this.invoice_doc) {
				this.invoice_doc = {};
			}

			this.invoice_doc.doctype = "Sales Invoice";
			this.invoice_doc.customer = this.customer;
			this.invoice_doc.items = this.items.map(item => ({
				...item,
				doctype: "Sales Invoice Item"
			}));
			this.invoice_doc.grand_total = totalAmount;
			this.invoice_doc.total = totalAmount;
			this.invoice_doc.net_total = totalAmount;
			this.invoice_doc.rounded_total = roundedTotal;
			this.invoice_doc.base_grand_total = totalAmount;
			this.invoice_doc.base_total = totalAmount;
			this.invoice_doc.base_net_total = totalAmount;
			this.invoice_doc.base_rounded_total = roundedTotal;
			this.invoice_doc.currency = this.pos_profile?.currency || "KWD";
			this.invoice_doc.company = this.pos_profile?.company || "Yes Fresh";
			this.invoice_doc.conversion_rate = 1;
			this.invoice_doc.plc_conversion_rate = 1;
			this.invoice_doc.price_list_currency = this.pos_profile?.currency || "KWD";
			this.invoice_doc.is_pos = 1;
			this.invoice_doc.posa_pos_opening_shift = this.pos_opening_shift?.name;
			this.invoice_doc.pos_profile = this.pos_profile?.name;
			this.invoice_doc.company = this.pos_opening_shift?.company || this.pos_profile?.company || "Yes Fresh";
			const today = new Date().toISOString().split('T')[0];
			this.invoice_doc.posting_date = this.posting_date_display ? this.formatDateForBackend(this.posting_date_display) : today;
			this.invoice_doc.due_date = this.posting_date_display ? this.formatDateForBackend(this.posting_date_display) : today;
			this.invoice_doc.update_stock = 1;
			this.invoice_doc.ignore_pricing_rule = 1;
			this.invoice_doc.posa_is_printed = 1;

			if (!this.invoice_doc.payments) {
				this.invoice_doc.payments = [];
			}

			if (this.pos_profile && this.pos_profile.payments) {
				this.invoice_doc.payments = this.pos_profile.payments.map(payment => ({
					...payment,
					amount: 0,
					base_amount: 0
				}));
			}

			const cashPayment = this.invoice_doc.payments.find(p => 
				p.mode_of_payment && p.mode_of_payment.toLowerCase().includes("cash")
			);
			if (cashPayment) {
				cashPayment.amount = roundedTotal;
				cashPayment.base_amount = roundedTotal;
				cashPayment.default = 1;
			}

			this.eventBus.emit("send_invoice_doc_payment", this.invoice_doc);
			
			setTimeout(() => {
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
							this.printInvoiceByName(r.message.name);
							
							this.eventBus.emit("show_message", {
								title: __("Invoice {0} submitted and printed", [r.message.name]),
								color: "success",
							});
							
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
