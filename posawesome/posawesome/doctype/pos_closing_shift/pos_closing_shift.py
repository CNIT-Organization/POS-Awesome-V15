# -*- coding: utf-8 -*-
# Copyright (c) 2020, Youssef Restom and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
import json
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt


class POSClosingShift(Document):
	def validate(self):
		user = frappe.get_all(
			"POS Closing Shift",
			filters={
				"user": self.user,
				"docstatus": 1,
				"pos_opening_shift": self.pos_opening_shift,
				"name": ["!=", self.name],
			},
		)

		if user:
			frappe.throw(
				_(
					"POS Closing Shift {} against {} between selected period".format(
						frappe.bold("already exists"), frappe.bold(self.user)
					)
				),
				title=_("Invalid Period"),
			)

		if frappe.db.get_value("POS Opening Shift", self.pos_opening_shift, "status") != "Open":
			frappe.throw(
				_("Selected POS Opening Shift should be open."),
				title=_("Invalid Opening Entry"),
			)
		self.update_payment_reconciliation()

	def update_payment_reconciliation(self):
		# update the difference values in Payment Reconciliation child table
		# get default precision for site
		precision = frappe.get_cached_value("System Settings", None, "currency_precision") or 3
		for d in self.payment_reconciliation:
			d.difference = flt(d.closing_amount, precision) - flt(d.expected_amount, precision)
		
		# Update credit sales information
		self.update_credit_sales_info()

	def update_credit_sales_info(self):
		"""
		Update credit sales total and unpaid invoices count from unpaid invoices
		"""
		if self.pos_opening_shift:
			unpaid_invoices = get_unpaid_invoices(self.pos_opening_shift)
			credit_sales_total = 0
			unpaid_count = 0
			
			for invoice in unpaid_invoices:
				credit_sales_total += flt(invoice.outstanding_amount)
				unpaid_count += 1
			
			self.credit_sales_total = credit_sales_total
			self.unpaid_invoices_count = unpaid_count

	def on_submit(self):
		opening_entry = frappe.get_doc("POS Opening Shift", self.pos_opening_shift)
		opening_entry.pos_closing_shift = self.name
		opening_entry.set_status()
		self.delete_draft_invoices()
		opening_entry.save()

	def on_cancel(self):
		if frappe.db.exists("POS Opening Shift", self.pos_opening_shift):
			opening_entry = frappe.get_doc("POS Opening Shift", self.pos_opening_shift)
			if opening_entry.pos_closing_shift == self.name:
				opening_entry.pos_closing_shift = ""
				opening_entry.set_status()
				opening_entry.save()

	def delete_draft_invoices(self):
		if frappe.get_value("POS Profile", self.pos_profile, "posa_allow_delete"):
			data = frappe.db.sql(
				"""
                select
                    name
                from
                    `tabSales Invoice`
                where
                    docstatus = 0 and posa_is_printed = 0 and posa_pos_opening_shift = %s
                """,
				(self.pos_opening_shift),
				as_dict=1,
			)

			for invoice in data:
				frappe.delete_doc("Sales Invoice", invoice.name, force=1)

	@frappe.whitelist()
	def get_payment_reconciliation_details(self):
		currency = frappe.get_cached_value("Company", self.company, "default_currency")
		return frappe.render_template(
			"posawesome/posawesome/posawesome/doctype/pos_closing_shift/closing_shift_details.html",
			{"data": self, "currency": currency},
		)

	@frappe.whitelist()
	def refresh_credit_sales(self):
		"""
		Refresh credit sales information from unpaid invoices
		"""
		self.update_credit_sales_info()
		self.save()
		return {
			"credit_sales_total": self.credit_sales_total,
			"unpaid_invoices_count": self.unpaid_invoices_count
		}

	@frappe.whitelist()
	def get_credit_sales_info(self):
		"""
		Get credit sales information for this closing shift
		"""
		if not self.credit_sales_total or not self.unpaid_invoices_count:
			self.update_credit_sales_info()
		
		return {
			"credit_sales_total": self.credit_sales_total or 0,
			"unpaid_invoices_count": self.unpaid_invoices_count or 0,
			"unpaid_invoices": get_unpaid_invoices(self.pos_opening_shift) if self.pos_opening_shift else []
		}


