class UnsavedChangesModal {
    constructor(page) {
        this.page = page;
    }

    async closeWithoutSaving() {
        await this.page.click('text=Yes');
    }

    async cancelClose() {
        await this.page.click('text=No');
    }

    async readTitle() {
        return this.page.innerText('.p-dialog-title');
    }

    async readDescription() {
        return this.page.innerText('.p-confirm-dialog-message')
    }
}

module.exports = UnsavedChangesModal;