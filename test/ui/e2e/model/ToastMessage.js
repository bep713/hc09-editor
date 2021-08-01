class ToastMessage {
    constructor(page) {
        this.page = page;
    }

    async waitForToast() {
        return this.page.waitForSelector('.p-toast-message');
    }

    async readTitle() {
        return this.page.innerText('.p-toast-summary');
    }

    async readContent() {
        return this.page.innerText('.p-toast-detail');
    }

    async readToastSeverity() {
        const toast = await this.page.$('.p-toast-message');
        const clazz = await toast.getAttribute('class');
        const severityOptions = ['success', 'info', 'warn', 'error'];

        return severityOptions.find((severity) => {
            return clazz.indexOf(severity) >= 0;
        });
    }
};

module.exports = ToastMessage;