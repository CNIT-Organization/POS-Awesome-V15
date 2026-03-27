<template>
	<v-container class="pa-4" fluid>
		<!-- Header -->
		<v-row class="mb-4">
			<v-col cols="12" class="d-flex justify-space-between align-center">
				<div class="d-flex align-center">
					<v-btn variant="text" color="primary" class="mr-3" @click="goBack">
						<v-icon start>mdi-arrow-left</v-icon>{{ __("Back to Invoices") }}
					</v-btn>
					<div>
						<div class="text-h5 font-weight-bold pos-text-primary d-flex align-center">
							{{ invoiceName }}
							<v-chip
								v-if="doc"
								class="ml-3 font-weight-bold"
								size="small"
								:color="doc.status === 'Paid' ? 'success' : (doc.status === 'Return' ? 'error' : 'warning')"
								variant="flat"
							>
								{{ doc.status }}
							</v-chip>
						</div>
						<div class="text-caption text-medium-emphasis mt-1">
							{{ __("Purchase Invoice Details") }}
						</div>
					</div>
				</div>
				<v-btn v-if="doc" color="primary" variant="tonal" @click="openInDesk">
					<v-icon start>mdi-open-in-new</v-icon> {{ __("Open in Desk") }}
				</v-btn>
			</v-col>
		</v-row>

		<div v-if="loading" class="d-flex justify-center pa-10">
			<v-progress-circular indeterminate color="primary"></v-progress-circular>
		</div>

		<v-row v-else-if="doc">
			<!-- Meta Data Cards -->
			<v-col cols="12" md="4">
				<v-card class="pos-themed-card mb-4" elevation="2">
					<div class="bg-primary text-white pa-4 d-flex align-center rounded-t">
						<v-icon size="x-large" class="mr-3">mdi-cash-multiple</v-icon>
						<div>
							<div class="text-caption text-white opacity-80 text-uppercase tracking-wide">{{ __("Grand Total") }}</div>
							<div class="text-h4 font-weight-bold">{{ formatMoney(doc.grand_total) }} <span class="text-h6 opacity-70">{{ doc.currency }}</span></div>
						</div>
					</div>
					<v-card-text class="pt-4">
						<v-list density="compact" class="bg-transparent pa-0">
							<v-list-item class="mb-2">
								<template v-slot:prepend><v-icon size="small" color="primary" class="mr-3">mdi-factory</v-icon></template>
								<v-list-item-title class="text-body-2 text-medium-emphasis">{{ __("Supplier") }}</v-list-item-title>
								<v-list-item-subtitle class="text-body-1 font-weight-bold pos-text-primary">{{ doc.supplier_name || doc.supplier }}</v-list-item-subtitle>
							</v-list-item>
							<v-list-item class="mb-2">
								<template v-slot:prepend><v-icon size="small" color="secondary" class="mr-3">mdi-calendar</v-icon></template>
								<v-list-item-title class="text-body-2 text-medium-emphasis">{{ __("Posting Date") }}</v-list-item-title>
								<v-list-item-subtitle class="text-body-1 font-weight-medium pos-text-primary">{{ doc.posting_date }}</v-list-item-subtitle>
							</v-list-item>
							<v-list-item>
								<template v-slot:prepend><v-icon size="small" color="secondary" class="mr-3">mdi-calendar-alert</v-icon></template>
								<v-list-item-title class="text-body-2 text-medium-emphasis">{{ __("Due Date") }}</v-list-item-title>
								<v-list-item-subtitle class="text-body-1 font-weight-medium pos-text-primary">{{ doc.due_date || "---" }}</v-list-item-subtitle>
							</v-list-item>
						</v-list>
					</v-card-text>
				</v-card>

				<v-card class="pos-themed-card" elevation="2">
					<v-card-title class="text-subtitle-1 font-weight-bold border-b pb-2 mb-3">
						<v-icon left size="small" class="mr-2">mdi-cash-check</v-icon>
						{{ __("Payment Tracking") }}
					</v-card-title>
					<v-card-text>
						<v-progress-linear 
							class="mb-2"
							rounded 
							height="8" 
							:model-value="doc.outstanding_amount === 0 ? 100 : ((doc.grand_total - doc.outstanding_amount) / doc.grand_total) * 100" 
							:color="doc.outstanding_amount === 0 ? 'success' : 'warning'"
						></v-progress-linear>
						
						<div class="d-flex justify-space-between mb-2">
							<div class="text-caption text-medium-emphasis">{{ __("Paid Amount") }}</div>
							<div class="text-body-2 font-weight-bold text-success">{{ formatMoney(doc.grand_total - doc.outstanding_amount) }}</div>
						</div>
						<div class="d-flex justify-space-between">
							<div class="text-caption text-medium-emphasis">{{ __("Outstanding") }}</div>
							<div class="text-body-2 font-weight-bold text-error">{{ formatMoney(doc.outstanding_amount) }}</div>
						</div>
					</v-card-text>
				</v-card>
			</v-col>

			<!-- Items Received -->
			<v-col cols="12" md="8">
				<v-card class="pos-themed-card h-100" elevation="2">
					<v-card-title class="text-subtitle-1 font-weight-bold border-b pb-2 mb-3 px-6 pt-4">
						<v-icon left size="small" class="mr-2">mdi-format-list-checks</v-icon>
						{{ __("Items Received") }}
					</v-card-title>
					
					<v-card-text class="px-0 pb-0 pt-2">
						<v-data-table
							:headers="tableHeaders"
							:items="items"
							item-key="name"
							density="comfortable"
							class="elevation-0 mx-2"
						>
							<template v-slot:item.qty="{ item }">
								<strong>{{ item.raw?.qty ?? item.qty }}</strong> {{ item.raw?.uom ?? item.uom }}
							</template>
							<template v-slot:item.rate="{ item }">
								{{ formatMoney(item.raw?.rate ?? item.rate) }}
							</template>
							<template v-slot:item.amount="{ item }">
								<strong>{{ formatMoney(item.raw?.amount ?? item.amount) }}</strong>
							</template>
						</v-data-table>
					</v-card-text>
				</v-card>
			</v-col>
		</v-row>
	</v-container>
