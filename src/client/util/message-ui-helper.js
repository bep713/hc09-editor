class MessageUiHelper {
    constructor() {
        this.listeners = {};
        this.messageUI = window.deskgap.messageUI;
    }

    on(listener, fn) {
        this.messageUI.on(listener, fn);

        if (this.listeners[listener]) {
            this.listeners[listener].push(fn);
        }
        else {
            this.listeners[listener] = [fn];
        }
    }

    removeAll() {
        Object.keys(this.listeners).forEach((listener) => {
            const listenerFns = this.listeners[listener];
            listenerFns.forEach((listenerFn) => {
                this.messageUI.removeListener(listener, listenerFn);
            });
        });

        this.listeners = {};
    }
};

module.exports = MessageUiHelper;