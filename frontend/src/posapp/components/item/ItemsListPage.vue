<template>
	<v-row class="pa-4" dense>
		<v-col cols="12" md="6">
			<v-text-field
				v-model="search"
				density="compact"
				variant="outlined"
				class="pos-themed-input"
				:label="__('Search Items (Code or Name)')"
				hide-details
				clearable
			/>
		</v-col>
		<v-col cols="12" md="6" class="d-flex justify-end align-center" style="gap: 8px;">
			<v-btn color="primary" @click="createItem">
				<v-icon start>mdi-plus</v-icon>
				{{ __("Create Item") }}
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
						{{ __("Open in Desk") }}
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
					{{ hasMore ? __("Load more") : __("No more items") }}
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
	name: "ItemsListPage",
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
			{ title: __("Item Code"), key: "item_code", align: "start", sortable: true },
			{ title: __("Item Name"), key: "item_name", align: "start", sortable: true },
			{ title: __("Item Group"), key: "item_group", align: "start", sortable: true },
			{ title: __("Standard Rate"), key: "standard_rate", align: "end", sortable: true },
			{ title: __("UOM"), key: "stock_uom", align: "start", sortable: true },
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
			const fields = ["name", "item_code", "item_name", "item_group", "standard_rate", "stock_uom"];

			let data = await frappe.db.get_list("Item", {
				fields,
				order_by: "modified desc",
				limit_start: currentOffset,
				limit: pageSize,
			});

			const term = (search.value || "").trim().toLowerCase();
			if (term) {
				data = (data || []).filter((row) => {
					const code = String(row.item_code || "").toLowerCase();
					const nameStr = String(row.item_name || "").toLowerCase();
					return code.includes(term) || nameStr.includes(term);
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
			const url = `${frappe.urllib.get_base_url()}/app/item/${encodeURIComponent(name)}`;
			window.open(url, "_blank");
		};

		const createItem = () => {
			if (proxy.eventBus) {
				proxy.eventBus.emit("change-page", "Create Item");
			}
		};

		const debouncedReload = _.debounce(() => load(true), 250);
		watch(search, () => debouncedReload());

		onMounted(() => {
			load(true);
		});

		return { headers, rows, loading, loadingMore, hasMore, search, load, loadMore, openDetails, createItem };
	},
};
</script>
