<template>
    <div class="db-editor-wrapper">
        <div class="filter-buttons-wrapper">
            <div class="db-closed-wrapper toolbar-button-wrapper" v-if="!treeModel">
                <Button label="Back to Home" class="p-button-text" icon="pi pi-arrow-left" @click="onBackToHomeClicked" />
                <Button label="Open DB file" @click="onOpenDBFileClicked" v-if="!treeModel" />

                <input type="text" class="hidden" id="db-file" @change="onDbFileInputChanged" />
            </div>
            <div class="db-opened-wrapper toolbar-button-wrapper" v-else>
                <Button label="Close" class="p-button-outlined close-db-file" @click="onCloseDBFileClicked" />
                <SplitButton label="Save" :model="saveItems" class="p-button-outlined save-db-file" @click="onSaveFileClicked" />
                <div class="db-filename">
                    <div class="filename-text">{{currentlyOpenedFilename}}
                        <span v-if="fileHasChanged">*</span>
                    </div>
                </div>
            </div>            
        </div>
        <div class="db-editor-home-wrapper" v-if="treeModel">
            <Tree :value="treeModel" selectionMode="single" v-model:selectionKeys="selectedTableKey" scrollHeight="flex"
                @nodeSelect="onTableSelect" :filter="true" filterMode="lenient"></Tree>
            <div class="db-table-wrapper">
                <DBEditorDataTable :rows="dbRowsToDisplay" v-if="dbModel" :tableModel="dbModel" :totalRecords="totalRecords" 
                    :isLoading="tableIsLoading" :selectedTableName="selectedTableName" :schema="currentSchema"
                    @page="onPage($event)" @sort="onPage($event)" @filter="onPage($event)"
                    @export="onExport($event)" @import="onImport($event)" 
                    @cellChange="onCellChange($event)" @invalidChange="onInvalidChange($event)" />
            </div>
        </div>

        <RecentFilesList v-else :recentFiles="recentFiles" :headerText="'Recently opened DB items'" 
            @recentFileClicked="onRecentFileClicked" @recentFileRemoved="onRecentFileRemoved" />

        <ConfirmDialog></ConfirmDialog>

        <Toast position="bottom-right" />
    </div>
</template>

