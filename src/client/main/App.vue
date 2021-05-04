<template>
    <div class="app-container">
        <router-view></router-view>
    </div>
</template>

<script>
export default {
    name: 'App',
    components: {
        
    }
}
</script>

<style lang="scss">
@font-face {
    font-family: 'ea';
    src: url('../font/EASPORTS15.ttf');
}

* {
    box-sizing: border-box;
}

body {
    font-family: "Roboto", sans-serif;
    margin: 0;
}

h1, h2, h3, h4, h5, h6 {
    margin: 0;
}

.font-ea {
    font-family: 'ea';
}
</style>
