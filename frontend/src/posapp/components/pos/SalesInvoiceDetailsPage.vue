<template>
	<v-container class="pa-4" fluid>
		<!-- Header -->
		<v-row class="mb-4">
			<v-col cols="12" class="d-flex justify-space-between align-center">
				<div class="d-flex align-center">
					<v-btn variant="text" color="primary" class="mr-3" @click="goBack">
						<v-icon start>mdi-arrow-left</v-icon>{{ __("Back") }}
					</v-btn>
					<div>
						<div class="text-h5 font-weight-bold pos-text-primary">
							{{ invoiceName }}
						</div>
						<div class="text-caption text-medium-emphasis">
							{{ __("Sales Invoice Details") }}
						</div>
					</div>
				</div>
				<v-btn v-if="doc" color="primary" @click="printInvoice">
					<v-icon start>mdi-printer</v-icon> {{ __("Print") }}
				</v-btn>
			</v-col>
		</v-row>

		<div v-if="loading" class="d-flex justify-center pa-10">
			<v-progress-circular indeterminate color="primary"></v-progress-circular>
		</div>

		<v-row v-else-if="doc">
			<!-- Invoice Info Cards -->
			<v-col cols="12" md="6">
				<v-card class="pos-themed-card h-100" elevation="2">
					<v-card-title class="text-subtitle-1 font-weight-bold border-b pb-2 mb-3">
						<v-icon left size="small" class="mr-2">mdi-information-outline</v-icon>
						{{ __("Invoice Details") }}
					</v-card-title>
					<v-card-text>
						<v-list density="compact" class="bg-transparent">
							<v-list-item>
								<template v-slot:prepend><v-icon size="small" color="primary" class="mr-3">mdi-calendar</v-icon></template>
								<v-list-item-title class="text-body-2 text-medium-emphasis">{{ __("Date") }}</v-list-item-title>
								<v-list-item-subtitle class="text-body-1 font-weight-medium pos-text-primary">{{ doc.posting_date }}</v-list-item-subtitle>
							</v-list-item>
							<v-list-item>
								<template v-slot:prepend><v-icon size="small" color="primary" class="mr-3">mdi-account</v-icon></template>
								<v-list-item-title class="text-body-2 text-medium-emphasis">{{ __("Customer") }}</v-list-item-title>
								<v-list-item-subtitle class="text-body-1 font-weight-medium pos-text-primary">{{ doc.customer_name }}</v-list-item-subtitle>
							</v-list-item>
							<v-list-item>
								<template v-slot:prepend><v-icon size="small" color="primary" class="mr-3">mdi-cash-multiple</v-icon></template>
								<v-list-item-title class="text-body-2 text-medium-emphasis">{{ __("Grand Total") }}</v-list-item-title>
								<v-list-item-subtitle class="text-h6 font-weight-bold text-primary">{{ formatMoney(doc.grand_total) }} {{ doc.currency }}</v-list-item-subtitle>
							</v-list-item>
						</v-list>
					</v-card-text>
				</v-card>
			</v-col>

			<v-col cols="12" md="6">
				<v-card class="pos-themed-card h-100" elevation="2">
					<v-card-title class="text-subtitle-1 font-weight-bold border-b pb-2 mb-3">
						<v-icon left size="small" class="mr-2">mdi-domain</v-icon>
						{{ __("Meta Information") }}
					</v-card-title>
					<v-card-text>
						<v-list density="compact" class="bg-transparent">
							<v-list-item>
								<template v-slot:prepend><v-icon size="small" color="secondary" class="mr-3">mdi-office-building</v-icon></template>
								<v-list-item-title class="text-body-2 text-medium-emphasis">{{ __("Company") }}</v-list-item-title>
								<v-list-item-subtitle class="text-body-1 font-weight-medium pos-text-primary">{{ doc.company }}</v-list-item-subtitle>
							</v-list-item>
							<v-list-item>
								<template v-slot:prepend><v-icon size="small" color="secondary" class="mr-3">mdi-storefront-outline</v-icon></template>
								<v-list-item-title class="text-body-2 text-medium-emphasis">{{ __("POS Profile") }}</v-list-item-title>
								<v-list-item-subtitle class="text-body-1 font-weight-medium pos-text-primary">{{ doc.pos_profile || "N/A" }}</v-list-item-subtitle>
							</v-list-item>
							<v-list-item>
								<template v-slot:prepend><v-icon size="small" color="secondary" class="mr-3">mdi-check-circle-outline</v-icon></template>
								<v-list-item-title class="text-body-2 text-medium-emphasis">{{ __("Status") }}</v-list-item-title>
								<v-list-item-subtitle class="text-body-1 font-weight-medium pos-text-primary">
									<v-chip size="small" :color="doc.status === 'Paid' ? 'success' : (doc.status === 'Return' ? 'error' : 'warning')">{{ doc.status }}</v-chip>
								</v-list-item-subtitle>
							</v-list-item>
						</v-list>
					</v-card-text>
				</v-card>
			</v-col>
		</v-row>

		<!-- Tables -->
		<v-row v-if="doc" class="mt-4">
			<v-col cols="12">
				<v-card class="pos-themed-card" elevation="2">
					<v-card-title class="text-subtitle-1 font-weight-bold">
						<v-icon left size="small" class="mr-2">mdi-cart</v-icon>
						{{ __("Sold Items") }}
					</v-card-title>
					<v-data-table
						:headers="soldHeaders"
						:items="soldItems"
						item-key="name"
						density="comfortable"
					>
						<template v-slot:item.rate="{ item }">
							{{ formatMoney(item.raw?.rate ?? item.rate) }}
						</template>
						<template v-slot:item.amount="{ item }">
							<strong>{{ formatMoney(item.raw?.amount ?? item.amount) }}</strong>
						</template>
					</v-data-table>
				</v-card>
			</v-col>

			<v-col cols="12" v-if="packedItems.length > 0">
				<v-card class="pos-themed-card mt-2" elevation="2">
					<v-card-title class="text-subtitle-1 font-weight-bold">
						<v-icon left size="small" class="mr-2">mdi-cube-outline</v-icon>
						{{ __("Consumed Components (Recipes)") }}
					</v-card-title>
					<v-data-table
						:headers="packedHeaders"
						:items="packedItems"
						item-key="id"
						density="compact"
					/>
				</v-card>
			</v-col>
		</v-row>
	</v-container>
