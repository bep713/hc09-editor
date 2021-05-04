<template>
    <header class="home-header">
        <div class="hc-logo"></div>
        <h1 class="header font-ea">Editor v{{version}}</h1>
    </header>
</template>

<script>
export default {
    props: {
        version: String
    }
}
</script>

<style lang="scss" scoped>
.home-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 400px;
}

.hc-logo {
    background-image: url('../../img/hc09-logo.webp');
    background-size: contain;
    height: 169px;
    width: 315px;
}

.header {
    color: white;
}
</style>