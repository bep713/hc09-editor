<template>
    <div class="db-editor-data-table-wrapper">
        <DataTable class="p-datatable-sm" :value="tableModel" :loading="isLoading"  
            :scrollable="true" scrollHeight="flex" :resizableColumns="true" columnResizeMode="expand"
            stripedRows removableSort sortField="index" :sortOrder="1" 
            :paginator="true" :rows="rows" :rowsPerPageOptions="[5,10,20,50]"
            v-model:filters="filters" filterDisplay="menu"
            :lazy="true" :totalRecords="totalRecords" editMode="cell" ref="dt"
            @page="onPage($event)" @sort="onSort($event)" @filter="onFilter($event)" @cellEditComplete="onCellEditComplete">
            <template #header>
                <div class="header-wrapper">
                    <!-- <div class="left-content">
                        <div style="text-align:left">
                            <MultiSelect v-model="selectedColumns" :options="columns" optionLabel="header" :filter="true"
                                placeholder="Select Columns" style="width: 20em"/>
                        </div>
                    </div> -->
                    <div class="data-table-header">{{selectedTableName}}</div>
                    <div class="right-content">
                        <Button label="Export" class="p-button-outlined" icon="pi pi-fw pi-download" @click="onExportClicked" />
                        <Button label="Import" class="p-button-outlined" icon="pi pi-fw pi-upload" @click="onImportClicked" />
                    </div>
                </div>
            </template>

            <Column v-for="col of selectedColumns" :field="col.field" :header="col.field" :key="col.field" :sortable="true" :dataType="col.type" style="min-width: 125px;">
                <template #filter="{filterModel, filterCallback}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Search..."  @keydown.enter="filterCallback()" />
                </template>
                <template #editor="slotProps">
                    <InputText :modelValue="slotProps.data[slotProps.column.props.field]" @update:modelValue="onCellEdit($event, slotProps)" />
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<script>
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import { FilterMatchMode, FilterOperator } from 'primevue/api';

export default {
    name: 'DBEditorDataTable',

    components: {
        Button,
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
            selectedColumns: [],
            editingCellRows: {},
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
            
            if (this.columns) {
                this.filters = this.columns.reduce((accum, cur) => {
                    accum[cur.field] = { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }]};
                    return accum;
                }, {});
            }
            else {
                this.filters = null;
            }
        },

        onCellEditComplete(event) {
            if (!this.editingCellRows[event.index]) {
                return;
            } 

            const editingColumn = this.selectedColumns[event.index];
            const editingCellValue = this.editingCellRows[event.index][event.field];

            const newValue = {...this.editingCellRows[event.index]};
 
            switch(editingColumn.type) { 
                case 'text':
                    this.tableModel[event.index] = newValue;
                    break;
                case 'numeric':
                default:
                    if (isNumeric(editingCellValue)) {
                        this.editingCellRows[event.index][event.field] = editingCellValue;
                        this.tableModel[event.index] = {...this.editingCellRows[event.index]};
                    }
                    else
                        event.preventDefault();
                    break;
            }
        },

        onCellEdit(newValue, props) {
            console.log(newValue, props);

            if (!this.editingCellRows[props.index]) {
                this.editingCellRows[props.index] = {...props.data};
            }

            this.editingCellRows[props.index][props.column.props.field] = newValue;
        },

        onExportClicked() {
            this.$emit('export');
        },

        onImportClicked() {
            const dt = this.$refs.dt;

            this.$emit('import', {
                'first': dt.d_first,
                'filters': dt.d_filters,
                'rows': dt.d_rows,
                'sortField': dt.d_sortField,
                'sortOrder': dt.d_sortOrder
            });
        }
    },

    watch: {
        selectedTableName: function () {
            this.setSelectedColumnsAndFilters();
        }
    }
}

function isNumeric(str) {
  if (typeof str != "string") return false // we only process strings!  
  return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
         !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
};

</script>

<style lang="scss" scoped>
    .header-wrapper {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .data-table-header {
        font-size: 1.2em;
    }

    .right-content {
        button {
            + button {
                margin-left: 10px;
            }
        }
    }
</style>

<style lang="scss">
    .db-editor-data-table-wrapper {
        .p-tree-toggler {
            display: none;
        }

        div.p-tree .p-tree-container .p-treenode .p-treenode-content {
            padding: 0.6rem;
            padding-left: 0;
        }
    }
</style>