<template>
    <div class="editor-home-container" :style="{ 'background-image': `url(${currentTeamBackground})` }">
        <HCMenuItem :text="fileName" :backgroundColor="currentTeamBackgroundColor" :clickable="false" :focused="true" />

        <ul class="menu-wrapper">
            <HCMenuItem text="Change Team" :backgroundColor="currentTeamBackgroundColor" @click="onChangeTeamClicked" />
            <HCMenuItem text="Save Career" :backgroundColor="currentTeamBackgroundColor" @click="onSaveCareerClicked" />
            <HCMenuItem text="Close File"  :backgroundColor="currentTeamBackgroundColor" @click="onCloseFileClicked" />
        </ul>

        <Dialog header="Pick a Team" :modal="true" :dismissableMask="true" v-model:visible="showTeamPickerModal">
            <HCTeamPicker :currentTeam="currentTeam" :teams="validTeams" @teamPicked="onTeamPicked" />
        </Dialog>

        <ConfirmDialog></ConfirmDialog>

        <Dialog :modal="true" :closable="false" v-model:visible="saving">
            <ProgressSpinner />
        </Dialog>

        <Toast position="bottom-right" />
    </div>
</template>

<script>
import Card from 'primevue/card';
import Toast from 'primevue/toast';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import ConfirmDialog from 'primevue/confirmdialog';
import ProgressSpinner from 'primevue/progressspinner';

import HCMenuItem from '../components/HCMenuItem';
import HCTeamPicker from '../components/HCTeamPicker';

import importAll from '../../util/import-all';

const asyncNode = window.deskgap.asyncNode;
const messageUI = window.deskgap.messageUI;

const loadingScreens = importAll(require.context('../../img/city-loading-screens', false, /\.webp$/));

export default {
    name: 'EditorHome',
    components: {
        Card,
        Toast,
        Button,
        Dialog,
        ConfirmDialog,
        ProgressSpinner,
        HCMenuItem,
        HCTeamPicker
    },
    created() {
        messageUI.on('get-career-info', (_, info) => {
            this.info = info;
            this.currentTeam = info._teamData.find((team) => {
                return team.TGID === info._teamId;
            });
        });

        messageUI.on('save-career-info', (_, status) => {
            this.saving = false;

            if (status._success) {
                this.hasUnsavedChanges = false;
                this.$toast.removeAllGroups();

                this.$toast.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Career file saved successfully.',
                    life: 2000
                });
            }
            else {
                console.log('Save error');
            }
        });

        messageUI.send('get-career-info');
    },
    computed: {
        fileName() {
            return this.info ? this.info._filePath.split('\\').slice(-2, -1).pop().substring(10) : '';
        },
        currentTeamBackground() {
            return this.currentTeam ? loadingScreens[`${this.currentTeam.nickName.toLowerCase()}.webp`] : '';
        },
        currentTeamBackgroundColor() {
            return this.currentTeam ? `rgb(
                    ${this.currentTeam.colors.r}, 
                    ${this.currentTeam.colors.g}, 
                    ${this.currentTeam.colors.b}
                )` : 'rgb(0,0,0)';
        },
        validTeams() {
            return this.info._teamData.filter((team) => {
                return team.TGID <= 32;
            });
        }
    },
    data() {
        return {
            info: null,
            saving: false,
            currentTeam: null,
            hasUnsavedChanges: false,
            showTeamPickerModal: false
        }
    },
    methods: {
        onCloseFileClicked: function () {
            if (this.hasUnsavedChanges) {
                this.$confirm.require({
                    message: 'Are you sure you want to close with unsaved changes? The changes will be lost.',
                    header: 'Close without saving?',
                    icon: 'pi pi-exclamation-triangle',
                    accept: () => {
                        this.navigateToHome();     
                    },
                    reject: () => {

                    }
                })
            }
            else {
                this.navigateToHome();
            }
        },
        navigateToHome: function () {
            this.$router.push('/')
        },
        onChangeTeamClicked: function () {
            this.showTeamPickerModal = true;
        },
        onSaveCareerClicked: function () {
            messageUI.send('save-career-info', this.info);
            this.saving = true;
        },
        onChangeTeamDialogClosed: function () {
            this.showTeamPickerModal = false;
        },
        onTeamPicked: function (team) {
            this.showTeamPickerModal = false;
            this.currentTeam = team;
            this.info._teamId = this.currentTeam.TGID;
            this.hasUnsavedChanges = true;
        }
    },
    unmounted() {
        messageUI.removeAllListeners('get-career-info');
        messageUI.removeAllListeners('save-career-info');
    }
}
</script>

<style lang="scss">
.editor-home-container {
    padding: 40px;
    height: 100vh;
    width: 100vw;
    background-size: cover;
    background-color: #333;
    animation: background-fade-in 0.5s;
}

div.p-dialog {
    background-color: #fff;
}

div.p-dialog .p-dialog-header {
    border-top-right-radius: 0;
    border-top-left-radius: 0;
    background-color: transparent;
}

.btn-close {
    margin-top: 40px;
}

.menu-wrapper {
    position: absolute;
    bottom: 50px;
    left: 60px;
    padding-left: 0;
    margin: 0;
}

@keyframes background-fade-in {
    from {opacity: 0.2;}
    to {opacity: 1;}
}
</style>