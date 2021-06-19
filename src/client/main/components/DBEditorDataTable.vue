<template>
    <div class="db-editor-data-table-wrapper">
        <!-- <DataTable class="p-datatable-sm" :value="tableModel" :loading="isLoading"
            :scrollable="true" scrollHeight="flex"
            stripedRows removableSort sortField="index" :sortOrder="1" dataKey="index"
            :paginator="true" :rows="10" :rowsPerPageOptions="[5,10,20,50]"
            v-model:filters="dataTableFilters" filterDisplay="menu"
            > -->
        <DataTable class="p-datatable-sm" :value="tableModel" :loading="isLoading"
            :scrollable="true" scrollHeight="flex"
            stripedRows removableSort sortField="index" :sortOrder="1" dataKey="index"
            :paginator="true" :rows="10" :rowsPerPageOptions="[5,10,20,50]"
            :lazy="true" :totalRecords="totalRecords" @page="onPage($event)">
            <template #header>
                <div class="data-table-header">{{selectedTableName}}</div>
                <div style="text-align:left">
                    <MultiSelect v-model="selectedColumns" :options="columns" optionLabel="header" :filter="true"
                        placeholder="Select Columns" style="width: 20em"/>
                </div>
            </template>

            <Column v-for="col of selectedColumns" :field="col.field" :header="col.field" :key="col.field" :sortable="true" style="min-width: 125px;">
                <template #filter="{filterModel}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Search"/>
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<script>
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import { FilterMatchMode, FilterOperator } from 'primevue/api';

export default {
    name: 'DBEditorDataTable',
    components: {
        Column,
        DataTable,
        InputText,
        MultiSelect
    },
    computed: {
        columns() {
            return Object.keys(this.tableModel[0]).map((field) => {
                return {
                    'field': field,
                    'header': field
                }
            })
        }
    },
    props: {
        tableModel: Array,
        isLoading: Boolean,
        totalRecords: Number,
        selectedTableName: String,
    },
    data() {
        return {
            selectedColumns: null
        }
    },
    methods: {
        onPage(event) {
            this.$emit('onPage', event);
        }
    },
    watch: {
        // tableModel: function () {
            // this.selectedColumns = [];
        // }
    }
}
</script>

<style lang="scss" scoped>
    
</style>