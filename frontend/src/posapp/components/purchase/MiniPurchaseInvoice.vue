<template>
	<div fluid>
		<v-row>
			<v-col cols="12">
				<v-card
					:class="[
						'main mx-auto mt-3 p-4 overflow-y-auto',
						isDarkTheme ? '' : 'bg-grey-lighten-5',
					]"
					:style="isDarkTheme ? 'background-color:#1E1E1E' : ''"
					style="max-height: 94vh; height: 94vh"
				>
					<v-card-title class="text-h5 mb-4">
						<v-icon left class="mr-2">mdi-cart-plus</v-icon>
						{{ __("Create Purchase Invoice") }}
					</v-card-title>

					<v-form ref="invoiceForm">
						<v-row>
							<!-- Supplier -->
							<v-col cols="12" md="6">
								<v-autocomplete
									v-model="invoice.supplier"
									:items="suppliers"
									item-title="name"
									item-value="name"
									:label="__('Supplier') + ' *'"
									density="compact"
									variant="outlined"
									:rules="[v => !!v || __('Supplier is required')]"
									:bg-color="isDarkTheme ? '#1E1E1E' : 'white'"
								></v-autocomplete>
							</v-col>

							<!-- Company -->
							<v-col cols="12" md="6">
								<v-autocomplete
									v-model="invoice.company"
									:items="companies"
									item-title="name"
									item-value="name"
									:label="__('Company') + ' *'"
									density="compact"
									variant="outlined"
									:rules="[v => !!v || __('Company is required')]"
									:bg-color="isDarkTheme ? '#1E1E1E' : 'white'"
								></v-autocomplete>
							</v-col>
						</v-row>

						<v-row>
							<!-- Posting Date -->
							<v-col cols="12" md="6">
								<v-text-field
									v-model="invoice.posting_date"
									type="date"
									:label="__('Posting Date') + ' *'"
									density="compact"
									variant="outlined"
									:rules="[v => !!v || __('Posting Date is required')]"
									:bg-color="isDarkTheme ? '#1E1E1E' : 'white'"
								></v-text-field>
							</v-col>
						</v-row>

						<!-- Items Section -->
						<v-divider class="my-4"></v-divider>
						<v-row>
							<v-col cols="12">
								<h3 class="text-h6 mb-3">{{ __("Items") }}</h3>
							</v-col>
						</v-row>

						<!-- Add Item Row -->
						<v-row align="center" class="mb-2">
							<v-col cols="12" md="4">
								<v-autocomplete
									v-model="newItem.item_code"
									:items="items"
									item-title="item_name"
									item-value="item_code"
									:label="__('Item')"
									density="compact"
									variant="outlined"
									:bg-color="isDarkTheme ? '#1E1E1E' : 'white'"
									@update:model-value="onItemSelect"
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
									v-model.number="newItem.qty"
									:label="__('Quantity')"
									type="number"
									density="compact"
									variant="outlined"
									:bg-color="isDarkTheme ? '#1E1E1E' : 'white'"
								></v-text-field>
							</v-col>

							<v-col cols="12" md="3">
								<v-text-field
									v-model.number="newItem.rate"
									:label="__('Rate')"
									type="number"
									density="compact"
									variant="outlined"
									:bg-color="isDarkTheme ? '#1E1E1E' : 'white'"
								></v-text-field>
							</v-col>

							<v-col cols="12" md="3">
								<v-btn color="primary" @click="addItem" block>
									<v-icon>mdi-plus</v-icon>
									{{ __("Add") }}
								</v-btn>
							</v-col>
						</v-row>

						<!-- Items Table -->
						<v-row>
							<v-col cols="12">
								<v-data-table
									:headers="itemHeaders"
									:items="invoice.items"
									class="elevation-1"
									density="compact"
								>
									<template v-slot:item.amount="{ item }">
										{{ (item.raw ? item.raw.qty * item.raw.rate : item.qty * item.rate).toFixed(2) }}
									</template>
									<template v-slot:item.actions="{ item, index }">
										<v-btn
											icon="mdi-delete"
											size="small"
											color="error"
											variant="text"
											@click="removeItem(index)"
										></v-btn>
									</template>
								</v-data-table>
							</v-col>
						</v-row>

						<!-- Remarks -->
						<v-row class="mt-3">
							<v-col cols="12">
								<v-textarea
									v-model="invoice.remarks"
									:label="__('Remarks')"
									density="compact"
									variant="outlined"
									rows="2"
									:bg-color="isDarkTheme ? '#1E1E1E' : 'white'"
								></v-textarea>
							</v-col>
						</v-row>

						<!-- Action Buttons -->
						<v-row class="mt-3">
							<v-col cols="12" class="d-flex justify-end">
								<v-btn
									color="grey"
									class="mr-2"
									@click="resetForm"
								>
									{{ __("Clear") }}
								</v-btn>
								<v-btn
									color="primary"
									:loading="submitting"
									@click="submitInvoice"
								>
									{{ __("Submit") }}
								</v-btn>
							</v-col>
						</v-row>
					</v-form>
				</v-card>
			</v-col>
		</v-row>

		<!-- Snackbar for notifications -->
		<v-snackbar v-model="snack" :timeout="snackTimeout" :color="snackColor" location="top right">
			{{ snackText }}
			<template v-slot:actions>
				<v-btn color="white" variant="text" @click="snack = false">{{ __("Close") }}</v-btn>
			</template>
		</v-snackbar>
	</div>
</template>

