<template>
    <div class="game-files-editor-wrapper">
        <div class="filter-buttons-wrapper">
            <Button label="Back to Home" class="p-button-text" icon="pi pi-arrow-left" @click="onBackToHomeClicked" />
            <Button label="Select HC09 root folder" @click="onSelectRootFolderClicked" />
            <Button label="Open single AST" class="p-button-outlined" @click="onOpenSingleASTClicked" />
            <Button label="Help" class="p-button-outlined" @click="onHelpClicked" />
        </div>
        <div class="file-viewer-wrapper" v-if="treeModel">
            <Splitter layout="horizontal">
                <SplitterPanel :size="25">
                    <Tree :value="treeModel" selectionMode="single" v-model:selectionKeys="selectedKey" :expandedKeys="expandedKeys"
                        @nodeSelect="onNodeSelect" @nodeExpand="onNodeExpand" :loading="isTreeViewerLoading"
                        :filter="true" filterMode="lenient"></Tree>
                </SplitterPanel>
                <SplitterPanel :size="75">
                    <GameFilesEditorDataTable v-if="tableBaseModel" :selectedFileName="selectedNode.data.name" :tableModel="tableModel" 
                        :isLoading="isDataViewerLoading" @export-node="onExportNode" @import-node="onImportNode" @open-node="onOpenNode"
                        @page="onDataTableChange" @filter="onDataTableChange" @sort="onDataTableChange" />
                </SplitterPanel>
            </Splitter>
        </div>

        <RecentFilesList v-else :recentFiles="recentFiles" @recentFileClicked="onRecentFileClicked" @recentFileRemoved="onRecentFileRemoved" />

        <Dialog header="Game Files Editor Help" v-model:visible="showHelp" :modal="true" :closeOnEscape="true" :dismissableMask="true">
            <div class="help-wrapper">
                <p>
                    To use this editor, you MUST have the game files on your PC somehow. The game root folder will have a PS3_GAME and 
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

        <ProgressDisplay :value="progressValue" :message="progressMessage" v-if="longRunningActionIsRunning" />

        <Toast position="bottom-right" />
    </div>
</template>

<script>
import Tree from 'primevue/tree';
import Toast from 'primevue/toast';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Splitter from 'primevue/splitter';
import SplitterPanel from 'primevue/splitterpanel';

import ProgressDisplay from '../components/ProgressDisplay';
import RecentFilesList from '../components/RecentFilesList';
import GameFilesEditorDataTable from '../components/GameFilesEditorDataTable';

const asyncNode = window.deskgap.asyncNode;
const messageUI = window.deskgap.messageUI;

const exportFileFilters = [
    { name: 'APT', extensions: ['apt'] },
    { name: 'AST', extensions: ['ast'] },
    { name: 'DAT', extensions: ['dat', '?'] },
    { name: 'DB', extensions: ['db'] },
    { name: 'DDS', extensions: ['dds'] },
    { name: 'EBO', extensions: ['ebo'] },
    { name: 'P3R', extensions: ['p3r'] },
    { name: 'PNG', extensions: ['png'] },
    { name: 'RSF', extensions: ['rsf'] },
    { name: 'SCHL', extensions: ['schl'] },
    { name: 'XML', extensions: ['xml'] },
    { name: 'Any', extensions: ['*'] }
];

