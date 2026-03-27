<template>
	<v-container class="pa-6" fluid>
		<!-- Header Section -->
		<v-row class="mb-6 align-center">
			<v-col cols="12" md="8">
				<div class="text-h4 font-weight-bold pos-text-primary mb-1 d-flex align-center">
					<v-icon color="primary" size="large" class="mr-3">mdi-chart-line</v-icon>
					{{ __("Reports Dashboard") }}
				</div>
				<div class="text-subtitle-1 text-medium-emphasis">
					{{ __("Comprehensive overview of your sales, returns, and inventory usage") }}
				</div>
			</v-col>
			<v-col cols="12" md="4" class="d-flex justify-end pr-0">
				<v-btn
					color="primary"
					size="large"
					elevation="2"
					class="px-6 rounded-pill"
					:loading="loading"
					@click="refreshAll"
				>
					<v-icon start>mdi-refresh</v-icon>
					{{ __("Refresh Data") }}
				</v-btn>
			</v-col>
		</v-row>

		<!-- Filters -->
		<v-card class="pos-themed-card mb-6 pa-5" elevation="3" rounded="lg">
			<v-row dense align="center">
				<v-col cols="12" md="6">
					<v-btn-toggle v-model="dateRange" color="primary" variant="outlined" divided class="w-100" @update:model-value="setDateRange">
						<v-btn value="today" class="flex-grow-1 px-1 py-0 text-caption font-weight-bold">{{ __("Today") }}</v-btn>
						<v-btn value="yesterday" class="flex-grow-1 px-1 py-0 text-caption font-weight-bold">{{ __("Yesterday") }}</v-btn>
						<v-btn value="this_week" class="flex-grow-1 px-1 py-0 text-caption font-weight-bold">{{ __("This Week") }}</v-btn>
						<v-btn value="this_month" class="flex-grow-1 px-1 py-0 text-caption font-weight-bold">{{ __("This Month") }}</v-btn>
					</v-btn-toggle>
				</v-col>
				<v-col cols="12" md="4">
					<v-autocomplete
						v-model="componentFilter"
						:items="componentOptions"
						item-title="name"
						item-value="name"
						density="comfortable"
						variant="outlined"
						bg-color="transparent"
						:label="__('Filter by Component Item')"
						clearable
						hide-details
						prepend-inner-icon="mdi-filter-variant"
					/>
				</v-col>
				<v-col cols="12" md="2" class="d-flex justify-end">
					<v-btn
						color="secondary"
						variant="outlined"
						size="large"
						class="w-100 rounded-lg"
						:disabled="!usageByInvoice.length && !usageByItem.length"
						@click="exportCsv"
					>
						<v-icon start>mdi-export</v-icon>
						{{ __("Export CSV") }}
					</v-btn>
				</v-col>
			</v-row>
		</v-card>

		<!-- Main Tabs for Navigation -->
		<v-tabs
			v-model="activeTab"
			color="primary"
			bg-color="transparent"
			align-tabs="center"
			class="mb-6 border-b"
		>
			<v-tab value="overview" class="text-subtitle-1 font-weight-bold px-6">
				<v-icon start>mdi-view-dashboard-outline</v-icon>{{ __("Overview") }}
			</v-tab>
			<v-tab value="by_invoice" class="text-subtitle-1 font-weight-bold px-6">
				<v-icon start>mdi-receipt-outline</v-icon>{{ __("Usage by Invoice") }}
			</v-tab>
			<v-tab value="by_item" class="text-subtitle-1 font-weight-bold px-6">
				<v-icon start>mdi-package-variant</v-icon>{{ __("Usage by Item") }}
			</v-tab>
		</v-tabs>

		<!-- Content Area -->
		<v-window v-model="activeTab" class="bg-transparent">
			
			<!-- Overview Tab -->
			<v-window-item value="overview">
				<v-row>
					<!-- Sales Card -->
					<v-col cols="12" md="4">
						<v-card class="pos-themed-card metric-card" elevation="4" rounded="xl">
							<v-card-text class="pa-6">
								<div class="d-flex justify-space-between align-start mb-4">
									<div>
										<div class="text-button text-uppercase text-medium-emphasis mb-1">{{ __("Total Sales") }}</div>
										<div class="text-h3 font-weight-bold text-success">{{ formatMoney(summary?.sales?.grand_total) }}</div>
									</div>
									<v-avatar color="success-lighten-4" size="56" class="rounded-lg">
										<v-icon color="success" size="32">mdi-trending-up</v-icon>
									</v-avatar>
								</div>
								<v-divider class="mb-3"></v-divider>
								<div class="d-flex align-center text-body-1">
									<v-icon color="success" size="small" class="mr-2">mdi-receipt</v-icon>
									<strong>{{ summary?.sales?.count || 0 }}</strong>&nbsp;<span class="text-medium-emphasis">{{ __("invoices generated") }}</span>
								</div>
							</v-card-text>
						</v-card>
					</v-col>

					<!-- Returns Card -->
					<v-col cols="12" md="4">
						<v-card class="pos-themed-card metric-card" elevation="4" rounded="xl">
							<v-card-text class="pa-6">
								<div class="d-flex justify-space-between align-start mb-4">
									<div>
										<div class="text-button text-uppercase text-medium-emphasis mb-1">{{ __("Total Returns") }}</div>
										<div class="text-h3 font-weight-bold text-error">{{ formatMoney(summary?.returns?.grand_total) }}</div>
									</div>
									<v-avatar color="error-lighten-4" size="56" class="rounded-lg">
										<v-icon color="error" size="32">mdi-keyboard-return</v-icon>
									</v-avatar>
								</div>
								<v-divider class="mb-3"></v-divider>
								<div class="d-flex align-center text-body-1">
									<v-icon color="error" size="small" class="mr-2">mdi-file-undo</v-icon>
									<strong>{{ summary?.returns?.count || 0 }}</strong>&nbsp;<span class="text-medium-emphasis">{{ __("invoices processed") }}</span>
								</div>
							</v-card-text>
						</v-card>
					</v-col>

					<!-- Purchases Card -->
					<v-col cols="12" md="4">
						<v-card class="pos-themed-card metric-card" elevation="4" rounded="xl">
							<v-card-text class="pa-6">
								<div class="d-flex justify-space-between align-start mb-4">
									<div>
										<div class="text-button text-uppercase text-medium-emphasis mb-1">{{ __("Total Purchases") }}</div>
										<div class="text-h3 font-weight-bold text-info">{{ formatMoney(summary?.purchase?.grand_total) }}</div>
									</div>
									<v-avatar color="info-lighten-4" size="56" class="rounded-lg">
										<v-icon color="info" size="32">mdi-cart-arrow-down</v-icon>
									</v-avatar>
								</div>
								<v-divider class="mb-3"></v-divider>
								<div class="d-flex align-center text-body-1">
									<v-icon color="info" size="small" class="mr-2">mdi-file-document</v-icon>
									<strong>{{ summary?.purchase?.count || 0 }}</strong>&nbsp;<span class="text-medium-emphasis">{{ __("invoices recorded") }}</span>
								</div>
							</v-card-text>
						</v-card>
					</v-col>
				</v-row>
			</v-window-item>

			<!-- By Invoice Tab -->
			<v-window-item value="by_invoice">
				<v-card class="pos-themed-card mb-4 pa-4" elevation="2" rounded="lg">
					<v-row align="center">
						<v-col cols="12" md="4" class="d-flex align-center">
							<v-avatar color="primary-lighten-4" size="48" class="mr-4 rounded-lg">
								<v-icon color="primary">mdi-format-list-bulleted</v-icon>
							</v-avatar>
							<div>
								<div class="text-caption text-uppercase text-medium-emphasis">{{ __("Filter Results") }}</div>
								<div class="text-h6 font-weight-bold">{{ filteredByInvoice.length }} {{ __("Rows") }}</div>
							</div>
						</v-col>
						<v-col cols="12" md="4" class="d-flex align-center">
							<v-avatar color="secondary-lighten-4" size="48" class="mr-4 rounded-lg">
								<v-icon color="secondary">mdi-receipt</v-icon>
							</v-avatar>
							<div>
								<div class="text-caption text-uppercase text-medium-emphasis">{{ __("Unique Invoices") }}</div>
								<div class="text-h6 font-weight-bold">{{ totalInvoices }}</div>
							</div>
						</v-col>
						<v-col cols="12" md="4" class="d-flex align-center">
							<v-avatar color="warning-lighten-4" size="48" class="mr-4 rounded-lg">
								<v-icon color="warning">mdi-cube-consume</v-icon>
							</v-avatar>
							<div>
								<div class="text-caption text-uppercase text-medium-emphasis">{{ __("Total Items Consumed") }}</div>
								<div class="text-h6 font-weight-bold text-warning">{{ formatFloat(totalConsumedByInvoice) }}</div>
							</div>
						</v-col>
					</v-row>
				</v-card>

				<v-card elevation="3" rounded="lg" class="overflow-hidden">
					<v-data-table
						:headers="usageByInvoiceHeaders"
						:items="filteredByInvoice"
						item-key="id"
						:loading="loadingUsage"
						density="comfortable"
						class="pos-themed-table"
					>
						<template #item.invoice="{ item }">
							<v-btn
								variant="text"
								color="primary"
								class="font-weight-bold px-2"
								:href="invoiceUrl(item.raw?.invoice || item.invoice)"
								target="_blank"
							>
								{{ item.raw?.invoice || item.invoice }}
								<v-icon end size="small">mdi-open-in-new</v-icon>
							</v-btn>
						</template>
						<template #item.consumed_qty="{ item }">
							<v-chip color="warning" size="small" class="font-weight-bold">
								{{ item.raw?.consumed_qty || item.consumed_qty }}
							</v-chip>
						</template>
					</v-data-table>
				</v-card>
			</v-window-item>

			<!-- By Item Tab -->
			<v-window-item value="by_item">
				<v-card class="pos-themed-card mb-4 pa-4" elevation="2" rounded="lg">
					<v-row align="center">
						<v-col cols="12" md="6" class="d-flex align-center">
							<v-avatar color="primary-lighten-4" size="48" class="mr-4 rounded-lg">
								<v-icon color="primary">mdi-package-variant</v-icon>
							</v-avatar>
							<div>
								<div class="text-caption text-uppercase text-medium-emphasis">{{ __("Component Items") }}</div>
								<div class="text-h6 font-weight-bold">{{ filteredByItem.length }}</div>
							</div>
						</v-col>
						<v-col cols="12" md="6" class="d-flex align-center">
							<v-avatar color="warning-lighten-4" size="48" class="mr-4 rounded-lg">
								<v-icon color="warning">mdi-chart-bell-curve-cumulative</v-icon>
							</v-avatar>
							<div>
								<div class="text-caption text-uppercase text-medium-emphasis">{{ __("Total Volume Consumed") }}</div>
								<div class="text-h6 font-weight-bold text-warning">{{ formatFloat(totalConsumedByItem) }}</div>
							</div>
						</v-col>
					</v-row>
				</v-card>

				<v-card elevation="3" rounded="lg" class="overflow-hidden">
					<v-data-table
						:headers="usageByItemHeaders"
						:items="filteredByItem"
						item-key="component_item"
						:loading="loadingUsage"
						density="comfortable"
						class="pos-themed-table"
					>
						<template #item.component_item="{ item }">
							<span class="font-weight-medium">{{ item.raw?.component_item || item.component_item }}</span>
						</template>
						<template #item.total_consumed_qty="{ item }">
							<v-chip color="warning" size="small" class="font-weight-bold">
								{{ item.raw?.total_consumed_qty || item.total_consumed_qty }}
							</v-chip>
						</template>
						<template #item.invoices="{ item }">
							<v-badge color="info" :content="item.raw?.invoices || item.invoices" inline></v-badge>
						</template>
					</v-data-table>
				</v-card>
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
		const dateRange = ref("today");
		const summary = ref(null);
		const loading = ref(false);
		const activeTab = ref("overview");
		const componentFilter = ref(null);
		const componentOptions = ref([]);

		const setDateRange = (val) => {
			if (!val) {
				dateRange.value = "this_month";
				val = "this_month";
			}
			const now = new Date();
			const tzOffset = now.getTimezoneOffset() * 60000;
			const localISO = (d) => new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
			
			if (val === "today") {
				fromDate.value = localISO(now);
				toDate.value = localISO(now);
			} else if (val === "yesterday") {
				const yest = new Date(now);
				yest.setDate(now.getDate() - 1);
				fromDate.value = localISO(yest);
				toDate.value = localISO(yest);
			} else if (val === "this_week") {
				const start = new Date(now);
				start.setDate(now.getDate() - now.getDay());
				fromDate.value = localISO(start);
				toDate.value = localISO(now);
			} else if (val === "this_month") {
				const start = new Date(now.getFullYear(), now.getMonth(), 1);
				fromDate.value = localISO(start);
				toDate.value = localISO(now);
			}
			refreshAll();
		};

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
			{ title: __("Invoices"), key: "invoices", align: "center" }
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
			dateRange,
			setDateRange,
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

<style scoped>
.metric-card {
	transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}
.metric-card:hover {
	transform: translateY(-4px);
	box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
}
.pos-themed-table :deep(th) {
	background-color: rgba(var(--v-theme-surface), 0.8) !important;
	font-weight: 700 !important;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	font-size: 0.85rem;
}
.border-b {
	border-bottom: 1px solid rgba(128, 128, 128, 0.2);
}
</style>
