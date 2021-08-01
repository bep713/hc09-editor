class DbEditorHome {
    constructor(page) {
        this.page = page;
    }

    async waitForPageLoad() {
        await this.page.waitForSelector('.recent-files-wrapper');
    }

    async goBackToHomepage() {
        await this.page.click('text=Back to Home');
    }

    async openDbFile(file) {
        await this.page.evaluate(`const textbox = document.querySelector('#db-file'); textbox.classList.remove('hidden');`);
        await this.page.type('#db-file', file);
        await this.page.keyboard.press('Enter');
    }
};

module.exports = DbEditorHome;