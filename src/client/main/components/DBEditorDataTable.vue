<template>
    <div class="db-editor-data-table-wrapper">
        <DataTable class="p-datatable-sm" :value="tableModel" :loading="isLoading"
            :scrollable="true" scrollHeight="flex"
            stripedRows removableSort sortField="index" :sortOrder="1"
            :paginator="true" :rows="rows" :rowsPerPageOptions="[5,10,20,50]"
            v-model:filters="filters" filterDisplay="menu"
            :lazy="true" :totalRecords="totalRecords" @page="onPage($event)" @sort="onSort($event)" @filter="onFilter($event)" >
            <template #header>
                <div class="data-table-header">{{selectedTableName}}</div>
                <div style="text-align:left">
                    <MultiSelect v-model="selectedColumns" :options="columns" optionLabel="header" :filter="true"
                        placeholder="Select Columns" style="width: 20em"/>
                </div>
            </template>

            <Column v-for="col of selectedColumns" :field="col.field" :header="col.field" :key="col.field" :sortable="true" :dataType="col.type" style="min-width: 125px;">
                <template #filter="{filterModel, filterCallback}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Search..."  @keydown.enter="filterCallback()" />
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
            return this.tableModel && this.tableModel.length > 0 ? Object.keys(this.tableModel[0]).map((field) => {
                const value = this.tableModel[0][field];

                return {
                    'field': field,
                    'header': field,
                    'type': value !== null && (typeof value === 'string' || value instanceof String) ? 'text' : 'numeric'
                };
            }) : null;
        }
    },

    props: {
        rows: Number,
        tableModel: Array,
        isLoading: Boolean,
        totalRecords: Number,
        selectedTableName: String,
    },

    data() {
        return {
            filters: null,
            selectedColumns: []
        };
    },

    created() {
        this.setSelectedColumnsAndFilters();
    },

    methods: {
        onPage(event) {
            this.$emit('page', event);
        },

        onSort(event) {
            this.$emit('sort', event);
        },

        onFilter(event) {
            this.$emit('filter', event);
        },

        setSelectedColumnsAndFilters() {
            this.selectedColumns = this.columns;
            
            this.filters = this.columns.reduce((accum, cur) => {
                accum[cur.field] = { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }]};
                return accum;
            }, {});
        } 
    },

    watch: {
        selectedTableName: function () {
            this.setSelectedColumnsAndFilters();
        }
    }
}
</script>

<style lang="scss" scoped>
    
</style>