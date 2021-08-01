global.jsdom = require('jsdom-global')(undefined, { pretendToBeVisual: true, url: 'http://localhost' })

window.Date = Date;
window.deskgap = {
    asyncNode: {
        require: function () {
            return Promise.resolve({
                prop: function () {
                    return {
                        invoke: function () {
                            return {
                                resolve: function () {
                                    return {
                                        value: function () {
                                            return Promise.resolve('test');
                                        }
                                    }
                                }
                            };
                        }
                    }
                }
            });
        },

        getCurrentWindow: function () {

        }
    },
    messageUI: {
        send: function () {

        },
        on: function () {

        },
        removeAllListeners: function () {

        }
    }
}

global.ShadowRoot = window.ShadowRoot;
global.SVGElement = window.SVGElement;