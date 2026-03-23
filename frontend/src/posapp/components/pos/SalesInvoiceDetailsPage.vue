<template>
	<v-container class="pa-4" fluid>
		<v-row>
			<v-col cols="12" class="d-flex justify-space-between align-center">
				<div class="text-h6">
					{{ __("Invoice") }}: {{ invoiceName }}
				</div>
				<v-btn variant="text" color="primary" @click="$router.back()">
					<v-icon start>mdi-arrow-left</v-icon>{{ __("Back") }}
				</v-btn>
			</v-col>
		</v-row>
		<v-row>
			<v-col cols="12" md="6">
				<v-card class="pos-themed-card pa-3">
					<div class="text-subtitle-1 mb-2">{{ __("Header") }}</div>
					<div class="text-body-2">
						<strong>{{ __("Date") }}:</strong> {{ doc?.posting_date }}
					</div>
					<div class="text-body-2">
						<strong>{{ __("Customer") }}:</strong> {{ doc?.customer_name }}
					</div>
					<div class="text-body-2">
						<strong>{{ __("Grand Total") }}:</strong> {{ doc?.grand_total }} {{ doc?.currency }}
					</div>
				</v-card>
			</v-col>
			<v-col cols="12" md="6">
				<v-card class="pos-themed-card pa-3">
					<div class="text-subtitle-1 mb-2">{{ __("Meta") }}</div>
					<div class="text-body-2"><strong>{{ __("Company") }}:</strong> {{ doc?.company }}</div>
					<div class="text-body-2"><strong>{{ __("POS Profile") }}:</strong> {{ doc?.pos_profile }}</div>
				</v-card>
			</v-col>
		</v-row>
		<v-row>
			<v-col cols="12" md="6">
				<h3 class="text-subtitle-1 mb-2">{{ __("Sold Items") }}</h3>
				<v-data-table
					:headers="soldHeaders"
					:items="soldItems"
					item-key="name"
					density="compact"
					class="elevation-1"
				/>
			</v-col>
			<v-col cols="12" md="6">
				<h3 class="text-subtitle-1 mb-2">{{ __("Consumed Components (Recipes)") }}</h3>
				<v-data-table
					:headers="packedHeaders"
					:items="packedItems"
					item-key="id"
					density="compact"
					class="elevation-1"
				/>
			</v-col>
		</v-row>
	</v-container>
</template>

<script>
/* global __, frappe */
import { onMounted, ref, computed } from "vue";

export default {
	name: "SalesInvoiceDetailsPage",
	setup(props, { attrs }) {
		const invoiceName = ref(null);
		const doc = ref(null);
		const soldItems = ref([]);
		const packedItems = ref([]);

		const soldHeaders = computed(() => [
			{ title: __("Item"), key: "item_code" },
			{ title: __("Name"), key: "item_name" },
			{ title: __("Qty"), key: "qty", align: "end" },
			{ title: __("UOM"), key: "uom" },
			{ title: __("Rate"), key: "rate", align: "end" },
			{ title: __("Amount"), key: "amount", align: "end" }
		]);
		const packedHeaders = computed(() => [
			{ title: __("Parent Item"), key: "parent_item" },
			{ title: __("Component Item"), key: "item_code" },
			{ title: __("Qty"), key: "qty", align: "end" },
			{ title: __("UOM"), key: "uom" }
		]);

		const load = async (name) => {
			// fetch invoice doc with items and packed_items
			const d = await frappe.db.get_doc("Sales Invoice", name);
			doc.value = d;
			soldItems.value = (d.items || []).map((it) => ({
				name: it.name, item_code: it.item_code, item_name: it.item_name, qty: it.qty, uom: it.uom, rate: it.rate, amount: it.amount
			}));
			// packed items can be in child table Packed Item; fetch via query to be robust
			const packed = await frappe.db.get_list("Packed Item", {
				fields: ["parent_item", "item_code", "qty", "uom", "name"],
				filters: { parent: name, parenttype: "Sales Invoice" },
				limit: 1000
			});
			packedItems.value = (packed || []).map((r, i) => ({ id: i, ...r }));
		};

		onMounted(() => {
			const route = window?.app?.$router?.currentRoute?.value || null;
			const name = route?.params?.name || attrs?.name;
			invoiceName.value = name;
			if (name) load(name);
		});

		return { invoiceName, doc, soldItems, packedItems, soldHeaders, packedHeaders };
	}
};
</script>

