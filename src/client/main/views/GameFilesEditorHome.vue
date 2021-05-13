<template>
    <div class="game-files-editor-wrapper">
        <div class="filter-buttons-wrapper">
            <Button label="Back to Home" class="p-button-text" icon="pi pi-arrow-left" @click="onBackToHomeClicked" />
            <Button label="Select HC09 root folder" @click="onSelectRootFolderClicked" />
            <Button label="Help" class="p-button-outlined" @click="onHelpClicked" />
        </div>
        <div class="file-viewer-wrapper">
            <Tree :value="treeModel" selectionMode="single" v-model:selectionKeys="selectedKey"
                @nodeSelect="onNodeSelect" @nodeExpand="onNodeExpand" :loading="isTreeViewerLoading"></Tree>

            <div class="data-table-wrapper" v-if="tableBaseModel">
                <div class="data-table-header">{{selectedNode.data.name}}</div>
                <DataTable class="p-datatable-sm" stripedRows removableSort dataKey="key"
                    :value="tableModel"  :scrollable="true" scrollHeight="flex"
                    :paginator="true" :rows="20" :rowsPerPageOptions="[10,20,50]"
                    v-model:filters="dataTableFilters" filterDisplay="row">
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
            </div>
        </div>
        <Dialog header="Game Files Editor Help" v-model:visible="showHelp" :modal="true">
            <div class="help-wrapper">
                <p>
                    To use this editor, you MUST have the game files on your PC somehow. The game file root folder will have a PS3_GAME and 
                    PS3_UPDATE folder inside of it. You want to select the folder containing these two.
                </p>
                <p>
                    Once you select a file, the table will populate with the main files in PS3_GAME: fe2ig, boot, interface, misc, and stream.
                    You can expand these to see all of the files nested in each of these main files, some of which will have children of their own.
                </p>
                <p>
                    The AST file format is like a zip file. It is one big file that contains many other files. Some AST files contain AST files themselves,
                    while others contain a mix. DB files are usually things that edit the game's details: team names, player ratings, etc.
                </p>
            </div>
        </Dialog>
        <Toast position="bottom-right" />
    </div>
</template>

<script>
import Tree from 'primevue/tree';
import Toast from 'primevue/toast';
import Button from 'primevue/button';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import { FilterMatchMode } from 'primevue/api';

const asyncNode = window.deskgap.asyncNode;
const messageUI = window.deskgap.messageUI;

