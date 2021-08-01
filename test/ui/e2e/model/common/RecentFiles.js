class RecentFiles {
    constructor(page) {
        this.page = page;
    }

    async readRecentFiles() {
        const recentFiles = await this.page.$$('.recent-file');
        return Promise.all(recentFiles.map(async (fileEl, index) => {           
            return this.readRecentFile(index+1);          
        }));
    }

    async readRecentFile(index) {
        const fileEl = await this.page.$(`.recent-file:nth-of-type(${index})`);

        const pathNameEl = await fileEl.$('.path-name');
        const pathName = await pathNameEl.innerText();

        const recentFileTimeEl = await fileEl.$('.recent-file-time');
        const recentFileTime = await recentFileTimeEl.innerText();

        const fileTypeEl = await fileEl.$('i');
        const fileTypeClass = await fileTypeEl.getAttribute('class');

        return {
            fileName: pathName,
            lastAccessTime: recentFileTime,
            fileType: fileTypeClass.indexOf('pi-file') >= 0 ? 'file' : 'folder'
        };
    }

    async removeRecentFile(index) {
        await this.page.click(`.recent-file:nth-of-type(${index}) button`);
    }

    async removeAllRecentFiles() {
        const recentFiles = await this.page.$$('.recent-file');

        for(let i = 0; i < recentFiles.length; i+=1) {
            await this.removeRecentFile(1);
        }
    }

    async openRecentFile(index) {
        await this.page.click(`.recent-file:nth-of-type(${index})`);
    }
};

module.exports = RecentFiles;