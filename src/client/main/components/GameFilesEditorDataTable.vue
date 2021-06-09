<template>
    <div class="data-table-wrapper">
        <DataTable class="p-datatable-sm" stripedRows removableSort sortField="index" :sortOrder="1" dataKey="key"
            :value="tableModel" :scrollable="true" scrollHeight="flex" :loading="isLoading"
            :paginator="true" :rows="5" :rowsPerPageOptions="[5,10,20,50]"
            v-model:filters="dataTableFilters" filterDisplay="menu"
            contextMenu v-model:contextMenuSelection="selectedNode" @rowContextmenu="onRowContextMenu"
            :resizableColumns="true" columnResizeMode="fit">
            <template #header>
                <div class="data-table-header">{{selectedFileName}}</div>
            </template>
            <Column field="name" header="Name" :sortable="true" sortField="index">
                <template #filter="{filterModel}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" 
                        placeholder="Search by name" />
                </template>
            </Column>
            <Column field="size" header="Size" :sortable="true" sortField="sizeUnformatted" 
                filterField="sizeUnformatted" :filterMatchModeOptions="numericMatchModes">
                <template #filter="{filterModel}">
                    <InputNumber v-model="filterModel.value" class="p-column-filter" 
                        placeholder="Search by size" />
                </template>
            </Column>
            <Column field="type" header="Type" :sortable="true">
                <template #filter="{filterModel}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" 
                        placeholder="Search by type" />
                </template>
            </Column>
            <Column field="description" header="Description" :sortable="true">
                <template #filter="{filterModel}">
                    <InputText type="text" v-model="filterModel.value" class="p-column-filter" 
                        placeholder="Search by description" />
                </template>
            </Column>
            <Column header="Preview">
                <template #body="slotProps">
                    <img class="img-preview" :src="slotProps.data.previewLocation" alt="" @click="onPreviewClicked" />
                </template>
            </Column>
        </DataTable>

        <Dialog v-model:visible="showLargePreview" :modal="true" :closeOnEscape="true" :dismissableMask="true">
            <img class="large-img-preview" :src="selectedPreviewURI" alt="Could not load preview" />
        </Dialog>

        <ContextMenu :model="menuModel" ref="cm" />
    </div>
</template>

<script>
import Dialog from 'primevue/dialog';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import ContextMenu from 'primevue/contextmenu';
import { FilterMatchMode, FilterOperator } from 'primevue/api';

export default {
    name: 'GameFilesEditorDataTable',
    components: {
        Column,
        Dialog,
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
                'name': {operator: FilterOperator.AND, constraints: [{value: null, matchMode: FilterMatchMode.STARTS_WITH}]},
                'type': {operator: FilterOperator.AND, constraints: [{value: null, matchMode: FilterMatchMode.STARTS_WITH}]},
                'sizeUnformatted': {operator: FilterOperator.AND, constraints: [{value: null, matchMode: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO}]},
                'description': {operator: FilterOperator.AND, constraints: [{value: null, matchMode: FilterMatchMode.STARTS_WITH}]}
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
                { label: 'Open', icon: 'pi pi-folder-open', command: () => { this.openSelection(this.selectedNode) }, 
                    visible: () => { return this.selectedNode.type === 'AST'; }},
                { label: 'Import', icon: 'pi pi-fw pi-upload', command: () => this.importSelection(this.selectedNode) },
                { label: 'Import from DDS', icon: 'pi pi-fw pi-upload', command: () => { this.importSelection(this.selectedNode, { from: 'DDS', to: 'P3R' }); },
                    visible: () => { return this.selectedNode.type.indexOf('P3R') > -1; }},
                { separator: true },
                { label: 'Export', icon: 'pi pi-fw pi-download', command: () => this.exportSelection(this.selectedNode) },
                { label: 'Export Compressed', icon: 'pi pi-fw pi-download', 
                    command: () => this.exportSelectionCompressed(this.selectedNode), visible: () => { return this.selectedNode.isCompressed } },
                { label: 'Export as DDS', icon: 'pi pi-fw pi-download', command: () => { this.exportSelection(this.selectedNode, { from: 'P3R', to: 'DDS' }); },
                    visible: () => { return this.selectedNode.type.indexOf('P3R') > -1; }}
            ],
            selectedNode: null,
            showLargePreview: false
        }
    },
    methods: {
        onRowContextMenu(event) {
            this.$refs.cm.show(event.originalEvent);
        },

        importSelection(selection, convertOptions) {
            this.$emit('import-node', {
                selection: selection,
                convertOptions: convertOptions
            })
        },

        exportSelection(selection, convertOptions) {
            this.$emit('export-node', {
                selection: selection,
                shouldDecompressFile: true,
                convertOptions: convertOptions
            });
        },

        exportSelectionCompressed(selection) {
            this.$emit('export-node', {
                selection: selection,
                shouldDecompressFile: false
            });
        },

        openSelection(selection) {
            this.$emit('open-node', {
                selection: selection
            });
        },

        onPage(event) {
            this.$emit('page', event);
        },

        onSort(event) {
            this.$emit('sort', event);
        },

        onFilter(event) {
            this.$emit('filter', event);
        },

        onPreviewClicked(event) {
            this.showLargePreview = true;
            this.selectedPreviewURI = event.srcElement.src;
        }
    }
}
</script>

<style lang="scss" scoped>
    .data-table-wrapper {
        margin-left: 10px;
        height: 100%;
    }

    .data-table-header {
        margin-bottom: 5px;
        font-size: 18px;
        text-align: center;
    }

    .img-preview {
        max-height: 32px;
        max-width: 32px;
        cursor: zoom-in;

        @media(min-width: 1024px) {
            max-height: 64px;
            max-width: 95%;
        }
    }
</style>

<style lang="scss">
    .p-datatable .p-datatable-tbody th .p-column-title {
        display: inherit;
    }

    .p-datatable.p-datatable-striped .p-datatable-tbody > .p-highlight-contextmenu,
    .p-datatable.p-datatable-striped .p-datatable-tbody > .p-highlight-contextmenu:nth-child(2n) {
        background: darken(#fcfcfc, 5);
    }
</style>