<template>
    <div class="game-files-editor-wrapper">
        <div class="filter-buttons-wrapper">
            <Button label="Select HC09 root folder" @click="onSelectRootFolderClicked" />
            <Button label="Help" class="p-button-outlined" @click="onHelpClicked" />
        </div>
        <div class="file-viewer-wrapper">
            <TreeTable :value="treeModel._rootFiles">
                <template #empty>
                    <p>Select the HC09 root folder above.</p>
                </template>
                <Column field="name" header="Name" :expander="true"></Column>
                <Column field="size" header="Size"></Column>
                <Column field="type" header="Type"></Column>
            </TreeTable>
        </div>
        <Dialog header="Game Files Editor Help" v-model:visible="showHelp">
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
import Toast from 'primevue/toast';
import Button from 'primevue/button';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import TreeTable from 'primevue/treetable';

import ASTEditorTree from '../classes/ASTEditorTree';

const asyncNode = window.deskgap.asyncNode;
const messageUI = window.deskgap.messageUI;

export default {
    name: 'GameFilesEditorHome',
    components: {
        Toast,
        Button,
        Column,
        Dialog,
        TreeTable
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

                this.treeModel.rootFiles = null;
            }
            else {
                this.$toast.removeAllGroups();
                this.treeModel.rootFiles = res._rootFiles;
                console.log(this.treeModel.rootFiles);
            }
        });
    },
    computed: {
        treeModelNodes() {
            return this.treeModel.treeViewMapping;
        }
    },
    data() {
        return {
            showHelp: false,
            treeModel: new ASTEditorTree(),
            rootFolderPath: null,
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
        }
    },
    unmounted() {
        messageUI.removeAllListeners('open-file-path');
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
</style>