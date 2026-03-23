<template>
	<v-container class="pa-4" fluid>
		<!-- Filters -->
		<v-row dense class="mb-2">
			<v-col cols="12" md="3">
				<v-text-field
					v-model="fromDate"
					density="compact"
					variant="outlined"
					class="pos-themed-input"
					:label="__('From date (YYYY-MM-DD)')"
					hide-details
				/>
			</v-col>
			<v-col cols="12" md="3">
				<v-text-field
					v-model="toDate"
					density="compact"
					variant="outlined"
					class="pos-themed-input"
					:label="__('To date (YYYY-MM-DD)')"
					hide-details
				/>
			</v-col>
			<v-col cols="12" md="3">
				<v-autocomplete
					v-model="componentFilter"
					:items="componentOptions"
					item-title="name"
					item-value="name"
					density="compact"
					variant="outlined"
					class="pos-themed-input"
					:label="__('Filter by component item (optional)')"
					clearable
					hide-details
				/>
			</v-col>
			<v-col cols="12" md="3" class="d-flex justify-end align-center ga-2">
				<v-btn color="primary" variant="tonal" :loading="loading" @click="refreshAll">
					<v-icon start>mdi-refresh</v-icon>
					{{ __("Refresh") }}
				</v-btn>
				<v-btn color="secondary" variant="text" :disabled="!usageByInvoice.length && !usageByItem.length" @click="exportCsv">
					<v-icon start>mdi-download</v-icon>
					{{ __("Export CSV") }}
				</v-btn>
			</v-col>
		</v-row>

		<!-- Tabs -->
		<v-tabs v-model="activeTab" color="primary" class="mb-2">
			<v-tab value="overview">{{ __("Overview") }}</v-tab>
			<v-tab value="by_invoice">{{ __("Usage by Invoice") }}</v-tab>
			<v-tab value="by_item">{{ __("Usage by Item") }}</v-tab>
		</v-tabs>
		<v-window v-model="activeTab">
			<v-window-item value="overview">
				<v-row dense>
					<v-col cols="12" md="4">
						<v-card class="pos-themed-card pa-3">
							<div class="text-subtitle-1">{{ __("Sales") }}</div>
							<div class="text-h6">{{ summary?.sales?.count || 0 }} {{ __("invoices") }}</div>
							<div class="text-body-2">{{ __("Total") }}: {{ formatMoney(summary?.sales?.grand_total) }}</div>
						</v-card>
					</v-col>
					<v-col cols="12" md="4">
						<v-card class="pos-themed-card pa-3">
							<div class="text-subtitle-1">{{ __("Returns") }}</div>
							<div class="text-h6">{{ summary?.returns?.count || 0 }} {{ __("invoices") }}</div>
							<div class="text-body-2">{{ __("Total") }}: {{ formatMoney(summary?.returns?.grand_total) }}</div>
						</v-card>
					</v-col>
					<v-col cols="12" md="4">
						<v-card class="pos-themed-card pa-3">
							<div class="text-subtitle-1">{{ __("Purchases") }}</div>
							<div class="text-h6">{{ summary?.purchase?.count || 0 }} {{ __("invoices") }}</div>
							<div class="text-body-2">{{ __("Total") }}: {{ formatMoney(summary?.purchase?.grand_total) }}</div>
						</v-card>
					</v-col>
				</v-row>
			</v-window-item>
			<v-window-item value="by_invoice">
				<v-row dense>
					<v-col cols="12">
						<v-card class="pos-themed-card pa-2 mb-2">
							<div class="d-flex flex-wrap ga-4">
								<div>{{ __("Rows") }}: <strong>{{ filteredByInvoice.length }}</strong></div>
								<div>{{ __("Invoices") }}: <strong>{{ totalInvoices }}</strong></div>
								<div>{{ __("Total Consumed") }}: <strong>{{ formatFloat(totalConsumedByInvoice) }}</strong></div>
							</div>
						</v-card>
						<v-data-table
							:headers="usageByInvoiceHeaders"
							:items="filteredByInvoice"
							item-key="id"
							:loading="loadingUsage"
							density="compact"
							class="elevation-1"
						>
							<template #item.invoice="{ item }">
								<v-btn
									variant="text"
									size="small"
									:href="invoiceUrl(item.raw.invoice)"
									target="_blank"
								>
									{{ item.raw.invoice }}
								</v-btn>
							</template>
						</v-data-table>
					</v-col>
				</v-row>
			</v-window-item>
			<v-window-item value="by_item">
				<v-row dense>
					<v-col cols="12">
						<v-card class="pos-themed-card pa-2 mb-2">
							<div class="d-flex flex-wrap ga-4">
								<div>{{ __("Items") }}: <strong>{{ filteredByItem.length }}</strong></div>
								<div>{{ __("Total Consumed") }}: <strong>{{ formatFloat(totalConsumedByItem) }}</strong></div>
							</div>
						</v-card>
						<v-data-table
							:headers="usageByItemHeaders"
							:items="filteredByItem"
							item-key="component_item"
							:loading="loadingUsage"
							density="compact"
							class="elevation-1"
						/>
					</v-col>
				</v-row>
			</v-window-item>
		</v-window>
	</v-container>
