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

@font-face {
    font-family: 'HCHelvetica';
    src: url('../font/HCHelv.otf')
}

* {
    box-sizing: border-box;
}

body {
    font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
    margin: 0;
}

h1, h2, h3, h4, h5, h6 {
    margin: 0;
}

.font-ea {
    font-family: 'ea';
    font-weight: normal;
}
</style>