<script>
import Tree from 'primevue/tree';
import Toast from 'primevue/toast';
import Button from 'primevue/button';
import SplitButton from 'primevue/splitbutton';
import ConfirmDialog from 'primevue/confirmdialog';

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
                this.selectedTableKey = {
                    [this.treeModel[0].key]: true
                };

                this.onTableSelect(this.treeModel[0]);
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
                this.currentSchema = res.result.schema;
                this.dbModel = res.result.filteredRecords;
                this.totalRecords = res.result.totalRecords;
                this.selectedTableName = this.selectedTable.label;
                this.dbModelIndexMapping = res.result.indexMapping;
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
                    summary: 'Could not import the table', 
                    detail: 'The table could not be imported. Please try again later.',
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

                this.fileHasChanged = true;
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

            }
            
            console.log(res);
        });

        messageUI.on('db:save-file', (_, res) => {
            if (!res._success) {
                this.$toast.add({
                    severity: 'error', 
                    summary: 'Could not save the file', 
                    detail: 'The file could not be saved. Please try again later.',
                    life: 4000
                });
            }
            else {
                this.$toast.add({
                    severity: 'success', 
                    summary: 'File saved successfully', 
                    detail: 'The file was saved successfully.',
                    life: 4000
                });

                this.fileHasChanged = false;
            }
        });

        messageUI.send('db:get-recent-files');

        window.addEventListener('keydown', this.keydownListener);
    },
    components: {
        Tree,
        Toast,
        Button,
        SplitButton,
        ConfirmDialog,
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
            saveItems: [
                {
                    label: 'Save',
                    command: () => {
                        this.onSaveFileClicked();
                    }
                },
                {
                    label: 'Save as...',
                    command: () => {
                        this.onSaveAsClicked()
                    }
                }
            ],
            changes: [],
            redoStack: [],
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
            fileHasChanged: false,
            selectedTableKey: null,
            selectedTableName: null,
            dbModelIndexMapping: null,
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
                    filters: [{ name: 'Any', extensions: ['*'] }]
                }).resolve().value();
            }).then((result) => {
                if (!result.cancelled && result.filePaths) {
                    this.onDBFileSelected(result.filePaths[0]);
                }
            }).catch((err) => {
                console.log(err);
            })
        },

        onDbFileInputChanged(event) {
            this.onDBFileSelected(event.target.value);
        },

        onCloseDBFileClicked() {
            if (this.fileHasChanged) {
                this.$confirm.require({
                    message: 'Are you sure you want to close with unsaved changes? The changes will be lost.',
                    header: 'Close without saving?',
                    icon: 'pi pi-exclamation-triangle',
                    accept: () => {
                        closeFile.bind(this)();
                    },
                    reject: () => {

                    }
                });
            }
            else {
                closeFile.bind(this)();
            }

            function closeFile() {
                messageUI.send('db:get-recent-files');
                this.changes = [];
                this.dbModel = null;
                this.treeModel = null;
                this.$toast.removeAllGroups();
            };
        },

        onDBFileSelected(path) {
            this.fileHasChanged = false;
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
            console.log(this.selectedTableKey);
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
                            exportLocation: result.filePath,
                            openFile: true
                        }
                    });
                }
            }).catch((err) => {
                console.log(err);
            });
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
            });
        },

        onCellChange(event) {
            this.fileHasChanged = true;

            const changeData = {
                tableName: this.selectedTableName,
                row: this.dbModelIndexMapping[event.row],
                field: event.field,
                value: event.newValue,
                oldValue: event.oldValue
            };

            this.changes.push(changeData)
            messageUI.send('db:update-value', changeData);

            this.$toast.removeAllGroups();
        },

        onCellUndoRedo(event) {
            this.fileHasChanged = true;
            messageUI.send('db:update-value', event);
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
        },

        onSaveFileClicked() {
            messageUI.send('db:save-file');
        },

        onSaveAsClicked() {
            asyncNode.require('deskgap').then(function(deskgap) {
                return deskgap.prop('dialog').invoke('showSaveDialogAsync', asyncNode.getCurrentWindow(), {
                    title: 'Select save location',
                    filters: [{ name: 'DB', extensions: ['db'] }, { name: 'Any', extensions: ['*'] }]
                }).resolve().value();
            }).then((result) => {
                if (!result.cancelled && result.filePath) {
                    messageUI.send('db:save-file', {
                        path: result.filePath
                    });
                }
            }).catch((err) => {
                console.log(err);
            });
        },

        updateModelUndoRedo(event) {
            console.log(event);
            console.log(this.dbModelIndexMapping);

            // determine if the row is currently displayed
            const dbModelRow = Object.keys(this.dbModelIndexMapping).find((mappingKey) => {
                return this.dbModelIndexMapping[mappingKey] === event.row;
            });

            if (dbModelRow) {
                // if the row is currently visible
                this.dbModel[dbModelRow][event.field] = event.value;
            }
        },

        keydownListener(evt) {
            if (this.dbModel) {
                if (isSaveCombo() && this.fileHasChanged) {
                    this.onSaveFileClicked();
                }
                else if (isUndoCombo() && this.changes.length > 0) {
                    const lastChangeEvent = this.changes.pop();

                    const newEvent = {
                        tableName: lastChangeEvent.tableName,
                        row: lastChangeEvent.row,
                        field: lastChangeEvent.field,
                        value: lastChangeEvent.oldValue
                    };

                    this.onCellUndoRedo(newEvent);
                    this.updateModelUndoRedo(newEvent);

                    this.redoStack.push(lastChangeEvent);
                }
                else if (isRedoCombo() && this.redoStack.length > 0) {
                    const redoEvent = this.redoStack.pop();

                    const newEvent = {
                        tableName: redoEvent.tableName,
                        row: redoEvent.row,
                        field: redoEvent.field,
                        value: redoEvent.value
                    };

                    this.onCellUndoRedo(newEvent);
                    this.updateModelUndoRedo(newEvent);

                    this.changes.push(redoEvent);
                }
            }

            function isSaveCombo() {
                return evt.ctrlKey && evt.key === 's';
            };

            function isUndoCombo() {
                return evt.ctrlKey && evt.key === 'z';
            };

            function isRedoCombo() {
                return evt.ctrlKey && evt.key === 'y';
            };
        }
    },
    unmounted() {
        messageUI.removeAllListeners('db:get-recent-files');
        messageUI.removeAllListeners('db:open-file');
        messageUI.removeAllListeners('db:get-records');
        messageUI.removeAllListeners('db:export-table');
        messageUI.removeAllListeners('db:import-table');
        messageUI.removeAllListeners('db:update-value');
        messageUI.removeAllListeners('db:save-file');

        window.removeEventListener('keydown', this.keydownListener);
    }
}
</script>

<style lang="scss" scoped>
    .db-editor-wrapper {
        margin: 10px;
    }

    .db-editor-home-wrapper {
        height: calc(100vh - 69px);
        display: grid;
        grid-template-columns: 157px calc(100% - 167px);
        gap: 10px;
    }

    .filter-buttons-wrapper {
        // display: flex;
        // justify-content: space-between;
        // align-items: center;
        margin-bottom: 10px;
        position: relative;
    }

    .db-opened-wrapper {
        display: flex;
        align-items: center;
        // margin-left: 15px;

        > button {
            + .p-splitbutton {
                margin-left: 15px;
            }
        }
    }

    .db-filename {
        // margin-left: 15px;
        position: absolute;
        top: 9px;
        left: 240px;
        right: 235px;
        text-align: center;
    }

    .p-tree {
        height: calc(-69px + 100vh);
        overflow: auto;
    }

    .p-splitter {
        height: 100%;
        border: none;
    }

    .toolbar-button-wrapper {
        > button {
            + button,
            + .p-splitbutton {
                margin-left: 10px;
            }
        } 
    }

    .filename-text {
        margin: 0 auto;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        span {
            margin-left: -2px;
        }
    }    
</style>
<style lang="scss">
    .p-button-outlined {
        button {
            background-color: transparent;
            color: #2196F3;
            border: 1px solid;

            &:enabled:hover {
                background: rgba(33, 150, 243, 0.04);
                color: #2196F3;
            }

            &:enabled:active {
                background: rgba(33, 150, 243, 0.16);
                color: #2196F3;
            }

            + .p-splitbutton-menubutton {
                border-left: none;
            }
        }
    }

    .db-editor-home-wrapper {
        .p-tree-toggler {
            display: none;
        }

        div.p-tree .p-tree-container .p-treenode .p-treenode-content {
            padding: 0.6rem;
            padding-left: 0;
        }
    }
</style>