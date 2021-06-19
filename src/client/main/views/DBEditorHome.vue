<template>
    <div class="db-editor-wrapper">
        <div class="filter-buttons-wrapper">
            <Button label="Back to Home" class="p-button-text" icon="pi pi-arrow-left" @click="onBackToHomeClicked" />
            <Button label="Open DB file" @click="onOpenDBFileClicked" />
        </div>
        <div class="db-editor-data-table-wrapper" v-if="treeModel">
            <Splitter layout="horizontal">
                <SplitterPanel :size="20">
                    <Tree :value="treeModel" selectionMode="single" v-model:selectionKeys="selectedTableKey"
                        @nodeSelect="onTableSelect" :filter="true" filterMode="lenient"></Tree>
                </SplitterPanel>
                <SplitterPanel :size="80" style="overflow: auto;">
                    <DBEditorDataTable v-if="dbModel" :tableModel="dbModel" :totalRecords="totalRecords" 
                        :isLoading="tableIsLoading" :selectedTableName="selectedTable.label" 
                        @onPage="onPage($event)" />
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
            }
        });

        messageUI.on('db:get-records', (_, res) => {
            if (!res._success) {
                this.$toast.add({
                    severity: 'error', 
                    summary: 'Could not read table', 
                    detail: 'The table that you have selected could not be read. Please try another one.',
                    life: 4000
                });
            }
            else {
                console.log('response');
                if (res.result.totalRecords > 0) {
                    this.dbModel = res.result.filteredRecords;
                    this.totalRecords = res.result.totalRecords;
                }
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
    data() {
        return {
            dbModel: null,
            recentFiles: [],
            treeModel: null,
            totalRecords: 0,
            selectedTable: null,
            tableIsLoading: false,
            selectedTableKey: null,
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

        onDBFileSelected(path) {
            messageUI.send('db:open-file', path);
        },

        onRecentFileClicked(file) {
            messageUI.send('db:open-file', file.path);
        },

        onRecentFileRemoved(file) {
            messageUI.send('db:remove-recent-file', file);
        },

        onTableSelect(node) {
            this.selectedTable = node;
            this.getRecords(node.label);
        },

        onPage(event) {
            this.getRecords(this.selectedTable.label, {
                'recordCount': event.rows,
                'startIndex': event.first
            });
        },

        getRecords(tableName, options) {
            messageUI.send('db:get-records', {
                tableName: tableName,
                options: options
            });
        }
    },
    unmounted() {
        messageUI.removeAllListeners('db:get-recent-files');
        messageUI.removeAllListeners('db:open-file');
        messageUI.removeAllListeners('db:get-records');
    }
}
</script>

<style lang="scss" scoped>
    .db-editor-wrapper {
        margin: 20px;
    }

    .db-editor-data-table-wrapper {
        height: calc(100vh - 110px);
    }

    .p-tree {
        height: 100%;
        overflow: auto;
    }

    .p-splitter {
        height: 100%;
        border: none;
    }
</style>