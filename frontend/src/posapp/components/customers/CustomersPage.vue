<template>
	<v-row class="pa-4" justify="center">
		<v-col cols="12" md="6">
			<v-text-field
				density="compact"
				variant="outlined"
				color="primary"
				class="pos-themed-input"
				v-model="searchTerm"
				:label="frappe._('Search customers')"
				hide-details
				clearable
			/>
		</v-col>

		<v-col cols="12" class="d-flex justify-end">
			<v-btn color="success" variant="tonal" class="mr-2" @click="addCustomer">
				<v-icon start>mdi-plus</v-icon>
				{{ __("Add new customer") }}
			</v-btn>
		</v-col>

		<v-col cols="12">
			<v-card elevation="2" rounded="lg" class="overflow-hidden">
				<v-data-table
					:headers="headers"
					:items="filteredCustomers"
					item-key="name"
					class="pos-themed-table"
					:loading="loadingCustomers"
					:footer-props="{
						'items-per-page-options': [10, 25, 50, 100],
						'items-per-page-text': 'Customers per page',
					}"
				>
					<template v-slot:item.customer_name="{ item }">
						<div class="d-flex align-center py-2">
							<v-avatar color="primary-lighten-4" size="36" class="mr-3 text-primary font-weight-bold">
								{{ getInitials(item.raw?.customer_name || item.customer_name) }}
							</v-avatar>
							<div>
								<div class="font-weight-medium text-body-1">{{ item.raw?.customer_name || item.customer_name }}</div>
								<div class="text-caption text-medium-emphasis">{{ item.raw?.name || item.name }}</div>
							</div>
						</div>
					</template>
					<template v-slot:item.name="{ item }">
						<!-- We hide the explicit ID column logic below by using display:none in headers but let's just render standard since we moved it above. -->
						<span class="text-body-2 text-medium-emphasis">{{ item.raw?.name || item.name }}</span>
					</template>
					<template v-slot:item.actions="{ item }">
						<v-btn
							size="small"
							color="primary"
							variant="tonal"
							class="text-none font-weight-bold"
							@click.stop="editCustomer(item.raw)"
						>
							<v-icon start size="small">mdi-account-edit</v-icon>
							{{ __("Manage") }}
						</v-btn>
					</template>
				</v-data-table>

				<v-card-actions class="justify-center py-4 bg-grey-lighten-5" v-if="hasMore">
					<v-btn color="primary" variant="outlined" rounded="pill" class="px-6" :loading="loadingCustomers" @click="loadMore">
						{{ __("Load more customers") }}
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-col>
	</v-row>

	<!-- Reuses existing POS-native dialog -->
	<UpdateCustomer />
</template>

<script>
/* global frappe, __ */
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import _ from "lodash";
import { getOpeningStorage } from "../../../offline/index.js";
import UpdateCustomer from "../payments/pos/UpdateCustomer.vue";
import { useCustomersStore } from "../../stores/customersStore.js";

export default {
	name: "CustomersPage",
	components: { UpdateCustomer },
	setup() {
		const { proxy } = getCurrentInstance();
		const eventBus = proxy?.eventBus;

		const customersStore = useCustomersStore();
		const { filteredCustomers, loadingCustomers, hasMore } = storeToRefs(customersStore);

		const searchTerm = ref("");

		const headers = computed(() => [
			{ title: __("Customer"), key: "customer_name", align: "start", sortable: true },
			// Hidden explicit ID column in favor of dual-line customer display
			// { title: __("ID"), key: "name", align: "start", sortable: true },
			{ title: __("Mobile"), key: "mobile_no", align: "start", sortable: true },
			{ title: __("Tax ID"), key: "tax_id", align: "start", sortable: true },
			{ title: __("Address"), key: "primary_address", align: "start", sortable: false },
			{ title: __("Actions"), key: "actions", align: "end", sortable: false },
		]);

		const getInitials = (name) => {
			if (!name) return "?";
			const words = String(name).trim().split(" ");
			if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
			return (words[0][0] + words[1][0]).toUpperCase();
		};

		const doSearch = _.debounce((term) => {
			customersStore.searchCustomers(term || "", false).catch(() => {});
		}, 250);

		onMounted(async () => {
			const opening = getOpeningStorage();
			if (opening?.pos_profile) {
				customersStore.setPosProfile(opening.pos_profile);
				// Ensure existing POS-native dialogs that listen for this bus event
				// (like UpdateCustomer) have the correct pos_profile.
				eventBus?.emit("register_pos_profile", opening);
			}

			await customersStore.get_customer_names();
			await customersStore.searchCustomers(searchTerm.value || "", false);
		});

		onBeforeUnmount(() => {
			doSearch.cancel();
		});

		watch(searchTerm, (val) => doSearch(val));

		const addCustomer = () => {
			eventBus?.emit("open_update_customer", null);
		};

		const editCustomer = (customer) => {
			// Provide the shape UpdateCustomer expects
			customersStore.setCustomerInfo(customer || {});
			eventBus?.emit("open_update_customer", customer || {});
		};

		const loadMore = () => {
			customersStore.loadMoreCustomers().catch(() => {});
		};

		return {
			searchTerm,
			headers,
			filteredCustomers,
			loadingCustomers,
			hasMore,
			addCustomer,
			editCustomer,
			loadMore,
			getInitials,
		};
	},
};
</script>

<style scoped>
/* Keeps the input widths stable across devices */
.pos-themed-input {
	width: 100%;
}
</style>

