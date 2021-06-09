<template>
    <div class="recent-files-wrapper">
        <h2 class="recent-files-header">Recently opened items</h2>
        <div class="files-wrapper" v-if="recentFiles.length > 0">
            <div class="recent-file" v-for="recentFile in recentFiles" :key="recentFile.filePath" @click="onRecentFileClicked(recentFile)">
                <div class="recent-file-data">
                    <div class="path-name">
                        <i :class="{ 'pi-folder': recentFile.type === 'root', 'pi-file': recentFile.type === 'single', 'pi': true }"></i>
                        <div class="recent-file-path">{{recentFile.path}}</div>
                    </div>
                    <div class="recent-file-time">{{parseDate(recentFile.time)}}</div>
                </div>
                <Button icon="pi pi-times" class="p-button-text btn-remove-recent-file" @click.stop="onRemoveRecentFileClicked(recentFile)" />
            </div>
        </div>
        <div class="recent-files-empty" v-else>
            <p>You have not opened any recent files. They will appear here after you open them.</p>
        </div>
    </div>
</template>

<script>
import moment from 'moment';
import Button from 'primevue/button';

export default {
    name: 'RecentFilesList',
    components: {
        Button
    },
    props: {
        recentFiles: Array
    },
    methods: {
        parseDate(dateMilli) {
            if (!dateMilli) { return ''; }
            
            const date = new Date(dateMilli);
            return moment(date).format('MM/DD/YYYY hh:mm A');
        },

        onRecentFileClicked(file) {
            this.$emit('recent-file-clicked', file);
        },

        onRemoveRecentFileClicked(file) {
            const recentFileIndex = this.recentFiles.findIndex((rFile) => {
                return rFile.path === file.path;
            });

            this.recentFiles.splice(recentFileIndex, 1);

            this.$emit('recent-file-removed', file);
        }
    }
}
</script>

<style lang="scss" scoped>
    .recent-files-header {
        font-size: 18px;
        font-weight: normal;
    }

    .files-wrapper {
        margin-top: 15px;
    }

    .recent-file {
        background-color: #fbfbfb;
        padding: 10px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;

        &:hover {
            background-color: darken(#fbfbfb, 5);
        }

        &:active {
            background-color: darken(#fbfbfb, 10);
        }

        + .recent-file {
            margin-top: 10px;
        }
    }

    .path-name {
        display: flex;
        align-items: center;

        .recent-file-path {
            margin-left: 8px;
        }
    }
</style>