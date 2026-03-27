<template>
	<v-row class="pa-4" dense>
		<v-col cols="12" md="8">
			<v-text-field
				v-model="search"
				density="compact"
				variant="outlined"
				class="pos-themed-input"
				:label="__('Search Recipes (item/uom/company)')"
				clearable
				hide-details
			/>
		</v-col>
		<v-col cols="12" md="4" class="d-flex justify-end align-center ga-2">
			<v-btn color="primary" variant="tonal" @click="openRecipeList">
				<v-icon start>mdi-format-list-bulleted</v-icon>{{ __("Open Recipe List") }}
			</v-btn>
			<v-btn color="primary" @click="createRecipe">
				<v-icon start>mdi-plus</v-icon>{{ __("New Recipe") }}
			</v-btn>
		</v-col>

		<v-col cols="12">
			<v-data-table
				:headers="headers"
				:items="filteredRows"
				item-key="name"
				:loading="loading"
				class="elevation-1"
			>
				<template v-slot:item.actions="{ item }">
					<v-btn size="small" color="primary" variant="text" @click="openRecipe(item.raw.name)">
						<v-icon start size="small">mdi-open-in-new</v-icon>{{ __("Open") }}
					</v-btn>
				</template>
			</v-data-table>
		</v-col>
	</v-row>
</template>

<script>
/* global frappe, __ */
import { computed, onMounted, ref, getCurrentInstance } from "vue";

export default {
	name: "RecipesPage",
	setup() {
		const { proxy } = getCurrentInstance();
		const rows = ref([]);
		const loading = ref(false);
		const search = ref("");
		const headers = ref([
			{ title: __("Recipe"), key: "name", sortable: true },
			{ title: __("Item"), key: "item", sortable: true },
			{ title: __("UOM"), key: "uom", sortable: true },
			{ title: __("Company"), key: "company", sortable: true },
			{ title: __("Active"), key: "is_active", sortable: true },
			{ title: __("Actions"), key: "actions", sortable: false, align: "end" },
		]);

		const load = async () => {
			loading.value = true;
			try {
				const data = await frappe.db.get_list("POS Recipe", {
					fields: ["name", "item", "uom", "company", "is_active", "modified"],
					order_by: "modified desc",
					limit: 200,
				});
				rows.value = data || [];
			} finally {
				loading.value = false;
			}
		};

		const filteredRows = computed(() => {
			const term = String(search.value || "").trim().toLowerCase();
			if (!term) return rows.value;
			return rows.value.filter((r) =>
				[String(r.name || ""), String(r.item || ""), String(r.uom || ""), String(r.company || "")]
					.join(" ")
					.toLowerCase()
					.includes(term),
			);
		});

		const openRecipe = (name) => {
			if (proxy.eventBus) {
				proxy.eventBus.emit("change-page", { page: "Recipe Details", props: { name } });
			}
		};
		const openRecipeList = () => {
			window.open(`${frappe.urllib.get_base_url()}/app/pos-recipe`, "_blank");
		};
		const createRecipe = () => {
			if (proxy.eventBus) {
				proxy.eventBus.emit("change-page", { page: "Recipe Details", props: { isNew: true } });
			}
		};

		onMounted(load);
		return { headers, rows, filteredRows, loading, search, openRecipe, openRecipeList, createRecipe };
	},
};
</script>

