<template>
	<v-container class="pa-4" fluid>
		<!-- Header -->
		<v-row class="mb-4">
			<v-col cols="12" class="d-flex justify-space-between align-center">
				<div class="d-flex align-center">
					<v-btn variant="text" color="primary" class="mr-3" @click="goBack">
						<v-icon start>mdi-arrow-left</v-icon>{{ __("Back to Recipes") }}
					</v-btn>
					<div>
						<div class="text-h5 font-weight-bold pos-text-primary d-flex align-center">
							{{ isNew ? __("Create POS Recipe") : (doc?.name || recipeName) }}
							<v-chip
								v-if="!isNew && doc"
								class="ml-3 font-weight-bold"
								size="small"
								:color="doc.is_active ? 'success' : 'error'"
								variant="flat"
							>
								{{ doc.is_active ? __("Active") : __("Inactive") }}
							</v-chip>
						</div>
					</div>
				</div>
				<v-btn v-if="!isNew && doc" color="primary" variant="tonal" @click="openInDesk">
					<v-icon start>mdi-open-in-new</v-icon> {{ __("Open in Desk") }}
				</v-btn>
			</v-col>
		</v-row>

		<div v-if="loading" class="d-flex justify-center pa-10">
			<v-progress-circular indeterminate color="primary"></v-progress-circular>
		</div>

		<v-row v-else>
			<v-col cols="12">
				<v-card class="pos-themed-card mb-4 pb-2" elevation="2">
					<v-card-title class="text-subtitle-1 font-weight-bold border-b pb-2 mb-3 px-6 pt-4">
						<v-icon left size="small" class="mr-2">mdi-information-outline</v-icon>
						{{ __("Recipe Information") }}
					</v-card-title>
					<v-card-text class="px-6">
						<v-form ref="recipeForm" :disabled="!isNew && !isEditing">
							<v-row>
								<v-col cols="12" md="4">
									<v-autocomplete
										v-model="formData.item"
										:items="items"
										item-title="item_name"
										item-value="item_code"
										:label="__('Item')"
										density="compact"
										variant="outlined"
										:rules="[v => !!v || __('Item is required')]"
										@update:model-value="onMainItemSelect"
									>
										<template v-slot:item="{ props, item }">
											<v-list-item v-bind="props">
												<template v-slot:title>
													{{ item.raw.item_code }} - {{ item.raw.item_name }}
												</template>
											</v-list-item>
										</template>
									</v-autocomplete>
								</v-col>
								<v-col cols="12" md="4">
									<v-autocomplete
										v-model="formData.uom"
										:items="uoms"
										item-title="name"
										item-value="name"
										:label="__('UOM')"
										density="compact"
										variant="outlined"
										:rules="[v => !!v || __('UOM is required')]"
									></v-autocomplete>
								</v-col>
								<v-col cols="12" md="4">
									<v-autocomplete
										v-model="formData.company"
										:items="companies"
										item-title="name"
										item-value="name"
										:label="__('Company')"
										density="compact"
										variant="outlined"
									></v-autocomplete>
								</v-col>
								<v-col cols="12" md="6" class="d-flex align-center pt-0">
									<v-checkbox
										v-model="formData.is_active"
										:label="__('Is Active')"
										color="primary"
										hide-details
										class="mr-4"
									></v-checkbox>
									<v-checkbox
										v-model="formData.update_stock"
										:label="__('Update Stock')"
										color="primary"
										hide-details
									></v-checkbox>
								</v-col>
							</v-row>
						</v-form>
					</v-card-text>
				</v-card>

				<v-card class="pos-themed-card" elevation="2">
					<v-card-title class="text-subtitle-1 font-weight-bold border-b pb-2 mb-3 px-6 pt-4 d-flex justify-space-between align-center">
						<div>
							<v-icon left size="small" class="mr-2">mdi-format-list-bulleted</v-icon>
							{{ __("Components") }}
						</div>
					</v-card-title>
					
					<v-card-text class="px-6 pb-6 mt-2">
						<!-- Add Component Row -->
						<v-row v-if="isNew || isEditing" align="center" class="mb-4 bg-grey-lighten-4 pa-2 rounded-lg border">
							<v-col cols="12" md="5">
								<v-autocomplete
									v-model="newComp.item_code"
									:items="items"
									item-title="item_name"
									item-value="item_code"
									:label="__('Component Item')"
									density="compact"
									variant="outlined"
									hide-details
									@update:model-value="onCompItemSelect"
								>
									<template v-slot:item="{ props, item }">
										<v-list-item v-bind="props">
											<template v-slot:title>
												{{ item.raw.item_code }} - {{ item.raw.item_name }}
											</template>
										</v-list-item>
									</template>
								</v-autocomplete>
							</v-col>
							<v-col cols="12" md="2">
								<v-text-field
									v-model.number="newComp.qty"
									:label="__('Quantity')"
									type="number"
									density="compact"
									variant="outlined"
									hide-details
								></v-text-field>
							</v-col>
							<v-col cols="12" md="3">
								<v-autocomplete
									v-model="newComp.uom"
									:items="uoms"
									item-title="name"
									item-value="name"
									:label="__('UOM')"
									density="compact"
									variant="outlined"
									hide-details
								></v-autocomplete>
							</v-col>
							<v-col cols="12" md="2">
								<v-btn color="primary" @click="addComponent" block>
									<v-icon start>mdi-plus</v-icon> {{ __("Add") }}
								</v-btn>
							</v-col>
						</v-row>

						<v-data-table
							:headers="componentHeaders"
							:items="formData.components"
							density="comfortable"
							class="elevation-1 border"
						>
							<template v-slot:item.item_name="{ item }">
								{{ getItemName(item.raw?.item_code || item.item_code) }}
							</template>
							<template v-slot:item.qty="{ item, index }">
								<v-text-field v-if="(isNew || isEditing)"
									v-model.number="formData.components[index].qty"
									type="number"
									density="compact"
									variant="outlined"
									hide-details
									style="max-width: 100px"
								></v-text-field>
								<span v-else>{{ item.raw?.qty || item.qty }}</span>
							</template>
							<template v-slot:item.actions="{ item, index }">
								<v-btn v-if="isNew || isEditing"
									icon="mdi-delete"
									size="small"
									color="error"
									variant="text"
									@click="removeComponent(index)"
								></v-btn>
							</template>
						</v-data-table>
					</v-card-text>

					<v-card-actions class="px-6 pb-6 pt-0 d-flex justify-end" v-if="isNew || isEditing">
						<v-btn v-if="!isNew" color="grey" variant="text" class="mr-2" @click="cancelEdit">{{ __("Cancel") }}</v-btn>
						<v-btn color="primary" :loading="submitting" @click="saveRecipe">
							{{ isNew ? __("Create Recipe") : __("Save Changes") }}
						</v-btn>
					</v-card-actions>
					<v-card-actions class="px-6 pb-6 pt-0 d-flex justify-end" v-else>
						<v-btn color="primary" variant="tonal" @click="startEdit">
							<v-icon start>mdi-pencil</v-icon> {{ __("Edit") }}
						</v-btn>
					</v-card-actions>
				</v-card>
			</v-col>
		</v-row>
		
		<v-snackbar v-model="snack" :timeout="snackTimeout" :color="snackColor" location="top right">
			{{ snackText }}
			<template v-slot:actions>
				<v-btn color="white" variant="text" @click="snack = false">{{ __("Close") }}</v-btn>
			</template>
		</v-snackbar>
	</v-container>
