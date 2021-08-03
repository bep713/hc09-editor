<template>
    <div class="editor-home-container" :style="{ 'background-image': `url(${currentTeamBackground})` }" :data-current-team="currentTeam && currentTeam.nickName">
        <HCMenuItem class="fileName" :text="fileName" :backgroundColor="currentTeamBackgroundColor" :clickable="false" :focused="true" />

        <ul class="menu-wrapper">
            <HCMenuItem text="Change Team" :backgroundColor="currentTeamBackgroundColor" @click="onChangeTeamClicked" />
            <HCMenuItem text="Edit Coaches" :backgroundColor="currentTeamBackgroundColor" @click="onEditCoachesClicked" />
            <HCMenuItem text="Save Career" :backgroundColor="currentTeamBackgroundColor" @click="onSaveCareerClicked" />
            <HCMenuItem text="App Settings" :backgroundColor="currentTeamBackgroundColor" @click="onAppSettingsClicked" />
            <HCMenuItem text="Close File"  :backgroundColor="currentTeamBackgroundColor" @click="onCloseFileClicked" />
        </ul>

        <Dialog header="Pick a Team" :modal="true" :dismissableMask="true" v-model:visible="showTeamPickerModal">
            <HCTeamPicker :currentTeam="currentTeam" :teams="validTeams" @teamPicked="onTeamPicked" />
        </Dialog>

        <ConfirmDialog></ConfirmDialog>

        <Dialog :modal="true" :closable="false" v-model:visible="saving">
            <ProgressSpinner />
        </Dialog>

        <Dialog header="Edit coaches" :modal="true" :maximizable="true" v-model:visible="showCoachEditor">
            <CoachEditor :coachModel="coachModel" />
        </Dialog>

        <Dialog header="Edit settings" :modal="true" :maximizable="true" v-model:visible="showSettings">
            <SettingsView :settings="settingsModel" @change="onSettingsChanged" />
        </Dialog>

        <Toast position="bottom-right" />

        <Toast group="open-settings-view" position="bottom-right">
            <template #message="slotProps">
                <div class="toast-message">
                    <h4>{{slotProps.message.summary}}</h4>
                    <p>{{slotProps.message.detail}}</p>
                    <div class="action-buttons">
                        <Button class="" label="Go to app settings" @click="onAppSettingsClicked" />
                    </div>
                </div>
            </template>
        </Toast>
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
import CoachEditor from '../components/CoachEditor';
import SettingsView from '../components/SettingsView';
import HCTeamPicker from '../components/HCTeamPicker';

import importAll from '../../util/import-all';
import API from '../../../util/server-api-definition';
import MessageUIHelper from '../../util/message-ui-helper';

const asyncNode = window.deskgap.asyncNode;
const messageUI = window.deskgap.messageUI;

const messageUIHelper = new MessageUIHelper();

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
        CoachEditor,
        SettingsView,
        HCTeamPicker
    },

    created() {
        messageUIHelper.on(API.CAREER.GET_CAREER_INFO, (_, info) => {
            this.info = info;
            this.currentTeam = info._teamData.find((team) => {
                return team.TGID === info._teamId;
            });
        });

        messageUIHelper.on(API.CAREER.SAVE_CAREER_INFO, (_, status) => {
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

        messageUIHelper.on(API.COACH.GET_ALL_COACHES, (_, res) => {
            if (!res._success) {
                this.$toast.add({
                    severity: 'error',
                    summary: 'Read error',
                    detail: 'Could not read coaches from the career file. To retry, please close and re-open the file.',
                    life: 2000
                });
            }

            this.coachModel = res.results;
        });

        messageUIHelper.on(API.GENERAL.GET_SETTINGS, (_, res) => {
            if (!res._success) {
                console.error(res);
            }

            this.settingsModel = Object.keys(res.results).map((configKey) => {
                return {
                    attributeKey: configKey,
                    name: res.results[configKey].uiName,
                    type: res.results[configKey].uiType,
                    value: res.results[configKey].value,
                }
            });

            if (!res.results.gameRootFolder.value) {
                this.$toast.add({
                    severity: 'info',
                    group: 'open-settings-view',
                    summary: 'Could not find game root folder',
                    detail: 'If you\'d like to view portraits in this app, enter your game root folder in the app settings screen.'
                });
            }
        });

        messageUI.send(API.CAREER.GET_CAREER_INFO);
        messageUI.send(API.COACH.GET_ALL_COACHES);
        messageUI.send(API.GENERAL.GET_SETTINGS);
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
            coachModel: [],
            currentTeam: null,
            settingsModel: [],
            showSettings: false,
            showCoachEditor: false,
            hasUnsavedChanges: false,
            showTeamPickerModal: false
        }
    },

    methods: {
        onCloseFileClicked() {
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

        navigateToHome() {
            this.$router.push('/')
        },

        onChangeTeamClicked() {
            this.showTeamPickerModal = true;
        },

        onSaveCareerClicked() {
            messageUI.send(API.CAREER.SAVE_CAREER_INFO, this.info);
            this.saving = true;
        },

        onChangeTeamDialogClosed() {
            this.showTeamPickerModal = false;
        },

        onTeamPicked(team) {
            this.showTeamPickerModal = false;
            this.currentTeam = team;
            this.info._teamId = this.currentTeam.TGID;
            this.hasUnsavedChanges = true;
        },

        onEditCoachesClicked() {
            this.showCoachEditor = true;
        },
        
        onAppSettingsClicked() {
            this.$toast.removeGroup('open-settings-view');
            this.showSettings = true;
        },

        onSettingsChanged(data) {
            messageUI.send(API.GENERAL.SET_SETTING_VALUE, data);
        }
    },

    unmounted() {
        messageUIHelper.removeAll();
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