<template>
	<v-container class="pa-4" fluid>
		<!-- Header -->
		<v-row class="mb-4">
			<v-col cols="12" class="d-flex justify-space-between align-center">
				<div class="d-flex align-center">
					<v-btn variant="text" color="primary" class="mr-3" @click="goBack">
						<v-icon start>mdi-arrow-left</v-icon>{{ __("Back to Entries") }}
					</v-btn>
					<div>
						<div class="text-h5 font-weight-bold pos-text-primary d-flex align-center">
							{{ entryName }}
							<v-chip
								v-if="doc"
								class="ml-3 font-weight-bold"
								size="small"
								:color="doc.docstatus === 1 ? 'success' : (doc.docstatus === 2 ? 'error' : 'warning')"
								variant="flat"
							>
								{{ doc.docstatus === 1 ? __("Submitted") : (doc.docstatus === 2 ? __("Cancelled") : __("Draft")) }}
							</v-chip>
						</div>
						<div class="text-caption text-medium-emphasis mt-1">
							{{ __("Stock Entry Details") }}
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
					<v-card-title class="text-subtitle-1 font-weight-bold border-b pb-2 mb-3">
						<v-icon left size="small" class="mr-2">mdi-information-outline</v-icon>
						{{ __("Entry Information") }}
					</v-card-title>
					<v-card-text>
						<v-list density="compact" class="bg-transparent pa-0">
							<v-list-item class="mb-2">
								<template v-slot:prepend><v-icon size="small" color="primary" class="mr-3">mdi-shape-outline</v-icon></template>
								<v-list-item-title class="text-body-2 text-medium-emphasis">{{ __("Entry Type") }}</v-list-item-title>
								<v-list-item-subtitle class="text-body-1 font-weight-bold pos-text-primary">{{ doc.stock_entry_type }}</v-list-item-subtitle>
							</v-list-item>
							<v-list-item class="mb-2">
								<template v-slot:prepend><v-icon size="small" color="primary" class="mr-3">mdi-calendar</v-icon></template>
								<v-list-item-title class="text-body-2 text-medium-emphasis">{{ __("Posting Date") }}</v-list-item-title>
								<v-list-item-subtitle class="text-body-1 font-weight-medium pos-text-primary">{{ doc.posting_date }}</v-list-item-subtitle>
							</v-list-item>
							<v-list-item class="mb-2">
								<template v-slot:prepend><v-icon size="small" color="secondary" class="mr-3">mdi-office-building</v-icon></template>
								<v-list-item-title class="text-body-2 text-medium-emphasis">{{ __("Company") }}</v-list-item-title>
								<v-list-item-subtitle class="text-body-1 font-weight-medium pos-text-primary">{{ doc.company }}</v-list-item-subtitle>
							</v-list-item>
							<v-list-item>
								<template v-slot:prepend><v-icon size="small" color="success" class="mr-3">mdi-cash-multiple</v-icon></template>
								<v-list-item-title class="text-body-2 text-medium-emphasis">{{ __("Total Amount") }}</v-list-item-title>
								<v-list-item-subtitle class="text-h6 font-weight-bold text-success">{{ formatMoney(doc.total_amount) }}</v-list-item-subtitle>
							</v-list-item>
						</v-list>
					</v-card-text>
				</v-card>

				<v-card class="pos-themed-card" elevation="2">
					<v-card-title class="text-subtitle-1 font-weight-bold border-b pb-2 mb-3">
						<v-icon left size="small" class="mr-2">mdi-warehouse</v-icon>
						{{ __("Default Warehouses") }}
					</v-card-title>
					<v-card-text>
						<div class="mb-3">
							<div class="text-caption text-medium-emphasis mb-1">{{ __("From Warehouse") }}</div>
							<div class="text-body-1 font-weight-medium pos-text-primary">
								{{ doc.from_warehouse || __("None") }}
							</div>
						</div>
						<div>
							<div class="text-caption text-medium-emphasis mb-1">{{ __("To Warehouse") }}</div>
							<div class="text-body-1 font-weight-medium pos-text-primary">
								{{ doc.to_warehouse || __("None") }}
							</div>
						</div>
					</v-card-text>
				</v-card>
			</v-col>

			<!-- Items Transferred -->
			<v-col cols="12" md="8">
				<v-card class="pos-themed-card h-100" elevation="2">
					<v-card-title class="text-subtitle-1 font-weight-bold border-b pb-2 mb-3 px-6 pt-4">
						<v-icon left size="small" class="mr-2">mdi-package-variant-closed</v-icon>
						{{ __("Items Transferred") }}
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
							<template v-slot:item.s_warehouse="{ item }">
								<v-chip size="small" variant="tonal" class="mb-1 d-block text-truncate" :color="(item.raw?.s_warehouse ?? item.s_warehouse) ? 'error' : 'default'" style="max-width: 140px;">
									{{ (item.raw?.s_warehouse ?? item.s_warehouse) || '---' }}
								</v-chip>
							</template>
							<template v-slot:item.t_warehouse="{ item }">
								<v-chip size="small" variant="tonal" class="d-block text-truncate" :color="(item.raw?.t_warehouse ?? item.t_warehouse) ? 'success' : 'default'" style="max-width: 140px;">
									{{ (item.raw?.t_warehouse ?? item.t_warehouse) || '---' }}
								</v-chip>
							</template>
							<template v-slot:item.amount="{ item }">
								{{ formatMoney(item.raw?.amount ?? item.amount) }}
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
	name: "StockEntryDetailsPage",
	props: ["name"],
	setup(props, { attrs }) {
		const { proxy } = getCurrentInstance();
		const entryName = ref(null);
		const doc = ref(null);
		const items = ref([]);
		const loading = ref(false);

		const tableHeaders = computed(() => [
			{ title: __("Item Code"), key: "item_code" },
			{ title: __("Qty"), key: "qty", align: "end" },
			{ title: __("Source"), key: "s_warehouse" },
			{ title: __("Target"), key: "t_warehouse" },
			{ title: __("Amount"), key: "amount", align: "end" }
		]);

		const formatMoney = (val) => {
			const num = Number(val || 0);
			return Number.isFinite(num) ? num.toFixed(2) : "0.00";
		};

		const load = async (name) => {
			loading.value = true;
			try {
				const d = await frappe.db.get_doc("Stock Entry", name);
				doc.value = d;
				items.value = (d.items || []).map((it) => ({
					name: it.name, 
					item_code: it.item_code, 
					qty: it.qty, 
					uom: it.uom, 
					s_warehouse: it.s_warehouse, 
					t_warehouse: it.t_warehouse, 
					amount: it.amount
				}));
			} catch (e) {
				console.error("Failed to load stock entry", e);
			} finally {
				loading.value = false;
			}
		};

		const goBack = () => {
			if (proxy.eventBus) {
				proxy.eventBus.emit("change-page", "Stock Entry");
			}
		};

		const openInDesk = () => {
			if (!entryName.value) return;
			const url =
				frappe.urllib.get_base_url() +
				"/app/stock-entry/" +
				encodeURIComponent(entryName.value);
			window.open(url, "_blank");
		};

		onMounted(() => {
			const route = window?.app?.$router?.currentRoute?.value || null;
			const name = route?.params?.name || props.name || attrs?.name;
			entryName.value = name;
			if (name) load(name);
		});

		window.addEventListener('hashchange', () => {
			const route = window?.app?.$router?.currentRoute?.value || null;
			const name = route?.params?.name || props.name || attrs?.name;
			if (name && name !== entryName.value) {
				entryName.value = name;
				load(name);
			}
		});

		return { entryName, doc, items, tableHeaders, loading, formatMoney, goBack, openInDesk };
	}
};
</script>

<style scoped>
.border-b {
	border-bottom: 1px solid rgba(128, 128, 128, 0.1);
}
</style>
