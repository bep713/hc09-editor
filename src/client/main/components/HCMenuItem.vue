<template>
    <li :class="{ 'focused': focused, 'clickable': clickable, 'menu-item-box': true }">
        <div class="menu-item--left" v-if="clickable"></div>
        <div class="menu-item--main-box-shadow"></div>
        <div class="menu-item" :style="{ '--bgColor': backgroundColor, '--topGradientColor': topGradientColor, 
            '--darkBackgroundColor': darkBackgroundColor, '--bottomGradientColor': bottomGradientColor,
            '--notSelectedTopGradientColor': notSelectedTopGradientColor, '--notSelectedBackgroundColor': notSelectedBackgroundColor,
            '--notSelectedBottomGradientColor': notSelectedBottomGradientColor, '--notSelectedBottomBackgroundColor': notSelectedBottomBackgroundColor }">
            <div class="menu-item--box-shadow-wrapper">
                <div class="menu-item--border"></div>
                <div class="menu-item--box-shadow"></div>
            </div>
            <div class="menu-item--content">
                <span class="menu-item--text">{{text}}</span>
            </div>
            <div class="menu-item--bottom-border"></div>
        </div>
    </li>
</template>

<script>
import pSBC from '../../util/lighten-darken';

export default {
    name: 'HCMenuItem',
    props: {
        text: String,
        backgroundColor: String,
        clickable: {
            type: Boolean,
            required: false,
            default: true
        },
        focused: {
            type: Boolean,
            required: false,
            default: false
        }
    },
    computed: {
        topGradientColor() {
            if (this.backgroundColor) {
                return pSBC(-0.5, this.backgroundColor);
            } else {
                return 'rgb(0,0,0)';
            }
        },
        darkBackgroundColor() {
            if (this.backgroundColor) {
                return pSBC(-0.3, this.backgroundColor);
            } else {
                return 'rgb(0,0,0)';
            }
        },
        bottomGradientColor() {
            if (this.backgroundColor) {
                return pSBC(-0.7, this.backgroundColor);
            } else {
                return 'rgb(0,0,0)';
            }
        },
        notSelectedTopGradientColor() {
            if (this.backgroundColor) {
                return pSBC(-0.7, this.backgroundColor);
            } else {
                return 'rgb(0,0,0)';
            }
        },
        notSelectedBackgroundColor() {
            if (this.backgroundColor) {
                return pSBC(-0.5, this.backgroundColor);
            } else {
                return 'rgb(0,0,0)';
            }
        },
        notSelectedBottomBackgroundColor() {
            if (this.backgroundColor) {
                return pSBC(-0.55, this.backgroundColor);
            } else {
                return 'rgb(0,0,0)';
            }
        },
        notSelectedBottomGradientColor() {
            if (this.backgroundColor) {
                return pSBC(-0.8, this.backgroundColor);
            } else {
                return 'rgb(0,0,0)';
            }
        }
    }
}
</script>

<style lang="scss">
$menu-item-height: 1.75em;
$menu-item-width: 14em;

.menu-item-box {
    height: $menu-item-height;
    width: $menu-item-width;
    display: flex;
    transition: height 0.2s ease-in-out;
    position: relative;

    &:hover,
    &.focused {
        height: 2.625em;
        width: 21em;

        .menu-item--left {
            transform: skew(-30deg) scale(1.5);
            margin-right: -12px;
        }

        .menu-item--main-box-shadow {
            transform: scale(1.5);
        }

        .menu-item {
            transform: scale(1.5);

            &:before {
                background: linear-gradient(0deg, var(--bottomGradientColor) 0%, var(--darkBackgroundColor) 100%);
            }
        }

        .menu-item--content {
            font-size: 22px;
            color: #E6E6E6;
        }

        .menu-item--box-shadow {
            &:before {
                background: linear-gradient(0deg, var(--bgColor) 0%, var(--topGradientColor) 100%);
            }
        }

        .menu-item--border {
            background: linear-gradient(90deg, rgba(0, 0, 0, 0) 50%, var(--bgColor) 85%);
        }
    }

    &.clickable {
        .menu-item {
            cursor: pointer;
        }
    }

    + .menu-item-box {
        margin-top: 4px;
    }
}

.menu-item--main-box-shadow {
    position: absolute;
    top: 0;
    left: 0;
    width: $menu-item-width;
    height: $menu-item-height;
    z-index: 0;
    transition: all .2s ease-in-out;
    transform-origin: left 0 0;

    &:before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 90%;
        height: 100%;
        transform-origin: 100% 27.5px 0;
        transform: skew(-30deg);
        box-shadow: 0 0 7px 1px rgba(0,0,0,0.5);
    }
}

.menu-item {
    padding-left: 20px;
    width: $menu-item-width;
    height: $menu-item-height;
    border-top-right-radius: 7px;
    position: relative;
    display: inline-block;
    overflow: hidden;
    color: #fff;
    display: flex;
    align-items: flex-end;
    transition: all .2s ease-in-out;
    transform-origin: left 0 0;
    z-index: 1;

    &:before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(0deg, var(--notSelectedBottomGradientColor) 0%, var(--notSelectedBottomBackgroundColor) 100%);
        transform-origin: 100% 27.5px 0;
        transform: skew(-30deg);
    }
}

.menu-item--left {
    width: 0.5em;
    height: $menu-item-height;
    background: linear-gradient(180deg, #292729 0%, #313431 50%, #1A1E1A 51%, #161416 100%);
    transform: skew(-30deg);
    transform-origin: left 0 0;
    transition: all .2s ease-in-out;
    margin-right: -10px;
    box-shadow: 0 0 5px 2px rgba(0,0,0,0.9);
}

.menu-item--content {
    font-size: 20px;
    text-transform: uppercase;
    font-weight: bold;
    z-index: 2;
    text-shadow: 2px 1px 3px black;
    font-family: 'HCHelvetica';
    color: #999;
}

.menu-item--box-shadow-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    height: 50%;
    width: 100%;
}

.menu-item--box-shadow {
    position: absolute;
    border-bottom-right-radius: 7px;
    z-index: 1;
    overflow: hidden;
    display: inline-block;
    height: 100%;
    width: 100%;

    &:before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgb(254,0,0);
        background: linear-gradient(0deg, var(--notSelectedBackgroundColor) 0%, var(--notSelectedTopGradientColor) 100%);
        transform-origin: 100% 27.5px 0;
        transform: skew(-30deg);
        z-index: -1;
    }
}

.menu-item--border {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
    background: linear-gradient(90deg, rgba(0, 0, 0, 0) 60%, var(--notSelectedBackgroundColor) 80%);
    height: 1px;
    width: 100%;
}

.menu-item--bottom-border {
    height: 1px;
    width: 100%;
    background-color: #474647;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 1px;
    box-shadow: 1px 0px 1px 0px #000000;
}
</style>