@frappe.whitelist()
def get_cashiers(doctype, txt, searchfield, start, page_len, filters):
	cashiers_list = frappe.get_all("POS Profile User", filters=filters, fields=["user"])
	result = []
	for cashier in cashiers_list:
		user_email = frappe.get_value("User", cashier.user, "email")
		if user_email:
			# Return list of tuples in format (value, label) where value is user ID and label shows both ID and email
			result.append([cashier.user, f"{cashier.user} ({user_email})"])
	return result


@frappe.whitelist()
def get_pos_invoices(pos_opening_shift):
	submit_printed_invoices(pos_opening_shift)
	# Fetch both submitted and unpaid invoices for this POS shift
	data = frappe.db.sql(
		"""
		select
			name
		from
			`tabSales Invoice`
		where
			posa_pos_opening_shift = %s
			and (docstatus = 1 or outstanding_amount > 0)
		""",
		(pos_opening_shift),
		as_dict=1,
	)

	data = [frappe.get_doc("Sales Invoice", d.name).as_dict() for d in data]

	return data


@frappe.whitelist()
def get_payments_entries(pos_opening_shift):
	return frappe.get_all(
		"Payment Entry",
		filters={
			"docstatus": 1,
			"reference_no": pos_opening_shift,
			"payment_type": "Receive",
		},
		fields=[
			"name",
			"mode_of_payment",
			"paid_amount",
			"reference_no",
			"posting_date",
			"party",
		],
	)


@frappe.whitelist()
def get_unpaid_invoices(pos_opening_shift):
	"""
	Get unpaid invoices (credit sales) for a specific POS shift
	"""
	if not pos_opening_shift:
		return []
	
	# Get all invoices for this POS shift first
	all_invoices = frappe.db.sql(
		"""
		select
			name,
			grand_total,
			outstanding_amount,
			customer,
			posting_date,
			docstatus
		from
			`tabSales Invoice`
		where
			posa_pos_opening_shift = %s
		""",
		(pos_opening_shift),
		as_dict=1,
	)
	
	# Debug: Print all invoices found
	print(f"DEBUG: Found {len(all_invoices)} invoices for shift {pos_opening_shift}")
	
	# Filter for unpaid invoices
	unpaid_invoices = []
	for invoice in all_invoices:
		outstanding = flt(invoice.outstanding_amount)
		print(f"DEBUG: Invoice {invoice.name} - Outstanding: {outstanding} (raw: {invoice.outstanding_amount})")
		if outstanding > 0:
			unpaid_invoices.append(invoice)
	
	print(f"DEBUG: Found {len(unpaid_invoices)} unpaid invoices")
	return unpaid_invoices


@frappe.whitelist()
def get_closing_shift_credit_sales(closing_shift_name):
	"""
	Get credit sales information for a specific POS Closing Shift
	"""
	if not frappe.db.exists("POS Closing Shift", closing_shift_name):
		return {"error": "POS Closing Shift not found"}
	
	closing_shift_doc = frappe.get_doc("POS Closing Shift", closing_shift_name)
	
	# Get unpaid invoices for this shift
	unpaid_invoices = get_unpaid_invoices(closing_shift_doc.pos_opening_shift) if closing_shift_doc.pos_opening_shift else []
	
	# Calculate credit sales total
	credit_sales_total = sum(flt(invoice.outstanding_amount) for invoice in unpaid_invoices)
	unpaid_invoices_count = len(unpaid_invoices)
	
	return {
		"closing_shift_name": closing_shift_name,
		"credit_sales_total": credit_sales_total,
		"unpaid_invoices_count": unpaid_invoices_count,
		"unpaid_invoices": unpaid_invoices,
		"pos_opening_shift": closing_shift_doc.pos_opening_shift,
		"user": closing_shift_doc.user,
		"company": closing_shift_doc.company
	}


@frappe.whitelist()
def check_invoice_outstanding(invoice_name):
	"""
	Check the outstanding amount for a specific invoice
	"""
	if not frappe.db.exists("Sales Invoice", invoice_name):
		return {"error": "Invoice not found"}
	
	invoice_doc = frappe.get_doc("Sales Invoice", invoice_name)
	
	return {
		"invoice_name": invoice_name,
		"grand_total": invoice_doc.grand_total,
		"outstanding_amount": invoice_doc.outstanding_amount,
		"paid_amount": invoice_doc.paid_amount,
		"pos_opening_shift": getattr(invoice_doc, 'posa_pos_opening_shift', None),
		"docstatus": invoice_doc.docstatus,
		"customer": invoice_doc.customer
	}