export default {
    name: 'GameFilesEditorHome',
    components: {
        Tree,
        Toast,
        Button,
        Column,
        Dialog,
        DataTable,
        InputText,
        InputNumber
    },
    created() {
        messageUI.on('open-root-folder', (_, res) => {
            console.log(res);
            if (!res._success) {
                this.$toast.add({
                    severity: 'error', 
                    summary: 'Invalid folder', 
                    detail: 'The folder that you have selected is not a valid root HC09 folder. Please try again.', 
                    life: 4000
                });

                this.astModel = null;
            }
            else {
                this.$toast.removeAllGroups();
                this.astModel = res._rootFiles;
                this.treeModel = JSON.parse(JSON.stringify(res._rootFiles));
            }
        });

        messageUI.on('get-ast-child-nodes', (_, res) => {
            console.log(res);
            if (!res._success) {
                this.$toast.add({
                    severity: 'error', 
                    summary: 'AST Read Error', 
                    detail: 'There was an error reading the AST file. Please try again.', 
                    life: 4000
                });
            }
            else {
                this.$toast.removeAllGroups();

                this.astModel.find((rootFile) => {
                    return rootFile.key === res._node.key;
                }).children = res._node.children;

                const astChildren = filterASTChildrenRecursively(JSON.parse(JSON.stringify(res._node.children)));

                this.treeModel.find((rootFile) => {
                    return rootFile.key === res._node.key;
                }).children = astChildren;

                if (this.setTableBaseModelAfterLoad) {
                    this.onNodeSelect(this.selectedNode);
                    this.isDataViewerLoading = false;
                }
            }

            this.isTreeViewerLoading = false;

            function filterASTChildrenRecursively(nodes) {
                return nodes.filter((node) => {
                    if (node.data.type === 'AST') {
                        if (node.children) {
                            node.children = filterASTChildrenRecursively(node.children);
                        }

                        if (!node.children || node.children.length === 0) {
                            node.leaf = true;
                        }

                        return node;
                    }
                    else {
                        return null;
                    }
                });
            }
        });
    },
    computed: {
        tableModel() {
            return this.tableBaseModel.children.map((childNode) => {
                return {
                    'key': childNode.key,
                    'index': childNode.data.index,
                    'name': childNode.data.name,
                    'size': childNode.data.size,
                    'sizeUnformatted': childNode.data.sizeUnformatted,
                    'type': childNode.data.type,
                    'description': childNode.data.description,
                }
            });
        }
    },
    data() {
        return {
            astModel: [],
            treeModel: [],
            frozenRows: [],
            showHelp: false,
            expandedRows: [],
            selectedKey: null,
            selectedNode: null,
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
            tableBaseModel: null,
            rootFolderPath: null,
            expandedChildRows: [],
            isTreeViewerLoading: false,
            isDataViewerLoading: false,
            isFileViewerLoading: false,
            setTableBaseModelAfterLoad: false
        };
    },
    methods: {
        onSelectRootFolderClicked() {
            asyncNode.require('deskgap').then(function(deskgap) {
                return deskgap.prop('dialog').invoke('showOpenDialogAsync', asyncNode.getCurrentWindow(), {
                    title: 'Select HC09 root directory',
                    properties: ['openDirectory']
                }).resolve().value();
            }).then((result) => {
                if (!result.cancelled && result.filePaths) {
                    this.onFolderSelectedInDialog(result.filePaths[0]);
                }
            }).catch((err) => {
                console.log(err);
            })
        },

        onFolderSelectedInDialog(path) {
            messageUI.send('open-root-folder', path);
        },

        onHelpClicked() {
            this.showHelp = true;
        },

        onBackToHomeClicked() {
            this.$router.push('/');
        },

        onNodeExpand(node) {
            if (!node.children) {
                this.isTreeViewerLoading = true;
                messageUI.send('get-ast-child-nodes', node);
            }
        },
        
        onNodeSelect(node) {
            this.selectedNode = node;

            if (!node.children) {
                this.isTreeViewerLoading = true;
                this.isDataViewerLoading = true;
                this.setTableBaseModelAfterLoad = true;
                messageUI.send('get-ast-child-nodes', node);
            }
            else {
                const keyIsChild = node.key.indexOf('_') > -1;
    
                if (keyIsChild) {
                    const nodesToFind = node.key.split('_');
        
                    if (nodesToFind.length > 1) {
                        let workingNode = this.astModel.find((rootNode) => {
                            return rootNode.key == nodesToFind[0];
                        });
        
                        nodesToFind.slice(1).forEach((nodeKey) => {
                            workingNode = workingNode.children.find((childNode) => {
                                return childNode.key == `${workingNode.key}_${nodeKey}`;
                            });
                        });
        
                        this.tableBaseModel = workingNode;
                    }
                }
                else {
                    this.tableBaseModel = this.astModel.find((rootNode) => {
                        return rootNode.key === node.key;
                    })
                }
            }

        }
    },
    unmounted() {
        messageUI.removeAllListeners('open-file-path');
        messageUI.removeAllListeners('get-ast-child-nodes');
    }
}
</script>

<style lang="scss" scoped>
    .game-files-editor-wrapper {
        margin: 20px;
    }

    .filter-buttons-wrapper {
        margin-bottom: 30px;

        button {
            + button {
                margin-left: 15px;
            }
        }
    }

    .help-wrapper {
        max-width: 520px;
    }

    .file-viewer-wrapper {
        height: calc(100vh - 110px);
        display: flex;
    }

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

    .p-tree {
        overflow: auto;
        flex-basis: 27%;
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