export default {
    name: 'GameFilesEditorHome',
    components: {
        Tree,
        Toast,
        Button,
        Dialog,
        Splitter,
        SplitterPanel,
        ProgressDisplay,
        RecentFilesList,
        GameFilesEditorDataTable
    },
    created() {
        messageUI.on('open-root-folder', (_, res) => {
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

        messageUI.on('open-single-ast', (_, res) => {
            if (!res._success) {
                this.$toast.add({
                    severity: 'error', 
                    summary: 'Invalid AST file', 
                    detail: 'The file that you have selected is not a valid AST file. Please try again.', 
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

                const astModelRoot = this.astModel.find((rootFile) => {
                    return rootFile.key === res._node.key;
                });

                astModelRoot.children = res._node.children;

                const astChildren = filterASTChildrenRecursively(JSON.parse(JSON.stringify(res._node.children)));

                const treeModelRoot = this.treeModel.find((rootFile) => {
                    return rootFile.key === res._node.key;
                });

                // We have separate models because the tree model only displays ASTs - not other child files.
                treeModelRoot.children = astChildren;
                treeModelRoot.data.loaded = res._node.data.loaded;

                if (this.setTableBaseModelAfterLoad) {
                    const nodeToSelect = this.getChildNodeFromRoot(treeModelRoot, this.selectedNode.key);
                    this.onNodeSelect(nodeToSelect);
                    this.isDataViewerLoading = false;
                    this.setTableBaseModelAfterLoad = false;
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

        messageUI.on('export-ast-node', (_, res) => {
            this.isExporting = false;

            if (!res._success) {
                this.$toast.add({
                    severity: 'error', 
                    summary: 'Export Error', 
                    detail: 'There was an error exporting the selected file. Please try again.', 
                    life: 4000
                });
            }
            else {
                this.$toast.add({
                    severity: 'success', 
                    summary: 'Export Successful', 
                    detail: `The exported file "${res._filePath}" is now available.`, 
                    life: 4000
                });
            }
        });

        messageUI.on('import-ast-node', (_, res) => {
            this.isImporting = false;

            if (!res._success) {
                this.$toast.add({
                    severity: 'error', 
                    summary: 'Import Error', 
                    detail: 'There was an error importing the selected file. Please try again.', 
                    life: 4000
                });
            }
            else {
                this.$toast.add({
                    severity: 'success', 
                    summary: 'Import Successful', 
                    detail: `The selected file has been imported successfully.`, 
                    life: 4000
                });
                

            }
        });

        messageUI.on('set-progress-value', (_, res) => {
            this.progressValue = res.value;
            this.progressMessage = res.message;
        });

        messageUI.on('get-recent-files', (_, res) => {
            this.recentFiles = res.results;
        });

        messageUI.on('preview', (_, res) => {
            const keys = res.data.key.split('_');
            const rootNode = this.astModel.find((root) => {
                return root.key === keys[0];
            });

            const node = this.getChildNodeFromRoot(rootNode, res.data.key);
            node.data.previewLocation = res.data.preview;
        });

        messageUI.send('get-recent-files');
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
                    'isCompressed': childNode.data.isCompressed,
                    'previewLocation': childNode.data.previewLocation
                }
            });
        },

        longRunningActionIsRunning() {
            return this.isExporting || this.isImporting;
        }
    },
    data() {
        // astModel - contains everything: ASTs, DBs, etc. - complete hierarchy
        // treeModel - contains only AST hierarchy
        // tableBaseModel - contains only the selected AST & direct children

        return {
            astModel: [],
            treeModel: null,
            showHelp: false,
            recentFiles: [],
            expandedRows: [],
            expandedKeys: {},
            progressValue: 0,
            selectedKey: null,
            selectedNode: null,
            isImporting: false,
            isExporting: false,
            progressMessage: '',
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
        
        onOpenSingleASTClicked() {
            asyncNode.require('deskgap').then(function(deskgap) {
                return deskgap.prop('dialog').invoke('showOpenDialogAsync', asyncNode.getCurrentWindow(), {
                    title: 'Select AST file'
                }).resolve().value();
            }).then((result) => {
                if (!result.cancelled && result.filePaths) {
                    this.onFileSelectedInDialog(result.filePaths[0]);
                }
            }).catch((err) => {
                console.log(err);
            })
        },

        onFolderSelectedInDialog(path) {
            messageUI.send('open-root-folder', path);
        },

        onFileSelectedInDialog(path) {
            messageUI.send('open-single-ast', path);
        },

        onHelpClicked() {
            this.showHelp = true;
        },

        onBackToHomeClicked() {
            this.$router.push('/');
        },

        onNodeExpand(node) {
            if (!node.data || !node.data.loaded) {
                this.isTreeViewerLoading = true;

                let rootNode = node;
                const keyIsChild = node.key.indexOf('_') > -1;
        
                if (keyIsChild) {
                    const rootKey = node.key.split('_')[0];

                    rootNode = this.astModel.find((astNode) => {
                        return astNode.key === rootKey;
                    });
                }

                messageUI.send('get-ast-child-nodes', {
                    rootNode: rootNode,
                    nodeToLoad: node
                });
            }
        },
        
        onNodeSelect(node) {
            this.selectedNode = node;

            if (!node.data || !node.data.loaded) {
                this.isTreeViewerLoading = true;
                this.isDataViewerLoading = true;
                this.setTableBaseModelAfterLoad = true;

                let rootNode = node;
                const keyIsChild = node.key.indexOf('_') > -1;
        
                if (keyIsChild) {
                    const rootKey = node.key.split('_')[0];

                    rootNode = this.astModel.find((astNode) => {
                        return astNode.key === rootKey;
                    });
                }

                messageUI.send('get-ast-child-nodes', {
                    rootNode: rootNode,
                    nodeToLoad: node
                });
            }
            else {
                if (node.children) {
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
                else {
                    this.tableBaseModel = null;
                }
            }
        },

        onExportNode(options) {
            const selection = options.selection;

            let relevantFilters;

            if (options.convertOptions) {
                relevantFilters = exportFileFilters.filter((filter) => {
                    return filter.name === options.convertOptions.to;
                });
            }
            else {
                relevantFilters = exportFileFilters.filter((filter) => {
                    return filter.extensions.find((extension) => {
                        return selection.type.toLowerCase().indexOf(extension.toLowerCase()) > -1;
                    });
                });
            }

            asyncNode.require('deskgap').then(function(deskgap) {
                return deskgap.prop('dialog').invoke('showSaveDialogAsync', asyncNode.getCurrentWindow(), {
                    title: 'Select save location',
                    defaultPath: selection.name,
                    filters: relevantFilters.length > 0 ? relevantFilters : exportFileFilters
                }).resolve().value();
            }).then((result) => {
                if (!result.cancelled && result.filePath) {
                    const filePath = options.shouldDecompressFile ? result.filePath : `${result.filePath}.compressed`;
                    this.isExporting = true;

                    messageUI.send('export-ast-node', {
                        filePath: filePath,
                        node: selection,
                        shouldDecompressFile: options.shouldDecompressFile,
                        convertOptions: options.convertOptions
                    });
                }
            }).catch((err) => {
                console.log(err);
            })
        },

        onImportNode(options) {
            const selection = options.selection;

            let relevantFilters;

            if (options.convertOptions) {
                relevantFilters = exportFileFilters.filter((filter) => {
                    return filter.name === options.convertOptions.from
                });
            }
            else {
                relevantFilters = exportFileFilters.filter((filter) => {
                    return filter.extensions.find((extension) => {
                        return extension === '*' || 
                            selection.type.toLowerCase().indexOf(extension.toLowerCase()) > -1;
                    });
                });
            }

            asyncNode.require('deskgap').then(function(deskgap) {
                return deskgap.prop('dialog').invoke('showOpenDialogAsync', asyncNode.getCurrentWindow(), {
                    title: 'Select file to import',
                    filters: relevantFilters.length > 0 ? relevantFilters : exportFileFilters
                }).resolve().value();
            }).then((result) => {
                if (!result.cancelled && result.filePaths && result.filePaths.length > 0) {
                    this.isImporting = true;

                    messageUI.send('import-ast-node', {
                        filePath: result.filePaths[0],
                        node: selection,
                        convertOptions: options.convertOptions
                    });
                }
            }).catch((err) => {
                console.log(err);
            })
        },

        onDataTableChange(event) {

        },

        getChildNodeFromRoot(rootNode, keyToFind) {
            const keyIsChild = keyToFind.indexOf('_') > -1;
        
            if (keyIsChild) {
                const nodesToFind = keyToFind.split('_');
    
                if (nodesToFind.length > 1) {
                    let workingNode = rootNode;
    
                    nodesToFind.slice(1).forEach((nodeKey) => {
                        workingNode = workingNode.children.find((childNode) => {
                            return childNode.key == `${workingNode.key}_${nodeKey}`;
                        });
                    });
    
                    return workingNode;
                }
            }
            else {
                return rootNode;
            }
        },

        onRecentFileClicked(file) {            
            if (file.type === 'root') {
                this.onFolderSelectedInDialog(file.path);
            }
            else {
                this.onFileSelectedInDialog(file.path);
            }
        },

        onRecentFileRemoved(file) {
            messageUI.send('remove-recent-file', file);
        },

        onOpenNode(options) {
            const node = options.selection;
            const keys = node.key.split('_');
            const rootTreeNode = this.treeModel[keys[0]];
            const treeNode = this.getChildNodeFromRoot(rootTreeNode, node.key);

            console.log(this.selectedKey);
            console.log(treeNode);

            if (node.type === 'AST') {
                this.onNodeSelect(treeNode);

                console.log(this.expendedKeys);
                this.expandedKeys[rootTreeNode.key] = true;
                this.selectedKey = { [treeNode.key]: true };
            }
        }
    },
    unmounted() {
        messageUI.removeAllListeners('open-file-path');
        messageUI.removeAllListeners('get-ast-child-nodes');
        messageUI.removeAllListeners('export-ast-node');
        messageUI.removeAllListeners('import-ast-node');
        messageUI.removeAllListeners('open-single-ast');
        messageUI.removeAllListeners('set-progress-value');
        messageUI.removeAllListeners('get-recent-files');
        messageUI.removeAllListeners('preview');
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

<style lang="scss">
    .p-tree > .p-tree-container {
        height: calc(-40px + -0.5rem + 100%);
    }

    .p-dialog {
        max-width: 95%;
    }
</style>