@frappe.whitelist()
def test_credit_sales_simple(closing_shift_name):
	"""
	Simple test function to check credit sales data
	"""
	if not frappe.db.exists("POS Closing Shift", closing_shift_name):
		return {"error": "POS Closing Shift not found"}
	
	closing_shift_doc = frappe.get_doc("POS Closing Shift", closing_shift_name)
	
	# Get all invoices for this shift
	all_invoices = frappe.db.sql(
		"""
		select name, grand_total, outstanding_amount, customer, docstatus
		from `tabSales Invoice`
		where posa_pos_opening_shift = %s
		""",
		(closing_shift_doc.pos_opening_shift),
		as_dict=1,
	)
	
	# Get unpaid invoices
	unpaid_invoices = get_unpaid_invoices(closing_shift_doc.pos_opening_shift)
	
	return {
		"closing_shift": closing_shift_name,
		"pos_opening_shift": closing_shift_doc.pos_opening_shift,
		"all_invoices": all_invoices,
		"unpaid_invoices": unpaid_invoices,
		"total_outstanding": sum(flt(inv.outstanding_amount) for inv in unpaid_invoices)
	}


@frappe.whitelist()
def debug_credit_sales_data(closing_shift_name):
	"""
	Debug function to check credit sales data for a specific closing shift
	"""
	if not frappe.db.exists("POS Closing Shift", closing_shift_name):
		return {"error": "POS Closing Shift not found"}
	
	closing_shift_doc = frappe.get_doc("POS Closing Shift", closing_shift_name)
	
	# Get all invoices for this shift
	all_invoices = frappe.db.sql(
		"""
		select
			name,
			grand_total,
			outstanding_amount,
			customer,
			posting_date,
			docstatus
		from
			`tabSales Invoice`
		where
			posa_pos_opening_shift = %s
		""",
		(closing_shift_doc.pos_opening_shift),
		as_dict=1,
	)
	
	# Get unpaid invoices
	unpaid_invoices = get_unpaid_invoices(closing_shift_doc.pos_opening_shift)
	
	return {
		"closing_shift_name": closing_shift_name,
		"pos_opening_shift": closing_shift_doc.pos_opening_shift,
		"all_invoices_count": len(all_invoices),
		"all_invoices": all_invoices,
		"unpaid_invoices_count": len(unpaid_invoices),
		"unpaid_invoices": unpaid_invoices,
		"total_outstanding": sum(flt(inv.outstanding_amount) for inv in unpaid_invoices)
	}


@frappe.whitelist()
def get_credit_sales_summary(filters=None):
	"""
	Get credit sales summary for multiple closing shifts based on filters
	"""
	if not filters:
		filters = {}
	
	# Build the base query
	base_filters = {"docstatus": 1}  # Only submitted closing shifts
	
	# Add date filters if provided
	if filters.get("from_date"):
		base_filters["period_start_date"] = [">=", filters.get("from_date")]
	if filters.get("to_date"):
		base_filters["period_end_date"] = ["<=", filters.get("to_date")]
	if filters.get("user"):
		base_filters["user"] = filters.get("user")
	if filters.get("company"):
		base_filters["company"] = filters.get("company")
	
	# Get closing shifts
	closing_shifts = frappe.get_all(
		"POS Closing Shift",
		filters=base_filters,
		fields=["name", "user", "company", "period_start_date", "period_end_date", "pos_opening_shift"]
	)
	
	summary_data = []
	total_credit_sales = 0
	total_unpaid_count = 0
	
	for shift in closing_shifts:
		# Get credit sales for this shift
		credit_sales_info = get_closing_shift_credit_sales(shift.name)
		
		if "error" not in credit_sales_info:
			summary_data.append({
				"closing_shift_name": shift.name,
				"user": shift.user,
				"company": shift.company,
				"period_start_date": shift.period_start_date,
				"period_end_date": shift.period_end_date,
				"credit_sales_total": credit_sales_info["credit_sales_total"],
				"unpaid_invoices_count": credit_sales_info["unpaid_invoices_count"]
			})
			
			total_credit_sales += credit_sales_info["credit_sales_total"]
			total_unpaid_count += credit_sales_info["unpaid_invoices_count"]
	
	return {
		"shifts": summary_data,
		"total_credit_sales": total_credit_sales,
		"total_unpaid_count": total_unpaid_count,
		"total_shifts": len(summary_data)
	}


