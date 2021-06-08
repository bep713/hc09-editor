<template>
  <Button label="Back to Home" class="p-button-text" icon="pi pi-arrow-left" @click="onBackToHomeClicked" />
</template>

<script>
import Button from 'primevue/button';

export default {
    name: 'SettingsHome',
    components: {
        Button
    },
    methods: {
        onBackToHomeClicked() {
            this.$router.push('/');
        }
    }
}
</script>

<style lang="scss" scoped>

</style>