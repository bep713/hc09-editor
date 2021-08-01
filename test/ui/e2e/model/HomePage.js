const util = require('../util/UiTestUtil');

class HomePage {
    constructor(page) {
        this.page = page;
    };

    async waitForPageLoad() {
        await this.page.waitForSelector('.p-button')
    }

    async loadCareerFile(file) {
        await util.enterFilePath(this.page, '#career-file', file);
    }

    async editGameFiles() {
        await this.page.click('text=Edit Game Files');
    }

    async openDbEditor() {
        await this.page.click('text=Open DB Editor');
    }
}

module.exports = HomePage;