<template>
    <div class="db-editor-wrapper">
        <div class="filter-buttons-wrapper">
            <Button label="Back to Home" class="p-button-text" icon="pi pi-arrow-left" @click="onBackToHomeClicked" />
            <Button label="Open DB file" @click="onOpenDBFileClicked" v-if="!treeModel" />
            <div class="db-opened-wrapper" v-else>
                <Button label="Close DB file" class="p-button-outlined" @click="onCloseDBFileClicked" />
                <div class="db-filename">{{currentlyOpenedFilename}}</div>
            </div>
        </div>
        <div class="db-editor-data-table-wrapper" v-if="treeModel">
            <Splitter layout="horizontal">
                <SplitterPanel :size="15"> 
                    <Tree :value="treeModel" selectionMode="single" v-model:selectionKeys="selectedTableKey" scrollHeight="flex"
                        @nodeSelect="onTableSelect" :filter="true" filterMode="lenient"></Tree>
                </SplitterPanel> 
                <SplitterPanel :size="85" style="overflow: auto;">
                    <div class="db-table-wrapper">
                        <DBEditorDataTable :rows="dbRowsToDisplay" v-if="dbModel" :tableModel="dbModel" :totalRecords="totalRecords" 
                            :isLoading="tableIsLoading" :selectedTableName="selectedTableName" :schema="currentSchema"
                            @page="onPage($event)" @sort="onPage($event)" @filter="onPage($event)"
                            @export="onExport($event)" @import="onImport($event)" @cellChange="onCellChange($event)" @invalidChange="onInvalidChange($event)" />
                    </div>
                </SplitterPanel>
            </Splitter>
        </div>

        <RecentFilesList v-else :recentFiles="recentFiles" :headerText="'Recently opened DB items'" 
            @recentFileClicked="onRecentFileClicked" @recentFileRemoved="onRecentFileRemoved" />

        <Toast position="bottom-right" />
    </div>
</template>

<script>
import Tree from 'primevue/tree';
import Toast from 'primevue/toast';
import Button from 'primevue/button';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';

import RecentFilesList from '../components/RecentFilesList';
import DBEditorDataTable from '../components/DBEditorDataTable.vue';

const asyncNode = window.deskgap.asyncNode;
const messageUI = window.deskgap.messageUI;

