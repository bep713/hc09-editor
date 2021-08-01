class CareerPage {
    constructor(page) {
        this.page = page;
    }

    async waitForPageLoad() {
        await this.page.waitForSelector('.fileName');
    }

    async changeTeam(teamName) {
        await this.page.click('text=Change Team');
        await this.page.click(`img[alt=${teamName}]`);
    }

    async readFileName() {
        return this.page.innerText('.fileName');
    }

    async readCurrentTeam() {
        return this.page.getAttribute('.editor-home-container', 'data-current-team');
    }

    async saveCareer() {
        return this.page.click('text=Save Career');
    }

    async closeFile() {
        return this.page.click('text=Close File');
    }

    async readChangeTeamOptions() {
        await this.page.click('text=Change Team');
        
        const teamLogos = await this.page.$$('.team-picker-wrapper img');
        return Promise.all(teamLogos.map(async (logoEl) => {
            const alt = await logoEl.getAttribute('alt');
            return alt;
        }));
    }

    async closeChangeTeamModal() {
        await this.page.click('.p-dialog-header-close');
    }
};

module.exports = CareerPage;