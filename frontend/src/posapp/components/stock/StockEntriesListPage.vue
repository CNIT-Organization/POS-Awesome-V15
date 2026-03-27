<template>
	<v-row class="pa-4" dense>
		<v-col cols="12" md="6">
			<v-text-field
				v-model="search"
				density="compact"
				variant="outlined"
				class="pos-themed-input"
				:label="__('Search Stock Entries (Name or Type)')"
				hide-details
				clearable
			/>
		</v-col>
		<v-col cols="12" md="6" class="d-flex justify-end align-center" style="gap: 8px;">
			<v-btn color="primary" @click="createStockEntry">
				<v-icon start>mdi-plus</v-icon>
				{{ __("Create Stock Entry") }}
			</v-btn>
			<v-btn color="primary" variant="tonal" :loading="loading" @click="load(true)">
				<v-icon start>mdi-refresh</v-icon>
				{{ __("Refresh") }}
			</v-btn>
		</v-col>

		<v-col cols="12">
			<v-data-table
				:headers="headers"
				:items="rows"
				item-key="name"
				:loading="loading"
				class="elevation-1"
				density="compact"
			>
				<template v-slot:item.actions="{ item }">
					<v-btn
						size="small"
						color="secondary"
						variant="text"
						@click="openDetails(item.raw?.name || item.name)"
					>
						<v-icon start size="small">mdi-open-in-new</v-icon>
						{{ __("Open") }}
					</v-btn>
				</template>
			</v-data-table>

			<div class="text-center mt-3">
				<v-btn
					color="primary"
					variant="outlined"
					:disabled="loading || !hasMore"
					:loading="loadingMore"
					@click="loadMore"
				>
					{{ hasMore ? __("Load more") : __("No more entries") }}
				</v-btn>
			</div>
		</v-col>
	</v-row>
</template>

<script>
/* global frappe, __ */
import { computed, onMounted, ref, watch, getCurrentInstance } from "vue";
import _ from "lodash";

export default {
	name: "StockEntriesListPage",
	setup() {
		const { proxy } = getCurrentInstance();
		const rows = ref([]);
		const loading = ref(false);
		const loadingMore = ref(false);
		const hasMore = ref(true);
		const pageSize = 50;
		const offset = ref(0);

		const search = ref("");

		const headers = computed(() => [
			{ title: __("Name"), key: "name", align: "start", sortable: true },
			{ title: __("Type"), key: "stock_entry_type", align: "start", sortable: true },
			{ title: __("Company"), key: "company", align: "start", sortable: true },
			{ title: __("From Warehouse"), key: "from_warehouse", align: "start", sortable: true },
			{ title: __("To Warehouse"), key: "to_warehouse", align: "start", sortable: true },
			{ title: __("Date"), key: "posting_date", align: "start", sortable: true },
			{ title: __("Actions"), key: "actions", align: "end", sortable: false },
		]);

		const fetchPage = async (reset = false) => {
			if (reset) {
				offset.value = 0;
				rows.value = [];
				hasMore.value = true;
			}
			if (!hasMore.value) return;

			const currentOffset = offset.value;
			const fields = ["name", "stock_entry_type", "company", "from_warehouse", "to_warehouse", "posting_date"];

			let data = await frappe.db.get_list("Stock Entry", {
				fields,
				order_by: "modified desc",
				limit_start: currentOffset,
				limit: pageSize,
			});

			const term = (search.value || "").trim().toLowerCase();
			if (term) {
				data = (data || []).filter((row) => {
					const nameStr = String(row.name || "").toLowerCase();
					const typeStr = String(row.stock_entry_type || "").toLowerCase();
					return nameStr.includes(term) || typeStr.includes(term);
				});
			}

			rows.value = [...rows.value, ...(data || [])];
			offset.value = currentOffset + pageSize;
			hasMore.value = (data || []).length === pageSize;
		};

		const load = async (reset = false) => {
			loading.value = true;
			try {
				await fetchPage(reset);
			} finally {
				loading.value = false;
			}
		};

		const loadMore = async () => {
			if (!hasMore.value) return;
			loadingMore.value = true;
			try {
				await fetchPage(false);
			} finally {
				loadingMore.value = false;
			}
		};

		const openDetails = (name) => {
			if (proxy.eventBus) {
				proxy.eventBus.emit("change-page", { page: "Stock Entry Details", props: { name } });
			}
		};

		const createStockEntry = () => {
			if (proxy.eventBus) {
				proxy.eventBus.emit("change-page", "Create Stock Entry");
			}
		};

		const debouncedReload = _.debounce(() => load(true), 250);
		watch(search, () => debouncedReload());

		onMounted(() => {
			load(true);
		});

		return { headers, rows, loading, loadingMore, hasMore, search, load, loadMore, openDetails, createStockEntry };
	},
};
</script>
