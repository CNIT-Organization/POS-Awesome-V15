import json
import frappe
from frappe import _
from frappe.utils import cint, getdate


def _get_recipe_row_dict(row):
	item = frappe.db.get_value(
		"Item",
		row.item_code,
		["has_batch_no", "has_serial_no", "stock_uom", "is_stock_item", "item_name"],
		as_dict=True,
	) or {}
	uom = row.uom or item.get("stock_uom")
	return {
		"item_code": row.item_code,
		"item_name": item.get("item_name") or row.item_code,
		"qty": row.qty,
		"uom": uom,
		"is_batch": int(item.get("has_batch_no") or 0),
		"is_serial": int(item.get("has_serial_no") or 0),
		"is_stock_item": int(item.get("is_stock_item") or 0),
	}


@frappe.whitelist()
def get_recipe_components(pairs):
	"""
	Return component items for POS Recipe based on (item_code, uom) pairs.
	`pairs` can be a JSON list: [{item_code, uom, company?}]
	"""
	if isinstance(pairs, str):
		pairs = json.loads(pairs)

	def _find_recipe_name(item_code, uom, company):
		"""Best-effort recipe lookup with practical fallbacks."""
		item_stock_uom = frappe.db.get_value("Item", item_code, "stock_uom")
		candidate_uoms = []
		for candidate in (uom, item_stock_uom):
			if candidate and candidate not in candidate_uoms:
				candidate_uoms.append(candidate)

		for candidate_uom in candidate_uoms:
			if company:
				name = frappe.db.get_value(
					"POS Recipe",
					{"item": item_code, "uom": candidate_uom, "company": company, "is_active": 1},
					"name",
				)
				if name:
					return name

			# Allow global (no-company) recipes as fallback.
			name = frappe.db.sql(
				"""
				select name
				from `tabPOS Recipe`
				where item=%s
				  and uom=%s
				  and is_active=1
				  and ifnull(company, '')=''
				limit 1
				""",
				(item_code, candidate_uom),
			)
			name = name[0][0] if name else None
			if name:
				return name

		return None

	result = {}
	for p in pairs or []:
		item_code = p.get("item_code")
		uom = p.get("uom")
		company = p.get("company")
		if not item_code or not uom:
			result[(item_code or "") + "|" + (uom or "")] = []
			continue
		name = _find_recipe_name(item_code, uom, company)
		components = []
		if name:
			doc = frappe.get_doc("POS Recipe", name)
			recipe_update_stock = cint(getattr(doc, "update_stock", 0))
			for row in doc.components:
				row_data = _get_recipe_row_dict(row)
				row_data["recipe_update_stock"] = recipe_update_stock
				components.append(row_data)
		result[f"{item_code}|{uom}"] = components
	return result


def _usage_base_conditions(company=None, from_date=None, to_date=None):
	cond = ["si.docstatus=1"]
	params = {}
	if company:
		cond.append("si.company=%(company)s")
		params["company"] = company
	if from_date:
		cond.append("si.posting_date>=%(from_date)s")
		params["from_date"] = getdate(from_date)
	if to_date:
		cond.append("si.posting_date<=%(to_date)s")
		params["to_date"] = getdate(to_date)
	return " and ".join(cond), params


@frappe.whitelist()
def get_usage_by_invoice(company=None, from_date=None, to_date=None):
	"""
	Aggregate recipe component usage grouped by Sales Invoice and parent item.
	Reads from Sales Invoice Item (parent) and Packed Items (children).
	"""
	cond, params = _usage_base_conditions(company, from_date, to_date)
	# Packed Items table name differs by doctype; use generic `Packed Item`
	query = f"""
		select
			si.name as invoice,
			si.posting_date,
			parent_it.item_code as parent_item,
			pi.item_code as component_item,
			sum(pi.qty) as consumed_qty,
			max(pi.uom) as uom
		from `tabSales Invoice` si
		join `tabSales Invoice Item` parent_it on parent_it.parent = si.name
		join `tabPacked Item` pi on pi.parent = si.name and pi.parent_item = parent_it.item_code
		where {cond}
		group by si.name, parent_it.item_code, pi.item_code
		order by si.posting_date desc, si.name desc
	"""
	return frappe.db.sql(query, params, as_dict=True)


@frappe.whitelist()
def get_usage_by_item(company=None, from_date=None, to_date=None):
	"""
	Aggregate total consumed quantities per component item with invoice count.
	"""
	cond, params = _usage_base_conditions(company, from_date, to_date)
	query = f"""
		select
			pi.item_code as component_item,
			sum(pi.qty) as total_consumed_qty,
			max(pi.uom) as uom,
			count(distinct si.name) as invoices
		from `tabSales Invoice` si
		join `tabPacked Item` pi on pi.parent = si.name
		where {cond}
		group by pi.item_code
		order by total_consumed_qty desc
	"""
	return frappe.db.sql(query, params, as_dict=True)