@frappe.whitelist()
def make_closing_shift_from_opening(opening_shift):
	opening_shift = json.loads(opening_shift)
	submit_printed_invoices(opening_shift.get("name"))
	closing_shift = frappe.new_doc("POS Closing Shift")
	closing_shift.pos_opening_shift = opening_shift.get("name")
	closing_shift.period_start_date = opening_shift.get("period_start_date")
	closing_shift.period_end_date = frappe.utils.get_datetime()
	closing_shift.pos_profile = opening_shift.get("pos_profile")
	closing_shift.user = opening_shift.get("user")
	closing_shift.company = opening_shift.get("company")
	closing_shift.grand_total = 0
	closing_shift.net_total = 0
	closing_shift.total_quantity = 0
	closing_shift.credit_sales_total = 0
	closing_shift.unpaid_invoices_count = 0

	invoices = get_pos_invoices(opening_shift.get("name"))

	pos_transactions = []
	taxes = []
	payments = []
	pos_payments_table = []
	for detail in opening_shift.get("balance_details"):
		payments.append(
			frappe._dict(
				{
					"mode_of_payment": detail.get("mode_of_payment"),
					"opening_amount": detail.get("amount") or 0,
					"expected_amount": detail.get("amount") or 0,
				}
			)
		)

	for d in invoices:
		pos_transactions.append(
			frappe._dict(
				{
					"sales_invoice": d.name,
					"posting_date": d.posting_date,
					"grand_total": d.grand_total,
					"customer": d.customer,
				}
			)
		)
		closing_shift.grand_total += flt(d.grand_total)
		closing_shift.net_total += flt(d.net_total)
		closing_shift.total_quantity += flt(d.total_qty)

		# Check if this is a credit sale (unpaid invoice)
		if d.outstanding_amount > 0:
			closing_shift.credit_sales_total += flt(d.outstanding_amount)
			closing_shift.unpaid_invoices_count += 1

		for t in d.taxes:
			existing_tax = [tx for tx in taxes if tx.account_head == t.account_head and tx.rate == t.rate]
			if existing_tax:
				existing_tax[0].amount += flt(t.tax_amount)
			else:
				taxes.append(
					frappe._dict(
						{
							"account_head": t.account_head,
							"rate": t.rate,
							"amount": t.tax_amount,
						}
					)
				)

		for p in d.payments:
			existing_pay = [pay for pay in payments if pay.mode_of_payment == p.mode_of_payment]
			if existing_pay:
				cash_mode_of_payment = frappe.get_value(
					"POS Profile",
					opening_shift.get("pos_profile"),
					"posa_cash_mode_of_payment",
				)
				if not cash_mode_of_payment:
					cash_mode_of_payment = "Cash"
				if existing_pay[0].mode_of_payment == cash_mode_of_payment:
					amount = p.amount - d.change_amount
				else:
					amount = p.amount
				existing_pay[0].expected_amount += flt(amount)
			else:
				payments.append(
					frappe._dict(
						{
							"mode_of_payment": p.mode_of_payment,
							"opening_amount": 0,
							"expected_amount": p.amount,
						}
					)
				)

	pos_payments = get_payments_entries(opening_shift.get("name"))

	for py in pos_payments:
		pos_payments_table.append(
			frappe._dict(
				{
					"payment_entry": py.name,
					"mode_of_payment": py.mode_of_payment,
					"paid_amount": py.paid_amount,
					"posting_date": py.posting_date,
					"customer": py.party,
				}
			)
		)
		existing_pay = [pay for pay in payments if pay.mode_of_payment == py.mode_of_payment]
		if existing_pay:
			existing_pay[0].expected_amount += flt(py.paid_amount)
		else:
			payments.append(
				frappe._dict(
					{
						"mode_of_payment": py.mode_of_payment,
						"opening_amount": 0,
						"expected_amount": py.paid_amount,
					}
				)
			)

	closing_shift.set("pos_transactions", pos_transactions)
	closing_shift.set("payment_reconciliation", payments)
	closing_shift.set("taxes", taxes)
	closing_shift.set("pos_payments", pos_payments_table)

	return closing_shift


