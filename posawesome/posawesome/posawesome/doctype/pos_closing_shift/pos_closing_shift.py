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
