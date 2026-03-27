<template>
	<v-container class="pa-4" fluid>
		<!-- Header -->
		<v-row class="mb-4">
			<v-col cols="12" class="d-flex justify-space-between align-center">
				<div class="d-flex align-center">
					<v-btn variant="text" color="primary" class="mr-3" @click="goBack">
						<v-icon start>mdi-arrow-left</v-icon>{{ __("Back to Items") }}
					</v-btn>
					<div>
						<div class="text-h5 font-weight-bold pos-text-primary d-flex align-center">
							{{ doc?.item_name || itemName }}
							<v-chip
								v-if="doc"
								class="ml-3 font-weight-bold"
								size="small"
								:color="doc.disabled ? 'error' : 'success'"
								variant="flat"
							>
								{{ doc.disabled ? __("Disabled") : __("Active") }}
							</v-chip>
						</div>
						<div class="text-caption text-medium-emphasis mt-1">
							{{ __("Item Code:") }} <span class="font-weight-medium">{{ itemName }}</span>
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
			<!-- Inventory & Pricing Summary -->
			<v-col cols="12" md="4">
				<v-card class="pos-themed-card mb-4 pb-2" elevation="2">
					<div class="bg-primary text-white pa-4 d-flex align-center rounded-t">
						<v-icon size="x-large" class="mr-3">mdi-cash-tag</v-icon>
						<div>
							<div class="text-caption text-white opacity-80 text-uppercase tracking-wide">{{ __("Standard Rate") }}</div>
							<div class="text-h4 font-weight-bold">{{ formatMoney(doc.standard_rate) }}</div>
						</div>
					</div>
					<v-card-text class="pt-4">
						<v-list density="compact" class="bg-transparent pa-0">
							<v-list-item class="mb-2 border-b pb-2">
								<template v-slot:prepend><v-icon size="small" color="secondary" class="mr-3">mdi-scale-balance</v-icon></template>
								<v-list-item-title class="text-body-2 text-medium-emphasis">{{ __("Valuation Rate") }}</v-list-item-title>
								<v-list-item-subtitle class="text-body-1 font-weight-medium pos-text-primary">{{ formatMoney(doc.valuation_rate) }}</v-list-item-subtitle>
							</v-list-item>
							<v-list-item class="mb-2 border-b pb-2">
								<template v-slot:prepend><v-icon size="small" color="secondary" class="mr-3">mdi-weight</v-icon></template>
								<v-list-item-title class="text-body-2 text-medium-emphasis">{{ __("Default UOM") }}</v-list-item-title>
								<v-list-item-subtitle class="text-body-1 font-weight-medium pos-text-primary">{{ doc.stock_uom }}</v-list-item-subtitle>
							</v-list-item>
							<v-list-item>
								<template v-slot:prepend><v-icon size="small" color="secondary" class="mr-3">mdi-barcode-scan</v-icon></template>
								<v-list-item-title class="text-body-2 text-medium-emphasis">{{ __("Barcode") }}</v-list-item-title>
								<v-list-item-subtitle class="text-body-1 font-weight-medium pos-text-primary">{{ doc.barcode || __("None") }}</v-list-item-subtitle>
							</v-list-item>
						</v-list>
					</v-card-text>
				</v-card>

				<v-card class="pos-themed-card" elevation="2">
					<v-card-title class="text-subtitle-1 font-weight-bold border-b pb-2 mb-3">
						<v-icon left size="small" class="mr-2">mdi-cog-outline</v-icon>
						{{ __("Properties") }}
					</v-card-title>
					<v-card-text>
						<div class="d-flex flex-wrap gap-2">
							<v-chip v-if="doc.is_stock_item" color="info" size="small" variant="flat">{{ __("Stock Item") }}</v-chip>
							<v-chip v-if="doc.is_sales_item" color="success" size="small" variant="flat">{{ __("Sales Item") }}</v-chip>
							<v-chip v-if="doc.is_purchase_item" color="warning" size="small" variant="flat">{{ __("Purchase Item") }}</v-chip>
							<v-chip v-if="doc.has_variants" color="purple" size="small" variant="flat">{{ __("Has Variants") }}</v-chip>
							<v-chip v-if="doc.is_fixed_asset" color="brown" size="small" variant="flat">{{ __("Fixed Asset") }}</v-chip>
						</div>
					</v-card-text>
				</v-card>
			</v-col>

			<!-- Details & Classification -->
			<v-col cols="12" md="8">
				<v-card class="pos-themed-card h-100" elevation="2">
					<v-card-title class="text-subtitle-1 font-weight-bold border-b pb-2 mb-3 px-6 pt-4">
						<v-icon left size="small" class="mr-2">mdi-text-box-outline</v-icon>
						{{ __("Classification & Details") }}
					</v-card-title>
					<v-card-text class="px-6 pb-6 pt-2">
						<v-row>
							<v-col cols="12" sm="6" class="mb-2">
								<div class="text-caption text-medium-emphasis mb-1">{{ __("Item Group") }}</div>
								<div class="text-body-1 font-weight-medium pos-text-primary d-flex align-center">
									<v-icon size="small" color="primary" class="mr-2">mdi-shape-outline</v-icon>
									{{ doc.item_group }}
								</div>
							</v-col>
							<v-col cols="12" sm="6" class="mb-2">
								<div class="text-caption text-medium-emphasis mb-1">{{ __("Brand") }}</div>
								<div class="text-body-1 font-weight-medium pos-text-primary d-flex align-center">
									<v-icon size="small" color="primary" class="mr-2">mdi-tag-heart-outline</v-icon>
									{{ doc.brand || __("Unbranded") }}
								</div>
							</v-col>
							
							<v-col cols="12" class="mt-4">
								<v-divider class="mb-4"></v-divider>
								<div class="text-caption text-medium-emphasis mb-2">{{ __("Description") }}</div>
								<div 
									class="text-body-1 pos-text-primary bg-grey-lighten-4 pa-4 rounded-lg" 
									style="min-height: 100px;"
								>
									<span v-if="!doc.description" class="text-medium-emphasis font-italic">{{ __("No description provided") }}</span>
									<div v-else v-html="doc.description"></div>
								</div>
							</v-col>
						</v-row>

						<!-- Optional Image Display -->
						<v-row v-if="doc.image" class="mt-4">
							<v-col cols="12">
								<v-divider class="mb-4"></v-divider>
								<div class="text-caption text-medium-emphasis mb-2">{{ __("Item Image") }}</div>
								<v-img
									:src="doc.image"
									max-height="250"
									contain
									class="rounded-lg border bg-grey-lighten-4"
								></v-img>
							</v-col>
						</v-row>
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
	name: "ItemDetailsPage",
	props: ["name"],
	setup(props, { attrs }) {
		const { proxy } = getCurrentInstance();
		const itemName = ref(null);
		const doc = ref(null);
		const loading = ref(false);

		const formatMoney = (val) => {
			const num = Number(val || 0);
			return Number.isFinite(num) ? num.toFixed(2) : "0.00";
		};

		const load = async (name) => {
			loading.value = true;
			try {
				const d = await frappe.db.get_doc("Item", name);
				doc.value = d;
			} catch (e) {
				console.error("Failed to load item", e);
			} finally {
				loading.value = false;
			}
		};

		const goBack = () => {
			if (proxy.eventBus) {
				proxy.eventBus.emit("change-page", "Items");
			}
		};

		const openInDesk = () => {
			if (!itemName.value) return;
			const url =
				frappe.urllib.get_base_url() +
				"/app/item/" +
				encodeURIComponent(itemName.value);
			window.open(url, "_blank");
		};

		onMounted(() => {
			const route = window?.app?.$router?.currentRoute?.value || null;
			const name = route?.params?.name || props.name || attrs?.name;
			itemName.value = name;
			if (name) load(name);
		});

		window.addEventListener('hashchange', () => {
			const route = window?.app?.$router?.currentRoute?.value || null;
			const name = route?.params?.name || props.name || attrs?.name;
			if (name && name !== itemName.value) {
				itemName.value = name;
				load(name);
			}
		});

		return { itemName, doc, loading, formatMoney, goBack, openInDesk };
	}
};
</script>

<style scoped>
.tracking-wide {
	letter-spacing: 0.05em;
}
.gap-2 {
	gap: 8px;
}
.border-b {
	border-bottom: 1px solid rgba(128, 128, 128, 0.1);
}
</style>