@frappe.whitelist()
def submit_closing_shift(closing_shift):
	closing_shift = json.loads(closing_shift)
	
	closing_shift_doc = frappe.get_doc(closing_shift)
	closing_shift_doc.flags.ignore_permissions = True
	closing_shift_doc.save()
	closing_shift_doc.submit()
	
	# Return the closing shift name for frontend to handle printing
	return closing_shift_doc.name


def submit_printed_invoices(pos_opening_shift):
	invoices_list = frappe.get_all(
		"Sales Invoice",
		filters={
			"posa_pos_opening_shift": pos_opening_shift,
			"docstatus": 0,
			"posa_is_printed": 1,
		},
	)
	for invoice in invoices_list:
		invoice_doc = frappe.get_doc("Sales Invoice", invoice.name)
		invoice_doc.submit()


@frappe.whitelist()
def print_cashier_shift_report(closing_shift_name):
	"""
	Print the cashier shift report automatically when closing shift
	"""
	closing_shift_doc = frappe.get_doc("POS Closing Shift", closing_shift_name)
	
	# Get company and user details
	company = frappe.get_doc("Company", closing_shift_doc.company)
	user = frappe.get_doc("User", closing_shift_doc.user)
	pos_profile = frappe.get_doc("POS Profile", closing_shift_doc.pos_profile)
	
	# Get items sold during the shift
	items_sold = get_items_sold_during_shift(closing_shift_doc.pos_opening_shift)
	
	# Get unpaid invoices (credit sales) for this shift
	unpaid_invoices = get_unpaid_invoices(closing_shift_doc.pos_opening_shift)
	
	# Get petty cash entries for this shift
	petty_cash_data = get_petty_cash_entries_for_shift(closing_shift_doc.pos_opening_shift)
	
	# Prepare data for template
	report_data = {
		"closing_shift": closing_shift_doc,
		"company": company,
		"user": user,
		"pos_profile": pos_profile,
		"items_sold": items_sold,
		"unpaid_invoices": unpaid_invoices,
		"petty_cash_data": petty_cash_data,
		"currency": company.default_currency,
		"report_date": frappe.utils.nowdate(),
		"report_time": frappe.utils.nowtime()
	}
	
	# Generate HTML content
	html_content = frappe.render_template(
		"posawesome/posawesome/doctype/pos_closing_shift/cashier_shift_report.html",
		report_data
	)
	
	# Create a temporary print format
	print_format_name = f"temp_cashier_report_{closing_shift_name}"
	
	# Check if print format already exists
	if not frappe.db.exists("Print Format", print_format_name):
		print_format = frappe.new_doc("Print Format")
		print_format.name = print_format_name
		print_format.doc_type = "POS Closing Shift"
		print_format.format = "HTML"
		print_format.html = html_content
		print_format.standard = "No"
		print_format.save(ignore_permissions=True)
	else:
		# Update existing print format
		print_format = frappe.get_doc("Print Format", print_format_name)
		print_format.html = html_content
		print_format.save(ignore_permissions=True)
	
	# Generate print URL
	base_url = frappe.utils.get_url()
	print_url = f"{base_url}/printview?doctype=POS%20Closing%20Shift&name={closing_shift_name}&format={print_format_name}&trigger_print=1"
	
	# Log the print URL for debugging
	frappe.logger().info(f"Cashier shift report print URL: {print_url}")
	
	# Return the print URL for frontend to handle
	return print_url