</template>

<script>
/* global __, frappe */
import { onMounted, ref, computed, getCurrentInstance } from "vue";

export default {
	name: "SalesInvoiceDetailsPage",
	props: ["name"],
	setup(props, { attrs }) {
		const { proxy } = getCurrentInstance();
		const invoiceName = ref(null);
		const doc = ref(null);
		const soldItems = ref([]);
		const packedItems = ref([]);
		const loading = ref(false);

		const soldHeaders = computed(() => [
			{ title: __("Item Code"), key: "item_code" },
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

		const formatMoney = (val) => {
			const num = Number(val || 0);
			return Number.isFinite(num) ? num.toFixed(2) : "0.00";
		};

		const load = async (name) => {
			loading.value = true;
			try {
				const d = await frappe.db.get_doc("Sales Invoice", name);
				doc.value = d;
				soldItems.value = (d.items || []).map((it) => ({
					name: it.name, item_code: it.item_code, item_name: it.item_name, qty: it.qty, uom: it.uom, rate: it.rate, amount: it.amount
				}));
				const packed = await frappe.db.get_list("Packed Item", {
					fields: ["parent_item", "item_code", "qty", "uom", "name"],
					filters: { parent: name, parenttype: "Sales Invoice" },
					limit: 1000
				});
				packedItems.value = (packed || []).map((r, i) => ({ id: i, ...r }));
			} catch (e) {
				console.error("Failed to load invoice", e);
			} finally {
				loading.value = false;
			}
		};

		const goBack = () => {
			if (proxy.eventBus) {
				proxy.eventBus.emit("change-page", "Sales Invoice");
			} else if (proxy.$router) {
				proxy.$router.back();
			} else {
				window.history.back();
			}
		};

		const printInvoice = () => {
			if (!invoiceName.value) return;
			const url =
				frappe.urllib.get_base_url() +
				"/printview?doctype=Sales Invoice&name=" +
				encodeURIComponent(invoiceName.value) +
				"&trigger_print=1";
			window.open(url, "Print");
		};

		onMounted(() => {
			const route = window?.app?.$router?.currentRoute?.value || null;
			const name = route?.params?.name || props.name || attrs?.name;
			invoiceName.value = name;
			if (name) load(name);
		});

		window.addEventListener('hashchange', () => {
			// fallback for basic router if missing
			const route = window?.app?.$router?.currentRoute?.value || null;
			const name = route?.params?.name || props.name || attrs?.name;
			if (name && name !== invoiceName.value) {
				invoiceName.value = name;
				load(name);
			}
		});

		return { invoiceName, doc, soldItems, packedItems, soldHeaders, packedHeaders, formatMoney, goBack, printInvoice, loading };
	}
};
</script>

<style scoped>
.border-b {
	border-bottom: 1px solid rgba(128, 128, 128, 0.2);
}
</style>
