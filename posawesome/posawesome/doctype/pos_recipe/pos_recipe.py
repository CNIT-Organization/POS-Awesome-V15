import frappe
from frappe import _
from frappe.model.document import Document


class POSRecipe(Document):
    def validate(self):
        if not self.item or not self.uom:
            frappe.throw(_("Item and UOM are required"))
        self._validate_unique_scope()

    def _validate_unique_scope(self):
        params = {
            "item": self.item,
            "uom": self.uom,
            "name": self.name or "",
        }
        if self.company:
            where_company = "ifnull(company, '') = %(company)s"
            params["company"] = self.company
        else:
            where_company = "ifnull(company, '') = ''"

        exists = frappe.db.sql(
            f"""
            select name
            from `tabPOS Recipe`
            where item = %(item)s
              and uom = %(uom)s
              and {where_company}
              and name != %(name)s
            limit 1
            """,
            params,
        )
        if exists:
            frappe.throw(
                _("Recipe already exists for Item {0} and UOM {1} in this company scope").format(
                    self.item, self.uom
                )
            )