@frappe.whitelist()
def direct_print_cashier_shift_report(closing_shift_name):
	"""
	Direct print function that generates HTML and returns it for immediate printing
	"""
	closing_shift_doc = frappe.get_doc("POS Closing Shift", closing_shift_name)
	
	# Get company and user details
	company = frappe.get_doc("Company", closing_shift_doc.company)
	user = frappe.get_doc("User", closing_shift_doc.user)
	pos_profile = frappe.get_doc("POS Profile", closing_shift_doc.pos_profile)
	
	# Get items sold during the shift
	items_sold = get_items_sold_during_shift(closing_shift_doc.pos_opening_shift)
	
	# Get unpaid invoices (credit sales) for this shift
	unpaid_invoices = get_unpaid_invoices(closing_shift_doc.pos_opening_shift)
	
	# Get petty cash entries for this shift
	petty_cash_data = get_petty_cash_entries_for_shift(closing_shift_doc.pos_opening_shift)
	
	# Calculate all totals in Python
	# Opening balance should only include cash (not Knet or other payment methods)
	opening_cash_balance = 0
	
	# Calculate cash sales (look for various cash-related payment modes)
	cash_sales_total = 0
	cash_payment_found = False
	cash_closing_amount = 0
	
	for payment in closing_shift_doc.payment_reconciliation:
		payment_mode = payment.mode_of_payment.lower()
		if 'cash' in payment_mode or payment.mode_of_payment == 'Cash':
			# Opening amount is the initial cash in drawer
			opening_cash_balance = flt(payment.opening_amount or 0)
			# Cash sales is the expected amount MINUS opening amount (actual sales only)
			cash_sales_total = flt(payment.expected_amount or 0) - flt(payment.opening_amount or 0)
			cash_payment_found = True
			cash_closing_amount = flt(payment.closing_amount or 0)
	
	# Calculate credit sales from unpaid invoices
	credit_sales_total = sum(flt(invoice.outstanding_amount) for invoice in unpaid_invoices)
	unpaid_invoices_count = len(unpaid_invoices)
	
	# Calculate total payments (excluding credit sales and opening amounts)
	total_payments = sum(flt(payment.expected_amount or 0) - flt(payment.opening_amount or 0) for payment in closing_shift_doc.payment_reconciliation)
	
	# Calculate grand total
	grand_total = cash_sales_total + credit_sales_total
	
	# Calculate total amount (payments + credit sales)
	total_amount = total_payments + credit_sales_total
	
	# Calculate expected cash in drawer (opening cash + cash sales)
	expected_cash_in_drawer = opening_cash_balance + cash_sales_total
	
	# Calculate cash over/short
	cash_over_short = cash_closing_amount - expected_cash_in_drawer if cash_payment_found else 0
	
	# Prepare data for template
	report_data = {
		"closing_shift": closing_shift_doc,
		"company": company,
		"user": user,
		"pos_profile": pos_profile,
		"items_sold": items_sold,
		"unpaid_invoices": unpaid_invoices,
		"petty_cash_data": petty_cash_data,
		"currency": company.default_currency,
		"report_date": frappe.utils.nowdate(),
		"report_time": frappe.utils.nowtime(),
		# Pre-calculated values
		"opening_balance": opening_cash_balance,
		"cash_sales_total": cash_sales_total,
		"credit_sales_total": credit_sales_total,
		"unpaid_invoices_count": unpaid_invoices_count,
		"total_payments": total_payments,
		"grand_total": grand_total,
		"total_amount": total_amount,
		"expected_cash_in_drawer": expected_cash_in_drawer,
		"cash_over_short": cash_over_short,
		"cash_payment_found": cash_payment_found,
		"cash_closing_amount": cash_closing_amount,
		"petty_cash_data": petty_cash_data
	}
	
	# Generate HTML content
	html_content = frappe.render_template(
		"posawesome/posawesome/doctype/pos_closing_shift/cashier_shift_report.html",
		report_data
	)
	
	# Return the HTML content for direct printing
	return html_content


@frappe.whitelist()
def get_petty_cash_entries_for_shift(pos_opening_shift):
	"""
	Get all petty cash entries for a specific POS opening shift
	"""
	petty_cash_entries = frappe.get_all(
		"Petty Cash",
		filters={
			"pos_shift": pos_opening_shift,
			"docstatus": 1  # Only submitted entries
		},
		fields=["entry_type", "amount", "note", "date", "creation"],
		order_by="creation asc"
	)
	
	# Calculate totals
	pay_in_total = sum(entry.amount for entry in petty_cash_entries if entry.entry_type == "Pay In")
	pay_out_total = sum(entry.amount for entry in petty_cash_entries if entry.entry_type == "Pay Out")
	
	return {
		"entries": petty_cash_entries,
		"pay_in_total": pay_in_total,
		"pay_out_total": pay_out_total,
		"net_petty_cash": pay_in_total - pay_out_total
	}