export default {
    name: 'DBEditorHome',
    created() {
        messageUI.on('db:get-recent-files', (_, res) => {
            this.recentFiles = res.results;
        });

        messageUI.on('db:open-file', (_, res) => {
            if (!res._success) {
                this.$toast.add({
                    severity: 'error', 
                    summary: 'Invalid DB file', 
                    detail: 'The file that you have selected is not a valid DB file. Please try again.',
                    life: 4000
                });

                this.dbModel = null;
                this.treeModel = null;
            }
            else {
                this.treeModel = res.tables.map((table, index) => {
                    return {
                        'key': index,
                        'label': table
                    }
                });

                this.dbModel = null;
            }
        });

        messageUI.on('db:get-records', (_, res) => {
            this.isReading = false;

            if (!res._success) {
                this.$toast.add({
                    severity: 'error', 
                    summary: 'Could not read table', 
                    detail: 'The table that you have selected could not be read. Please try another one.',
                    life: 4000
                });
            }
            else {
                this.dbModel = res.result.filteredRecords;
                this.totalRecords = res.result.totalRecords;
                this.currentSchema = res.result.schema;
                this.selectedTableName = this.selectedTable.label;
            }
        });

        messageUI.on('db:export-table', (_, res) => {
            this.isExporting = false;

            if (!res._success) {
                this.$toast.add({
                    severity: 'error', 
                    summary: 'Could not export the table', 
                    detail: 'The table could not be exported. Please try again later.',
                    life: 4000
                });
            }
            else {
                this.$toast.add({
                    severity: 'success', 
                    summary: 'Table exported successfully', 
                    detail: 'The table has been exported to ' + res.exportLocation + '.',
                    life: 4000
                });
            }
        });

        messageUI.on('db:import-table', (_, res) => {
            if (this.lastImportEvent) {
                this.isReading = true;
                this.onPage(this.lastImportEvent);
            }
            
            this.isImporting = false;

            if (!res._success) {
                this.$toast.add({
                    severity: 'error', 
                    summary: 'Could not export the table', 
                    detail: 'The table could not be exported. Please try again later.',
                    life: 4000
                });
            }
            else {
                this.$toast.add({
                    severity: 'success', 
                    summary: 'Table imported successfully', 
                    detail: 'The table has been imported and the data has been refreshed.',
                    life: 4000
                });


            }
        });

        messageUI.on('db:update-value', (_, res) => {
            if (!res._success) {
                this.$toast.add({
                    severity: 'error', 
                    summary: 'Could not update the field', 
                    detail: 'The field could not be updated. Please try again later.',
                    life: 4000
                });

                console.log(res);
            }
            else {
                console.log('field updated');
            }
        });

        messageUI.send('db:get-recent-files');
    },
    components: {
        Tree,
        Toast,
        Button,
        Splitter,
        SplitterPanel,
        RecentFilesList,
        DBEditorDataTable
    },
    computed: {
        tableIsLoading() {
            return this.isReading || this.isExporting || this.isImporting;
        }
    },
    data() {
        return {
            dbModel: null,
            recentFiles: [],
            treeModel: null,
            totalRecords: 0,
            isReading: false,
            isExporting: false,
            isImporting: false,
            selectedTable: null,
            currentSchema: null,
            dbRowsToDisplay: 10,
            lastImportEvent: null,
            selectedTableKey: null,
            selectedTableName: null,
            currentlyOpenedFilename: '',
        }
    },
    methods: {
        onBackToHomeClicked() {
            this.$router.push('/');
        },

        onOpenDBFileClicked() {
            asyncNode.require('deskgap').then(function(deskgap) {
                return deskgap.prop('dialog').invoke('showOpenDialogAsync', asyncNode.getCurrentWindow(), {
                    title: 'Select DB file',
                    filters: [{ name: 'DB', extensions: ['db'] }, { name: 'Any', extensions: ['*'] }]
                }).resolve().value();
            }).then((result) => {
                if (!result.cancelled && result.filePaths) {
                    this.onDBFileSelected(result.filePaths[0]);
                }
            }).catch((err) => {
                console.log(err);
            })
        },

        onCloseDBFileClicked() {
            this.treeModel = null;
        },

        onDBFileSelected(path) {
            this.currentlyOpenedFilename = path;
            messageUI.send('db:open-file', path);
        },

        onRecentFileClicked(file) {
            this.onDBFileSelected(file.path);
        },

        onRecentFileRemoved(file) {
            messageUI.send('db:remove-recent-file', file);
        },

        onTableSelect(node) {
            this.isReading = true;
            this.selectedTable = node;
            this.getRecords(node.label, {
                'recordCount': this.dbRowsToDisplay
            });
        },

        onPage(event) {
            this.isReading = true;
            this.dbRowsToDisplay = event.rows;

            let recordOptions = {
                'recordCount': event.rows,
                'startIndex': event.first
            };

            if (event.sortField && event.sortField !== 'index') {
                recordOptions.sort = {
                    'field': event.sortField,
                    'order': event.sortOrder === 1 ? 'asc' : 'desc'
                }
            }

            if (event.filters) {
                recordOptions.filter = {};
 
                Object.keys(event.filters).forEach((filterKey) => {
                    const filterOnTable = event.filters[filterKey];

                    const filterNotNull = filterOnTable.constraints.find((constraint) => {
                        return constraint.value !== null;
                    });

                    if (filterNotNull) {
                        recordOptions.filter[filterKey] = filterOnTable;
                    }
                });
            }

            this.getRecords(this.selectedTable.label, recordOptions);
        },

        getRecords(tableName, options) {
            messageUI.send('db:get-records', {
                tableName: tableName,
                options: options
            });
        },

        onExport() {
            asyncNode.require('deskgap').then(function(deskgap) {
                return deskgap.prop('dialog').invoke('showSaveDialogAsync', asyncNode.getCurrentWindow(), {
                    title: 'Select export save location',
                    filters: [{ name: 'CSV', extensions: ['csv'] }, { name: 'XLSX', extensions: ['xlsx'] }, { name: 'Any', extensions: ['*'] }]
                }).resolve().value();
            }).then((result) => {
                if (!result.cancelled && result.filePath) {
                    this.isExporting = true;

                    messageUI.send('db:export-table', {
                        tableName: this.selectedTableName,
                        options: {
                            exportLocation: result.filePath
                        }
                    });
                }
            }).catch((err) => {
                console.log(err);
            })
        },

        onImport(event) {
            asyncNode.require('deskgap').then(function(deskgap) {
                return deskgap.prop('dialog').invoke('showOpenDialogAsync', asyncNode.getCurrentWindow(), {
                    title: 'Select file to import',
                    filters: [{ name: 'CSV', extensions: ['csv'] }, { name: 'XLSX', extensions: ['xlsx'] }, { name: 'Any', extensions: ['*'] }]
                }).resolve().value();
            }).then((result) => {
                if (!result.cancelled && result.filePaths) {
                    this.isImporting = true;
                    this.lastImportEvent = event;

                    messageUI.send('db:import-table', {
                        tableName: this.selectedTableName,
                        options: {
                            importLocation: result.filePaths[0]
                        }
                    });
                }
            }).catch((err) => {
                console.log(err);
            })
        },

        onCellChange(event) {
            messageUI.send('db:update-value', {
                tableName: this.selectedTableName,
                row: event.row,
                field: event.field,
                value: event.newValue
            });

            this.$toast.removeAllGroups();
        },

        onInvalidChange(event) {
            let detail = `The cell's maximum value is ${event.maxValue}, you entered ${event.value}. The cell has been reverted to its previous value.`;

            if (event.type === 'text') {
                detail = `The cell's maximum length is ${event.maxValue} characters, you entered ${event.value.length} characters. The cell has been reverted to its previous value.`;
            }

            this.$toast.add({
                severity: 'error', 
                summary: 'Invalid value', 
                detail: detail,
                life: 5000
            });
        }
    },
    unmounted() {
        messageUI.removeAllListeners('db:get-recent-files');
        messageUI.removeAllListeners('db:open-file');
        messageUI.removeAllListeners('db:get-records');
        messageUI.removeAllListeners('db:export-table');
        messageUI.removeAllListeners('db:import-table');
        messageUI.removeAllListeners('db:update-value');
    }
}
</script>

<style lang="scss" scoped>
    .db-editor-wrapper {
        margin: 10px;
    }

    .db-editor-data-table-wrapper {
        height: calc(100vh - 74px);
    }

    .filter-buttons-wrapper {
        display: flex;
    }

    .db-opened-wrapper {
        display: flex;
        align-items: center;
        margin-left: 15px;
    }

    .db-filename {
        margin-left: 15px;
    }

    .p-tree {
        height: 100%;
        overflow: auto;
    }

    .p-splitter {
        height: 100%;
        border: none;
    }

    .db-table-wrapper {
        margin-left: 10px;
    }
</style>