<script>
/* global frappe, __ */
export default {
	name: "MiniPurchaseInvoice",
	data() {
		return {
			invoice: {
				supplier: "",
				company: "",
				posting_date: new Date().toISOString().substring(0, 10),
				items: [],
				remarks: "",
			},
			newItem: {
				item_code: "",
				qty: 1,
				rate: 0,
			},
			suppliers: [],
			companies: [],
			items: [],
			submitting: false,
			snack: false,
			snackText: "",
			snackColor: "success",
			snackTimeout: 3000,
			itemHeaders: [
				{ title: "Item Code", key: "item_code", sortable: false },
				{ title: "Item Name", key: "item_name", sortable: false },
				{ title: "Quantity", key: "qty", sortable: false },
				{ title: "Rate", key: "rate", sortable: false },
				{ title: "Amount", key: "amount", sortable: false },
				{ title: "Actions", key: "actions", sortable: false, align: "center" },
			],
		};
	},
	computed: {
		isDarkTheme() {
			const themeMode = this.$theme?.theme?.value ?? "light";
			return themeMode === "dark";
		},
	},
	mounted() {
		this.__ = (typeof __ !== 'undefined') ? __ : (s) => s;
		this.itemHeaders[0].title = this.__("Item Code");
		this.itemHeaders[1].title = this.__("Item Name");
		this.itemHeaders[2].title = this.__("Quantity");
		this.itemHeaders[3].title = this.__("Rate");
		this.itemHeaders[4].title = this.__("Amount");
		this.itemHeaders[5].title = this.__("Actions");
        
		this.loadInitialData();
	},
	methods: {
		async loadInitialData() {
			try {
				const suppliersResponse = await frappe.call({
					method: "frappe.client.get_list",
					args: {
						doctype: "Supplier",
						fields: ["name"],
						limit_page_length: 500,
					},
				});
				this.suppliers = suppliersResponse.message || [];

				const companiesResponse = await frappe.call({
					method: "frappe.client.get_list",
					args: {
						doctype: "Company",
						fields: ["name"],
						limit_page_length: 100,
					},
				});
				this.companies = companiesResponse.message || [];

				if (frappe.boot && frappe.boot.sysdefaults && frappe.boot.sysdefaults.company) {
					this.invoice.company = frappe.boot.sysdefaults.company;
				}

				const itemsResponse = await frappe.call({
					method: "frappe.client.get_list",
					args: {
						doctype: "Item",
						fields: ["item_code", "item_name", "stock_uom", "standard_rate", "valuation_rate"],
						filters: { disabled: 0 },
						limit_page_length: 1000,
					},
				});
				this.items = itemsResponse.message || [];
			} catch (error) {
				console.error("Error loading initial data:", error);
				this.showMessage("Failed to load initial data", "error");
			}
		},
		onItemSelect(itemCode) {
			if (itemCode) {
				const selectedItem = this.items.find((item) => item.item_code === itemCode);
				if (selectedItem) {
					this.newItem.rate = selectedItem.standard_rate || selectedItem.valuation_rate || 0;
				}
			}
		},
		addItem() {
			if (!this.newItem.item_code) {
				this.showMessage("Please select an item", "warning");
				return;
			}
			if (!this.newItem.qty || this.newItem.qty <= 0) {
				this.showMessage("Please enter a valid quantity", "warning");
				return;
			}
			if (this.newItem.rate < 0) {
				this.showMessage("Rate must be positive", "warning");
				return;
			}

			const selectedItem = this.items.find((item) => item.item_code === this.newItem.item_code);
			if (!selectedItem) {
				this.showMessage("Invalid item selected", "error");
				return;
			}

			this.invoice.items.push({
				item_code: this.newItem.item_code,
				item_name: selectedItem.item_name,
				qty: this.newItem.qty,
				rate: this.newItem.rate,
				uom: selectedItem.stock_uom,
			});

			this.newItem = {
				item_code: "",
				qty: 1,
				rate: 0,
			};
		},
		removeItem(index) {
			this.invoice.items.splice(index, 1);
		},
		async submitInvoice() {
			const formValid = await this.$refs.invoiceForm.validate();
			if (!formValid.valid) {
				this.showMessage("Please fill all required fields", "error");
				return;
			}

			if (this.invoice.items.length === 0) {
				this.showMessage("Please add at least one item", "warning");
				return;
			}

			this.submitting = true;
			try {
				const response = await frappe.call({
					method: "frappe.client.insert",
					args: {
						doc: {
							doctype: "Purchase Invoice",
							supplier: this.invoice.supplier,
							company: this.invoice.company,
							posting_date: this.invoice.posting_date,
							items: this.invoice.items.map(item => ({
								item_code: item.item_code,
								qty: item.qty,
								rate: item.rate,
							})),
							remarks: this.invoice.remarks,
						},
					},
				});

				if (response.message && response.message.name) {
					this.showMessage(`Purchase Invoice ${response.message.name} created successfully`, "success");
					this.resetForm();
				} else {
					this.showMessage("Failed to create Purchase Invoice", "error");
				}
			} catch (error) {
				console.error("Error creating purchase invoice:", error);
				this.showMessage(error.message || "Failed to create Purchase Invoice", "error");
			} finally {
				this.submitting = false;
			}
		},
		resetForm() {
			this.invoice = {
				supplier: "",
				company: frappe.boot?.sysdefaults?.company || "",
				posting_date: new Date().toISOString().substring(0, 10),
				items: [],
				remarks: "",
			};
			this.newItem = {
				item_code: "",
				qty: 1,
				rate: 0,
			};
			if (this.$refs.invoiceForm) {
				this.$refs.invoiceForm.resetValidation();
			}
		},
		showMessage(text, color = "success") {
			this.snackText = text;
			this.snackColor = color;
			this.snack = true;
		},
	},
};
</script>

<style scoped>
.main {
	border-radius: 8px;
}
</style>
