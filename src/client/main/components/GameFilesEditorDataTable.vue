<template>
    <div class="data-table-wrapper">
        <DataTable class="p-datatable-sm" stripedRows removableSort sortField="index" :sortOrder="1" dataKey="key"
            :value="tableModel"  :scrollable="true" scrollHeight="flex" :loading="isLoading"
            :paginator="true" :rows="20" :rowsPerPageOptions="[10,20,50]"
            v-model:filters="dataTableFilters" filterDisplay="row"
            contextMenu v-model:contextMenuSelection="selectedNode" @rowContextmenu="onRowContextMenu">
            <template #header>
                <div class="data-table-header">{{selectedFileName}}</div>
            </template>
            <Column field="name" header="Name" :sortable="true" sortField="index">
                <template #filter="{filterModel,filterCallback}">
                    <InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" 
                        placeholder="Search by name" />
                </template>
            </Column>
            <Column field="size" header="Size" :sortable="true" sortField="sizeUnformatted" 
                filterField="sizeUnformatted" :filterMatchModeOptions="numericMatchModes">
                <template #filter="{filterModel,filterCallback}">
                    <InputNumber v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" 
                        placeholder="Search by size" />
                </template>
            </Column>
            <Column field="type" header="Type" :sortable="true">
                <template #filter="{filterModel,filterCallback}">
                    <InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" 
                        placeholder="Search by type" />
                </template>
            </Column>
            <Column field="description" header="Description" :sortable="true">
                <template #filter="{filterModel,filterCallback}">
                    <InputText type="text" v-model="filterModel.value" @input="filterCallback()" class="p-column-filter" 
                        placeholder="Search by description" />
                </template>
            </Column>
        </DataTable>

        <ContextMenu :model="menuModel" ref="cm" />
    </div>
</template>

<script>
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import ContextMenu from 'primevue/contextmenu';
import { FilterMatchMode } from 'primevue/api';

export default {
    name: 'GameFilesEditorDataTable',
    components: {
        Column,
        DataTable,
        InputText,
        InputNumber,
        ContextMenu
    },
    props: {
        tableModel: Array,
        isLoading: Boolean,
        selectedFileName: String,
    },
    data() {
        return {
            dataTableFilters: {
                'name': {value: null, matchMode: FilterMatchMode.CONTAINS},
                'type': {value: null, matchMode: FilterMatchMode.CONTAINS},
                'sizeUnformatted': {value: null, matchMode: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO},
                'description': {value: null, matchMode: FilterMatchMode.CONTAINS},
            },
            numericMatchModes: [
                {label: '=', value: FilterMatchMode.EQUALS },
                {label: '!=', value: FilterMatchMode.NOT_EQUALS },
                {label: '<', value: FilterMatchMode.LESS_THAN },
                {label: '<=', value: FilterMatchMode.LESS_THAN_OR_EQUAL_TO },
                {label: '>', value: FilterMatchMode.GREATER_THAN },
                {label: '>=', value: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO }
            ],
            menuModel: [
                {label: 'Export', icon: 'pi pi-fw pi-download', command: () => this.exportSelection(this.selectedNode)},
                {label: 'Export Compressed', icon: 'pi pi-fw pi-download', command: () => this.exportSelectionCompressed(this.selectedNode)}
            ],
            selectedNode: null
        }
    },
    methods: {
        onRowContextMenu(event) {
            this.$refs.cm.show(event.originalEvent);
        },

        exportSelection(selection) {
            this.$emit('export-node', {
                selection: selection,
                shouldDecompressFile: true
            });
        },

        exportSelectionCompressed(selection) {
            this.$emit('export-node', {
                selection: selection,
                shouldDecompressFile: false
            });
        }
    }
}
</script>

<style lang="scss" scoped>
    .data-table-wrapper {
        flex-shrink: 3;
        margin-left: 20px;
        flex-grow: 2;
        display: flex;
        flex-direction: column;

        .p-datatable {
            overflow: auto;
        }
    }

    .data-table-header {
        margin-bottom: 10px;
        font-size: 18px;
        text-align: center;
    }
</style>

<style lang="scss">
    .p-datatable .p-datatable-tbody th .p-column-title {
        display: inherit;
    }
</style>