<template>
    <div class="home-container">
        <div class="background-container">
            <div class="home-component-container">
                <HomeHeader :version="version"/>
                <div class="button-container">
                    <Button :label="buttonText" :class="{ 'p-disabled': isLoading }" :icon="isLoading ? 'pi pi-spinner pi-spin' : ''" @click="onLoadClicked"/>
                    <Button label="Edit Game Files" class="p-button-outlined" icon="pi pi-file" @click="onEditGameFilesClicked" />
                    <Button label="Open DB Editor" class="p-button-outlined" icon="pi pi-file" @click="onOpenDBEditorClicked" />

                    <input type="text" class="hidden" id="career-file" @change="onInputFileChanged" />
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import Button from 'primevue/button';
import HomeHeader from '../components/HomeHeader';

const asyncNode = window.deskgap.asyncNode;
const messageUI = window.deskgap.messageUI;

export default {
    components: {
        Button,
        HomeHeader
    },
    created() {
        messageUI.send('get-version');
        messageUI.on('get-version', (_, data) => {
            this.version = data;
        });

        messageUI.on('file-loaded', (_, data) => {
            this.isLoading = false;
            this.fileLoaded = true;
            this.$router.push('/editor/home');
        });
    },
    data() {
        return {
            version: '',
            isLoading: false,
            fileLoaded: false,
            buttonText: 'Load Career File'
        }
    },
    methods: {
        onLoadClicked: function () {
            asyncNode.require('deskgap').then(function(deskgap) {
                return deskgap.prop('dialog').invoke('showOpenDialogAsync', asyncNode.getCurrentWindow(), {
                    properties: ['openFile']
                }).resolve().value();
            }).then((result) => {
                if (!result.cancelled && result.filePaths) {
                    this.onFileSelectedInDialog(result.filePaths[0]);
                }
            }).catch((err) => {
                console.log(err);
            })
        },

        onInputFileChanged: function (event) {
            this.onFileSelectedInDialog(event.target.value)
        },

        onFileSelectedInDialog: function (path) {
            this.isLoading = true;
            this.buttonText = 'Loading Selected File';

            messageUI.send('open-file', path);
        },

        onEditGameFilesClicked: function () {
            this.$router.push('/game-files/home');
        },

        onEditSettingsClicked: function () {
            this.$router.push('/settings/home');
        },

        onOpenDBEditorClicked: function () {
            this.$router.push('/db-editor/home');
        }
    },
    unmounted() {
        messageUI.removeAllListeners('get-version');
        messageUI.removeAllListeners('file-loaded');
    }
}
</script>

<style lang="scss" scoped>
.home-container {
    height: 100vh;
    width: 100vw;
    background-color: lightgray;
}

.background-container {
    background-image: url('../../img/dungy-bg.webp');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: right center;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.home-component-container {
    width: 400px;
    display: flex;
    flex-direction: column;
}

.button-container {
    align-self: center;
    margin-top: 40px;
    display: flex;
    flex-direction: column;

    button {
        + button {
            margin-top: 15px;
        }
    }
}

.hidden {
    visibility: hidden;
}
</style>