</template>

<script>
/* global __, frappe */
import { onMounted, ref } from "vue";
import { getOpeningStorage, isOffline } from "../../../offline/index.js";

export default {
	name: "ReportsPage",
	setup() {
		const today = frappe?.datetime?.nowdate?.() || new Date().toISOString().slice(0, 10);
		const fromDate = ref(today);
		const toDate = ref(today);
		const summary = ref(null);
		const loading = ref(false);
		const activeTab = ref("overview");
		const componentFilter = ref(null);
		const componentOptions = ref([]);

		const formatMoney = (val) => {
			const num = Number(val || 0);
			return Number.isFinite(num) ? num.toFixed(2) : "0.00";
		};
		const formatFloat = (val) => {
			const num = Number(val || 0);
			return Number.isFinite(num) ? num.toFixed(3).replace(/\.?0+$/,"") : "0";
		};

		const loadSummary = async () => {
			if (isOffline()) {
				return;
			}

			const opening = getOpeningStorage();
			const posProfile = opening?.pos_profile?.name || null;
			const company = opening?.pos_profile?.company || opening?.company?.name || opening?.company || null;

			loading.value = true;
			try {
				const resp = await frappe.call({
					method: "posawesome.posawesome.api.reports.get_pos_summary",
					args: {
						company,
						pos_profile: posProfile,
						from_date: fromDate.value,
						to_date: toDate.value,
					},
				});
				summary.value = resp?.message || null;
			} finally {
				loading.value = false;
			}
		};

		// Usage (recipes) tables
		const usageByInvoice = ref([]);
		const usageByItem = ref([]);
		const loadingUsage = ref(false);
		const usageByInvoiceHeaders = ref([
			{ title: __("Invoice"), key: "invoice" },
			{ title: __("Posting Date"), key: "posting_date" },
			{ title: __("Parent Item"), key: "parent_item" },
			{ title: __("Component Item"), key: "component_item" },
			{ title: __("Consumed Qty"), key: "consumed_qty", align: "end" },
			{ title: __("UOM"), key: "uom" }
		]);
		const usageByItemHeaders = ref([
			{ title: __("Component Item"), key: "component_item" },
			{ title: __("Total Consumed"), key: "total_consumed_qty", align: "end" },
			{ title: __("UOM"), key: "uom" },
			{ title: __("Invoices"), key: "invoices", align: "end" }
		]);

		const loadUsage = async () => {
			if (isOffline()) return;
			const opening = getOpeningStorage();
			const company = opening?.pos_profile?.company || opening?.company?.name || opening?.company || null;
			loadingUsage.value = true;
			try {
				const [byInv, byIt] = await Promise.all([
					frappe.call({
						method: "posawesome.posawesome.api.recipes.get_usage_by_invoice",
						args: { company, from_date: fromDate.value, to_date: toDate.value }
					}),
					frappe.call({
						method: "posawesome.posawesome.api.recipes.get_usage_by_item",
						args: { company, from_date: fromDate.value, to_date: toDate.value }
					})
				]);
				usageByInvoice.value = byInv?.message || [];
				// add id for table key
				usageByInvoice.value = usageByInvoice.value.map((r, idx) => ({ id: idx, ...r }));
				usageByItem.value = byIt?.message || [];
				// preload component options for filter (from usage)
				const names = Array.from(new Set((usageByItem.value || []).map((r) => r.component_item))).filter(Boolean);
				componentOptions.value = names.map((n) => ({ name: n }));
			} finally {
				loadingUsage.value = false;
			}
		};

		// Derived filters + totals
		const filteredByInvoice = ref([]);
		const filteredByItem = ref([]);
		const recalcFilters = () => {
			if (!componentFilter.value) {
				filteredByInvoice.value = usageByInvoice.value;
				filteredByItem.value = usageByItem.value;
			} else {
				const cf = String(componentFilter.value).toLowerCase();
				filteredByInvoice.value = (usageByInvoice.value || []).filter((r) =>
					String(r.component_item || "").toLowerCase().includes(cf),
				);
				filteredByItem.value = (usageByItem.value || []).filter((r) =>
					String(r.component_item || "").toLowerCase().includes(cf),
				);
			}
		};

		const totalConsumedByInvoice = ref(0);
		const totalConsumedByItem = ref(0);
		const totalInvoices = ref(0);
		const recalcTotals = () => {
			totalConsumedByInvoice.value = (filteredByInvoice.value || []).reduce(
				(sum, r) => sum + (Number(r.consumed_qty) || 0),
				0,
			);
			totalConsumedByItem.value = (filteredByItem.value || []).reduce(
				(sum, r) => sum + (Number(r.total_consumed_qty) || 0),
				0,
			);
			totalInvoices.value = new Set((filteredByInvoice.value || []).map((r) => r.invoice)).size;
		};

		const refreshAll = async () => {
			await Promise.all([loadSummary(), loadUsage()]);
			recalcFilters();
			recalcTotals();
		};

		const exportCsv = () => {
			const rows = [
				["Usage by Invoice"],
				["Invoice", "Posting Date", "Parent Item", "Component Item", "Consumed Qty", "UOM"],
				...filteredByInvoice.value.map((r) => [
					r.invoice,
					r.posting_date,
					r.parent_item,
					r.component_item,
					r.consumed_qty,
					r.uom,
				]),
				[],
				["Usage by Item"],
				["Component Item", "Total Consumed", "UOM", "Invoices"],
				...filteredByItem.value.map((r) => [r.component_item, r.total_consumed_qty, r.uom, r.invoices]),
			];
			const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
			const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `recipe-usage-${fromDate.value}-to-${toDate.value}.csv`;
			a.click();
			URL.revokeObjectURL(url);
		};

		const invoiceUrl = (name) => {
			return `${frappe.urllib.get_base_url()}/app/sales-invoice/${encodeURIComponent(name)}`;
		};

		onMounted(async () => {
			await refreshAll();
		});

		return {
			fromDate,
			toDate,
			summary,
			loading,
			refreshAll,
			formatMoney,
			formatFloat,
			usageByInvoice,
			usageByItem,
			usageByInvoiceHeaders,
			usageByItemHeaders,
			loadingUsage,
			activeTab,
			componentFilter,
			componentOptions,
			filteredByInvoice,
			filteredByItem,
			totalConsumedByInvoice,
			totalConsumedByItem,
			totalInvoices,
			exportCsv,
			invoiceUrl,
		};
	},
};
</script>