</template>

<script>
/* global __, frappe */
import { onMounted, ref, computed, getCurrentInstance } from "vue";

export default {
	name: "PurchaseInvoiceDetailsPage",
	props: ["name"],
	setup(props, { attrs }) {
		const { proxy } = getCurrentInstance();
		const invoiceName = ref(null);
		const doc = ref(null);
		const items = ref([]);
		const loading = ref(false);

		const tableHeaders = computed(() => [
			{ title: __("Item Code"), key: "item_code" },
			{ title: __("Name"), key: "item_name" },
			{ title: __("Qty"), key: "qty", align: "end" },
			{ title: __("Rate"), key: "rate", align: "end" },
			{ title: __("Amount"), key: "amount", align: "end" }
		]);

		const formatMoney = (val) => {
			const num = Number(val || 0);
			return Number.isFinite(num) ? num.toFixed(2) : "0.00";
		};

		const load = async (name) => {
			loading.value = true;
			try {
				const d = await frappe.db.get_doc("Purchase Invoice", name);
				doc.value = d;
				items.value = (d.items || []).map((it) => ({
					name: it.name, 
					item_code: it.item_code, 
					item_name: it.item_name, 
					qty: it.qty, 
					uom: it.uom, 
					rate: it.rate, 
					amount: it.base_amount || it.amount
				}));
			} catch (e) {
				console.error("Failed to load purchase invoice", e);
			} finally {
				loading.value = false;
			}
		};

		const goBack = () => {
			if (proxy.eventBus) {
				proxy.eventBus.emit("change-page", "Purchase Invoice");
			}
		};

		const openInDesk = () => {
			if (!invoiceName.value) return;
			const url =
				frappe.urllib.get_base_url() +
				"/app/purchase-invoice/" +
				encodeURIComponent(invoiceName.value);
			window.open(url, "_blank");
		};

		onMounted(() => {
			const route = window?.app?.$router?.currentRoute?.value || null;
			const name = route?.params?.name || props.name || attrs?.name;
			invoiceName.value = name;
			if (name) load(name);
		});

		window.addEventListener('hashchange', () => {
			const route = window?.app?.$router?.currentRoute?.value || null;
			const name = route?.params?.name || props.name || attrs?.name;
			if (name && name !== invoiceName.value) {
				invoiceName.value = name;
				load(name);
			}
		});

		return { invoiceName, doc, items, tableHeaders, loading, formatMoney, goBack, openInDesk };
	}
};
</script>

<style scoped>
.tracking-wide {
	letter-spacing: 0.05em;
}
.border-b {
	border-bottom: 1px solid rgba(128, 128, 128, 0.1);
}
</style>
