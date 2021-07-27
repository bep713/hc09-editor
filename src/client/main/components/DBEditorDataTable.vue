<template>
    <div class="db-editor-data-table-wrapper">
        <DataTable class="p-datatable-sm" :value="tableModel" :loading="isLoading"  
            :scrollable="true" scrollHeight="flex" :resizableColumns="true" columnResizeMode="expand"
            stripedRows showGridlines removableSort sortField="index" :sortOrder="1" 
            :paginator="true" :rows="rows" :rowsPerPageOptions="[5,10,20,50]"
            v-model:filters="filters" filterDisplay="menu"
            :lazy="true" :totalRecords="totalRecords" ref="dt"
            editMode="cell" @cellEditComplete="onCellEditComplete" @cellEditCancel="onCellEditCancel" @cellEditInit="onCellEditInit"
            @page="onPage($event)" @sort="onSort($event)" @filter="onFilter($event)" >
            <template #header>
                <div class="header-wrapper">
                    <div class="data-table-header">{{selectedTableName}}</div>
                    <MultiSelect v-model="selectedColumns" :options="columns" optionLabel="field" :filter="true" class="column-select" />
                    <div class="right-content">
                        <Button label="Export" class="p-button-outlined" icon="pi pi-fw pi-download" @click="onExportClicked" />
                        <Button label="Import" class="p-button-outlined" icon="pi pi-fw pi-upload" @click="onImportClicked" />
                    </div>
                </div>
            </template>

            <Column v-for="col of selectedColumns" :field="col.field" :header="col.field" :key="col.field" :sortable="true" :dataType="col.type" style="min-width: 125px; min-height: 56px">
                <template #filter="{filterModel, filterCallback}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" placeholder="Search..."  @keydown.enter="filterCallback()" />
                </template>
                <template #editor="slotProps">
                    <InputText :modelValue="slotProps.data[slotProps.column.props.field]" @update:modelValue="onCellEdit($event, slotProps)" style="width: 100%; z-index: 101" 
                        :class="{ 'p-invalid': editorIsInvalid }" @blur="onBlur" />
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
        schema: Object,
        tableModel: Array,
        isLoading: Boolean,
        totalRecords: Number,
        selectedTableName: String,
    },

    data() {
        return {
            filters: null,
            editingRows: null,
            showUnderlay: false,
            selectedColumns: [],
            editingCellRows: {},
            editorIsInvalid: false,
        }; 
    },

    created() {
        this.setSelectedColumnsAndFilters();
    },

    methods: {
        onPage(event) {
            this.editingCellRows = {};
            this.$emit('page', event);
        },

        onSort(event) {
            this.editingCellRows = {};
            this.$emit('sort', event);
        },

        onFilter(event) {
            this.editingCellRows = {};
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

            const editingColumn = this.selectedColumns.find((col) => {
                return col.field === event.field;
            });

            let editingCellValue = this.editingCellRows[event.index][event.field];

            if (editingCellValue != this.tableModel[event.index][event.field]) {
                const newValue = {...this.editingCellRows[event.index]};
                let isChanged = false;
                let isInvalid = false;
     
                switch(editingColumn.type) {
                    case 'text':
                        if (editingCellValue.length <= this.schema[editingColumn.field]) {
                            this.tableModel[event.index] = newValue;

                            isChanged = true;
                            this.editorIsInvalid = false;
                        }
                        else {
                            isInvalid = true;
                            this.editingCellRows[event.index][event.field] = this.tableModel[event.index][event.field];
                        }

                        break;
                    case 'numeric':
                    default:
                        if (isNumeric(editingCellValue)) {
                            editingCellValue = parseInt(editingCellValue);

                            if (editingCellValue <= this.schema[editingColumn.field]) {
                                this.editingCellRows[event.index][event.field] = editingCellValue;
                                this.tableModel[event.index] = newValue;

                                isChanged = true;
                            }
                            else {
                                isInvalid = true;
                                this.editingCellRows[event.index][event.field] = this.tableModel[event.index][event.field];
                            }
                        }
                        else {
                            this.editingCellRows[event.index][event.field] = this.tableModel[event.index][event.field];
                        }
                        break;
                }

                if (isChanged) {
                    this.$emit('cell-change', {
                        'field': event.field,
                        'row': event.index,
                        'newValue': editingCellValue
                    });
                }
                else if (isInvalid) {
                    this.$emit('invalid-change', {
                        'field': event.field,
                        'value': editingCellValue,
                        'maxValue': this.schema[editingColumn.field],
                        'type': editingColumn.type
                    });
                }
            }
        },

        onCellEdit(newValue, props) {
            if (!this.editingCellRows[props.index]) {
                this.editingCellRows[props.index] = {...props.data};
            }

            this.editingCellRows[props.index][props.column.props.field] = newValue;
        },

        onCellEditInit(params) {
            this.showUnderlay = true;

            setTimeout(() => {
                const input = params.originalEvent.srcElement.querySelector('input');
                input.focus();
                input.select();
            }, 25);
        },

        onCellEditCancel() {
            
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
        },

        onBlur(e) {
            e.preventDefault();
            this.showUnderlay = false;
            document.dispatchEvent(new Event('click'));
        },
    },

    watch: {
        selectedTableName: function () {
            this.setSelectedColumnsAndFilters();
            this.editingCellRows = {};
        }
    }
}

function isNumeric(str) {
    if (typeof str != "string") return typeof str === 'number';
    return !isNaN(str) && 
            !isNaN(parseFloat(str))
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
        flex-basis: 65px;
    }

    .right-content {
        button {
            + button {
                margin-left: 10px;
            }
        }
    }

    .underlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
    }
</style>

<style lang="scss">
    .db-editor-data-table-wrapper {
        height: calc(100vh - 69px);

        .p-datatable.p-datatable-striped .p-datatable-tbody > tr:nth-child(even) td {
            background: #fcfcfc;
        }

        .p-datatable.p-datatable-gridlines .p-paginator-bottom {
            border-left: none;
            border-right: none;
        }

        .column-select {
            max-width: 40%;
        }
    }
</style>