def get_items_sold_during_shift(pos_opening_shift):
	"""
	Get items sold during the shift with quantities and amounts
	"""
	# Get all invoices for this shift
	invoices = frappe.get_all(
		"Sales Invoice",
		filters={
			"posa_pos_opening_shift": pos_opening_shift,
			"docstatus": 1,  # Submitted invoices only
		},
		fields=["name"]
	)
	
	items_summary = {}
	
	for invoice in invoices:
		invoice_doc = frappe.get_doc("Sales Invoice", invoice.name)
		for item in invoice_doc.items:
			item_key = item.item_code
			if item_key not in items_summary:
				items_summary[item_key] = {
					"item_name": item.item_name,
					"qty": 0,
					"amount": 0
				}
			items_summary[item_key]["qty"] += item.qty
			items_summary[item_key]["amount"] += item.amount
	
	# Convert to list and sort by amount
	items_list = []
	for item_code, data in items_summary.items():
		items_list.append({
			"item_code": item_code,
			"item_name": data["item_name"],
			"qty": data["qty"],
			"amount": data["amount"]
		})
	
	# Sort by amount descending
	items_list.sort(key=lambda x: x["amount"], reverse=True)
	
	return items_list


@frappe.whitelist()
def test_cashier_shift_report():
	"""
	Test function to generate a sample cashier shift report
	"""
	# Get the latest closing shift for testing
	latest_closing_shift = frappe.get_all(
		"POS Closing Shift",
		filters={"docstatus": 1},
		fields=["name"],
		order_by="creation desc",
		limit=1
	)
	
	if latest_closing_shift:
		closing_shift_name = latest_closing_shift[0].name
		closing_shift_doc = frappe.get_doc("POS Closing Shift", closing_shift_name)
		
		# Get company and user details
		company = frappe.get_doc("Company", closing_shift_doc.company)
		user = frappe.get_doc("User", closing_shift_doc.user)
		pos_profile = frappe.get_doc("POS Profile", closing_shift_doc.pos_profile)
		
		# Get items sold during the shift
		items_sold = get_items_sold_during_shift(closing_shift_doc.pos_opening_shift)
		
		# Get unpaid invoices (credit sales) for this shift
		unpaid_invoices = get_unpaid_invoices(closing_shift_doc.pos_opening_shift)
		
		# Get petty cash entries for this shift
		petty_cash_data = get_petty_cash_entries_for_shift(closing_shift_doc.pos_opening_shift)
		
		# Prepare data for template
		report_data = {
			"closing_shift": closing_shift_doc,
			"company": company,
			"user": user,
			"pos_profile": pos_profile,
			"items_sold": items_sold,
			"unpaid_invoices": unpaid_invoices,
			"petty_cash_data": petty_cash_data,
			"currency": company.default_currency,
			"report_date": frappe.utils.nowdate(),
			"report_time": frappe.utils.nowtime()
		}
	else:
		# Fallback to sample data if no closing shift exists
		report_data = {
			"closing_shift": {
				"name": "Sample Closing Shift",
				"period_start_date": frappe.utils.nowdatetime(),
				"period_end_date": frappe.utils.nowdatetime(),
				"total_quantity": 0,
				"net_total": 0
			},
			"company": frappe.get_doc("Company", frappe.defaults.get_global_default("company")),
			"user": frappe.get_doc("User", frappe.session.user),
			"pos_profile": frappe.get_doc("POS Profile", frappe.db.get_value("POS Profile", {"disabled": 0}, "name")),
			"items_sold": [],
			"unpaid_invoices": [],
			"petty_cash_data": {
				"entries": [],
				"pay_in_total": 0,
				"pay_out_total": 0,
				"net_petty_cash": 0
			},
			"currency": frappe.defaults.get_global_default("currency"),
			"report_date": frappe.utils.nowdate(),
			"report_time": frappe.utils.nowtime()
		}
	
	html_content = frappe.render_template(
		"posawesome/posawesome/doctype/pos_closing_shift/cashier_shift_report.html",
		report_data
	)
	
	# Create a test print format
	print_format_name = "test_cashier_report"
	
	if not frappe.db.exists("Print Format", print_format_name):
		print_format = frappe.new_doc("Print Format")
		print_format.name = print_format_name
		print_format.doc_type = "POS Closing Shift"
		print_format.format = "HTML"
		print_format.html = html_content
		print_format.standard = "No"
		print_format.save(ignore_permissions=True)
	else:
		print_format = frappe.get_doc("Print Format", print_format_name)
		print_format.html = html_content
		print_format.save(ignore_permissions=True)
	
	# Return the test print URL
	base_url = frappe.utils.get_url()
	print_url = f"{base_url}/printview?doctype=POS%20Closing%20Shift&name=test&format={print_format_name}&trigger_print=0"
	
	return print_url
