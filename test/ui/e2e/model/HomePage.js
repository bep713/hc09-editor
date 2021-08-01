class HomePage {
    constructor(page) {
        this.page = page;
    };

    async waitForPageLoad() {
        await this.page.waitForSelector('.p-button')
    }

    async loadCareerFile(file) {
        await this.page.evaluate(`const textbox = document.querySelector('#career-file'); textbox.classList.remove('hidden');`);
        await this.page.type('#career-file', file);
        await this.page.keyboard.press('Enter');
    }

    async editGameFiles() {
        await this.page.click('text=Edit Game Files');
    }

    async openDbEditor() {
        await this.page.click('text=Open DB Editor');
    }
}

module.exports = HomePage;