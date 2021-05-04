<template>
    <div class="editor-home-container">
        <h1>Editor Home</h1>
        <p>{{fileName}}</p>

        <Card>
            <template #header>
                <img class="team-logo" :src="currentTeamLogo" alt="Team logo">
            </template>
            <template #title>
                Change your team
            </template>
        </Card>

        <button class="btn-close" @click="onCloseFileClicked">Close File</button>
    </div>
</template>

<script>
import Card from 'primevue/card';
import importAll from '../../util/import-all';
import teamMapping from '../../data/team-mapping.json';

const asyncNode = window.deskgap.asyncNode;
const messageUI = window.deskgap.messageUI;

const logos3d = importAll(require.context('../../img/team-logos-3d', false, /\.webp$/));

export default {
    name: 'EditorHome',
    components: {
        Card
    },
    created() {
        messageUI.on('get-career-info', (_, info) => {
            this.currentTeam = teamMapping.find((team) => {
                return team.hc.TGID === info._teamId;
            });
        });
        messageUI.send('get-career-info');
    },
    computed: {
        fileName() {
            return this.filePath.split('\\').slice(-2, -1).pop();
        },
        currentTeamLogo() {
            return this.currentTeam ? logos3d[this.currentTeam.logo['3d']] : '';
        }
    },
    data() {
        return {
            filePath: '',
            currentTeam: null
        }
    },
    methods: {
        onCloseFileClicked: function () {
            this.$router.push('/')
        }
    }
}
</script>

<style>
.editor-home-container {
    padding: 20px;
}

.p-card {
    width: 18em;
}

.p-card-title {
    text-align: center;
}

.p-card div.p-card-content {
    padding: 0;
}

.btn-close {
    margin-top: 40px;
}

.p-card-header {
    display: flex;
    justify-content: center;
}

.p-card-header img {
    width: 100px;
}
</style>