</template>

<script>
/* global __, frappe */
import { onMounted, ref, computed, getCurrentInstance } from "vue";

export default {
	name: "RecipeDetailsPage",
	props: {
		name: { type: String, default: null },
		isNew: { type: Boolean, default: false }
	},
	setup(props, { attrs }) {
		const { proxy } = getCurrentInstance();
		
		// Determine actual values from vue-router or props
		const route = window?.app?.$router?.currentRoute?.value || null;
		const initialName = route?.params?.name || props.name || attrs?.name;
		const isExplicitlyNew = route?.params?.isNew === true || route?.params?.isNew === "true" || props.isNew === true || attrs?.isNew === true;
		
		const isNew = ref(isExplicitlyNew || !initialName);
		const recipeName = ref(isNew.value ? null : initialName);
		
		const doc = ref(null);
		const loading = ref(false);
		const submitting = ref(false);
		const isEditing = ref(false);
		
		const items = ref([]);
		const uoms = ref([]);
		const companies = ref([]);
		
		const formData = ref({
			item: "",
			uom: "",
			company: "",
			is_active: 1,
			update_stock: 0,
			components: []
		});
		
		const newComp = ref({
			item_code: "",
			qty: 1,
			uom: ""
		});

		const snack = ref(false);
		const snackText = ref("");
		const snackColor = ref("success");
		const snackTimeout = ref(3000);

		const showMessage = (text, color = "success") => {
			snackText.value = text;
			snackColor.value = color;
			snack.value = true;
		};

		const componentHeaders = computed(() => {
			const headers = [
				{ title: __("Item Code"), key: "item_code" },
				{ title: __("Item Name"), key: "item_name" },
				{ title: __("Quantity"), key: "qty" },
				{ title: __("UOM"), key: "uom" }
			];
			if (isNew.value || isEditing.value) {
				headers.push({ title: __("Actions"), key: "actions", align: "end", sortable: false });
			}
			return headers;
		});

		const loadMasterData = async () => {
			try {
				const [itemsRes, uomsRes, compRes] = await Promise.all([
					frappe.call({
						method: "frappe.client.get_list",
						args: {
							doctype: "Item",
							fields: ["item_code", "item_name", "stock_uom"],
							filters: { disabled: 0 },
							limit_page_length: 5000,
						}
					}),
					frappe.call({
						method: "frappe.client.get_list",
						args: { doctype: "UOM", fields: ["name"], limit_page_length: 500 }
					}),
					frappe.call({
						method: "frappe.client.get_list",
						args: { doctype: "Company", fields: ["name"], limit_page_length: 100 }
					})
				]);
				
				items.value = itemsRes.message || [];
				uoms.value = uomsRes.message || [];
				companies.value = compRes.message || [];
				
				if (isNew.value && !formData.value.company && companies.value.length === 1) {
					formData.value.company = companies.value[0].name;
				} else if (isNew.value && frappe.boot?.sysdefaults?.company) {
					formData.value.company = frappe.boot.sysdefaults.company;
				}
			} catch (e) {
				console.error("Failed to load master data", e);
			}
		};

		const loadRecipe = async (name) => {
			if (!name) return;
			loading.value = true;
			try {
				const d = await frappe.db.get_doc("POS Recipe", name);
				doc.value = d;
				formData.value = {
					item: d.item,
					uom: d.uom,
					company: d.company,
					is_active: d.is_active,
					update_stock: d.update_stock,
					components: (d.components || []).map(c => ({
						item_code: c.item_code,
						qty: c.qty,
						uom: c.uom
					}))
				};
			} catch (e) {
				console.error("Failed to load recipe", e);
				showMessage(__("Failed to load recipe"), "error");
			} finally {
				loading.value = false;
			}
		};

		const getItemName = (itemCode) => {
			const item = items.value.find(i => i.item_code === itemCode);
			return item ? item.item_name : itemCode;
		};

		const onMainItemSelect = (itemCode) => {
			const item = items.value.find(i => i.item_code === itemCode);
			if (item && !formData.value.uom) {
				formData.value.uom = item.stock_uom;
			}
		};

		const onCompItemSelect = (itemCode) => {
			const item = items.value.find(i => i.item_code === itemCode);
			if (item) {
				newComp.value.uom = item.stock_uom;
			}
		};

		const addComponent = () => {
			if (!newComp.value.item_code) {
				showMessage(__("Please select a component item"), "warning");
				return;
			}
			if (!newComp.value.qty || newComp.value.qty <= 0) {
				showMessage(__("Quantity must be greater than zero"), "warning");
				return;
			}
			if (!newComp.value.uom) {
				showMessage(__("UOM is required"), "warning");
				return;
			}
			
			formData.value.components.push({ ...newComp.value });
			newComp.value = { item_code: "", qty: 1, uom: "" };
		};

		const removeComponent = (index) => {
			formData.value.components.splice(index, 1);
		};

		const startEdit = () => {
			isEditing.value = true;
		};

		const cancelEdit = () => {
			isEditing.value = false;
			if (doc.value) {
				formData.value = {
					item: doc.value.item,
					uom: doc.value.uom,
					company: doc.value.company,
					is_active: doc.value.is_active,
					update_stock: doc.value.update_stock,
					components: (doc.value.components || []).map(c => ({
						item_code: c.item_code,
						qty: c.qty,
						uom: c.uom
					}))
				};
			}
		};

		const saveRecipe = async () => {
			const isValid = await proxy.$refs.recipeForm?.validate();
			if (isValid && !isValid.valid) {
				showMessage(__("Please fill all required fields"), "error");
				return;
			}
			if (!formData.value.components.length) {
				showMessage(__("Please add at least one component"), "warning");
				return;
			}

			submitting.value = true;
			try {
				const method = isNew.value ? "frappe.client.insert" : "frappe.client.save";
				const payload_doc = {
					doctype: "POS Recipe",
					item: formData.value.item,
					uom: formData.value.uom,
					company: formData.value.company,
					is_active: formData.value.is_active ? 1 : 0,
					update_stock: formData.value.update_stock ? 1 : 0,
					components: formData.value.components.map(c => ({
						item_code: c.item_code,
						qty: c.qty,
						uom: c.uom
					}))
				};
				
				if (!isNew.value) {
					payload_doc.name = doc.value.name;
				}

				const response = await frappe.call({
					method: method,
					args: { doc: payload_doc }
				});

				const savedDoc = response.message;
				if (savedDoc) {
					showMessage(
						isNew.value ? __("Recipe created successfully") : __("Recipe updated successfully"),
						"success"
					);
					if (isNew.value) {
						// Switch to view mode
						isNew.value = false;
						recipeName.value = savedDoc.name;
						isEditing.value = false;
					} else {
						isEditing.value = false;
					}
					doc.value = savedDoc;
					if (proxy.eventBus && isNew.value) {
						// optionally refresh route or something if needed
					}
				}
			} catch (e) {
				console.error("Failed to save recipe", e);
				let msg = __("Failed to save recipe");
				if (e.message) msg = e.message;
				else if (e.exc && JSON.parse(e.exc)[0]) {
					try {
						msg = JSON.parse(JSON.parse(e.exc)[0]).message || msg;
					} catch(err) {}
				}
				showMessage(msg, "error");
			} finally {
				submitting.value = false;
			}
		};

		const goBack = () => {
			if (proxy.eventBus) {
				proxy.eventBus.emit("change-page", "Recipes");
			}
		};

		const openInDesk = () => {
			if (!recipeName.value) return;
			const url =
				frappe.urllib.get_base_url() +
				"/app/pos-recipe/" +
				encodeURIComponent(recipeName.value);
			window.open(url, "_blank");
		};

		onMounted(async () => {
			await loadMasterData();
			if (!isNew.value && recipeName.value) {
				loadRecipe(recipeName.value);
			}
		});

		window.addEventListener('hashchange', () => {
			const currentRoute = window?.app?.$router?.currentRoute?.value || null;
			const newName = currentRoute?.params?.name || props.name || attrs?.name;
			const explicitlyNew = currentRoute?.params?.isNew === true || currentRoute?.params?.isNew === "true" || props.isNew === true || attrs?.isNew === true;
			
			if (explicitlyNew) {
				isNew.value = true;
				recipeName.value = null;
				formData.value = {
					item: "", uom: "", company: frappe.boot?.sysdefaults?.company || "", is_active: 1, update_stock: 0, components: []
				};
				isEditing.value = false;
				doc.value = null;
			} else if (newName && newName !== recipeName.value) {
				isNew.value = false;
				recipeName.value = newName;
				loadRecipe(newName);
			}
		});

		return { 
			isNew, recipeName, doc, formData, newComp,
			loading, submitting, isEditing,
			items, uoms, companies,
			componentHeaders,
			snack, snackText, snackColor, snackTimeout,
			getItemName, onMainItemSelect, onCompItemSelect,
			addComponent, removeComponent,
			startEdit, cancelEdit, saveRecipe,
			goBack, openInDesk
		};
	}
};
</script>

<style scoped>
.pos-themed-card {
	border-radius: 8px;
}
.border-b {
	border-bottom: 1px solid rgba(128, 128, 128, 0.1);
}
.border {
	border: 1px solid rgba(128, 128, 128, 0.2);
}
</style>
