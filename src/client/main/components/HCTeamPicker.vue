<template>
    <div class="team-picker-wrapper">
        <div class="team-logo-wrapper" v-bind:key="team.nickName" v-for="team in teams" @click="onTeamLogoClicked(team)">
            <img class="team-logo" :src="logos3d[`${team.nickName.toLowerCase()}.webp`]" :alt="team.nickName">
        </div>
    </div>
</template>

<script>
import importAll from '../../util/import-all';

export default {
    name: 'HCTeamPicker',
    props: {
        currentTeam: Object,
        teams: Array
    },
    data() {
        return {
            logos3d: importAll(require.context('../../img/team-logos-3d', false, /\.webp$/))
        }
    },
    methods: {
        onTeamLogoClicked(team) {
            this.$emit('team-picked', team);
        }
    }
}
</script>

<style lang="scss" scoped>
.team-picker-wrapper {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    max-width: 600px;
    justify-content: space-between;
}

.team-logo-wrapper {
    &:hover {
        background-color: darken(#fff, 5);
        cursor: pointer;
    }
}

.team-logo {
    width: 100px;
    height: 100px;
    margin: 20px;
}
</style>