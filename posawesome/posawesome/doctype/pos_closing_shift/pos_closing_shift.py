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
			d.difference = +flt(d.closing_amount, precision) - flt(d.expected_amount, precision)

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
			"posawesome/posawesome/doctype/pos_closing_shift/closing_shift_details.html",
			{"data": self, "currency": currency},
		)


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
	data = frappe.db.sql(
		"""
	select
		name
	from
		`tabSales Invoice`
	where
		docstatus = 1 and posa_pos_opening_shift = %s
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
	
	# Prepare data for template
	report_data = {
		"closing_shift": closing_shift_doc,
		"company": company,
		"user": user,
		"pos_profile": pos_profile,
		"items_sold": items_sold,
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
	
	# Prepare data for template
	report_data = {
		"closing_shift": closing_shift_doc,
		"company": company,
		"user": user,
		"pos_profile": pos_profile,
		"items_sold": items_sold,
		"currency": company.default_currency,
		"report_date": frappe.utils.nowdate(),
		"report_time": frappe.utils.nowtime()
	}
	
	# Generate HTML content
	html_content = frappe.render_template(
		"posawesome/posawesome/doctype/pos_closing_shift/cashier_shift_report.html",
		report_data
	)
	
	# Return the HTML content for direct printing
	return html_content


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
		
		# Prepare data for template
		report_data = {
			"closing_shift": closing_shift_doc,
			"company": company,
			"user": user,
			"pos_profile": pos_profile,
			"items_sold": items_sold,
			"currency": company.default_currency,
			"report_date": frappe.utils.nowdate(),
			"report_time": frappe.utils.nowtime()
		}
	else:
		# Fallback to sample data if no closing shift exists
		report_data = {
			"closing_shift": {
				"grand_total": 700.00,
				"net_total": 700.00,
				"total_quantity": 25,
				"credit_sales_total": 150.00,
				"unpaid_invoices_count": 2,
				"period_start_date": "2025-08-07 08:00:00",
				"period_end_date": "2025-08-07 20:00:00",
				"payment_reconciliation": [
					{
						"mode_of_payment": "Cash",
						"opening_amount": 25.00,
						"closing_amount": 678.00,
						"difference": -4.27,
						"expected_amount": 673.73
					},
					{
						"mode_of_payment": "Knet",
						"opening_amount": 0.00,
						"closing_amount": 0.00,
						"difference": 0.00,
						"expected_amount": 0.00
					}
				]
			},
			"company": {
				"name": "Yes Fresh",
				"company_name": "Yes Fresh",
				"default_currency": "KWD"
			},
			"user": {
				"name": "Administrator",
				"full_name": "Administrator"
			},
			"pos_profile": {
				"company_address": "SAS test"
			},
			"items_sold": [
				{
					"item_name": "Fresh Vegetables",
					"qty": 10,
					"amount": 500.00
				},
				{
					"item_name": "Organic Fruits",
					"qty": 5,
					"amount": 250.00
				},
				{
					"item_name": "Dairy Products",
					"qty": 20,
					"amount": 750.00
				}
			],
			"currency": "KWD",
			"report_date": "2025-08-07",
			"report_time": "20:45:00"
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
