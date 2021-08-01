const util = require('../../util/UiTestUtil');

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
        await util.enterFilePath(this.page, '#db-file', file);
    }
};

module.exports = DbEditorHome;