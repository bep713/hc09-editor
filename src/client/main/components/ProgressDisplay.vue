<template>
    <Dialog :modal="true" :closable="false" :visible="true">
        <div class="progress-wrapper">
            <span class="progress-value" v-if="value">{{value}}%</span>
            <ProgressSpinner />
        </div>
    </Dialog>
</template>

<script>
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';

export default {
    name: 'ProgressDisplay',
    components: {
        Dialog,
        ProgressSpinner
    },
    props: {
        message: String,
        value: Number
    }
}
</script>

<style lang="scss" scoped>
    .progress-wrapper {
        height: 100px;
        position: relative;
    }

    .progress-value {
        position: absolute;
        display: flex;
        width: 100%;
        height: 100%;
        justify-content: center;
        align-items: center;
    }
</style>