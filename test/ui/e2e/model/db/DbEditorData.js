class DbEditorData {
    constructor(page) {
        this.page = page;
    }

    async waitForPageLoad() {
        await this.page.waitForSelector('.filename-text');
    }

    async closeFile() {
        await this.page.click('.close-db-file');
    }

    async saveFile() {
        await this.page.click('.save-db-file');
    }

    async readFileName() {
        return this.page.innerText('.filename-text');
    }

    async readTables() {
        const labelEls = await this.page.$$('.p-treenode-label');
        return Promise.all(labelEls.map(async (labelEl) => {
            return labelEl.innerText();
        }));
    }

    async searchTables(tableSearch) {
        await this.page.type('.p-tree-filter', tableSearch);
    }

    async openTableAtIndex(index) {
        await this.page.click(`.p-treenode-leaf:nth-of-type(${index})`);
    }

    async waitForTableToLoad() {
        const tableLoadingSelector = '.p-datatable-loading-overlay';
        const tableLoadEl = await this.page.$(tableLoadingSelector);

        if (tableLoadEl) {
            await this.page.waitForSelector(tableLoadingSelector, { state: 'detached' });
        }
    }

    async readTableName() {
        return this.page.innerText('.data-table-header');
    }

    async readTableColumns() {
        const columnEls = await this.page.$$('.p-datatable-thead .p-column-title');
        return Promise.all(columnEls.map(async (columnEl) => {
            return columnEl.innerText();
        }));
    }

    async readTableDataAtIndicies(row, col) {
        return this.page.innerText(`.p-datatable-tbody tr:nth-of-type(${row}) td:nth-of-type(${col})`);
    }

    async readNumberOfRows() {
        const rows = await this.page.$$('.p-datatable-tbody tr');
        return rows.length;
    }

    async viewFirstPage() {
        await this.page.click('.p-paginator-first');
        await this.waitForTableToLoad();
    }

    async viewPreviousPage() {
        await this.page.click('.p-paginator-prev');
        await this.waitForTableToLoad();
    }

    async viewNextPage() {
        await this.page.click('.p-paginator-next');
        await this.waitForTableToLoad();
    }

    async viewLastPage() {
        await this.page.click('.p-paginator-last');
        await this.waitForTableToLoad();
    }

    async readCurrentPage() {
        const page = await this.page.innerText('.p-paginator-page.p-highlight');
        return parseInt(page);
    }

    async viewPage(desiredPage) {
        const currentPage = await this.readCurrentPage();
        if (currentPage === desiredPage) {
            await this.waitForTableToLoad();
        }
        else if (currentPage > desiredPage) {
            await this.viewPreviousPage();
            await this.viewPage(desiredPage);
        }
        else {
            await this.viewNextPage();
            await this.viewPage(desiredPage);
        }
    }

    async setNumberOfRowsToView(numRecords) {
        // await this.page.waitForTimeout(60000);
        await this.page.click('.p-paginator-rpp-options');
        await this.page.click(`.p-dropdown-item[aria-label="${numRecords}"]`);
        await this.waitForTableToLoad();
    }

    async toggleColumnSort(col) {
        await this.page.click(`.p-datatable-thead th:nth-of-type(${col})`);
        await this.waitForTableToLoad();
    }

    async filterColumn(col, filterType, value) {
        await this.page.click(`.p-datatable-thead th:nth-of-type(${col}) .p-column-filter-menu-button`);
        await this.page.waitForSelector('.p-column-filter-overlay .p-column-filter-matchmode-dropdown');
        await this.page.click('.p-column-filter-overlay .p-column-filter-matchmode-dropdown');
        await this.page.click(`.p-dropdown-item[aria-label=${filterType}]`);
        await this.page.type('.p-column-filter-overlay .p-column-filter', value);
        await this.page.click('text=Apply');
        await this.waitForTableToLoad();
    }

    async clearFilterOnColumn(col) {
        await this.page.click(`.p-datatable-thead th:nth-of-type(${col}) .p-column-filter-menu-button`);
        await this.page.waitForSelector('.p-column-filter-overlay .p-column-filter-matchmode-dropdown');
        await this.page.click('text=Clear');
    }

    async toggleColumnDisplay(colName) {
        await this.page.click('.column-select');
        await this.page.waitForSelector('.p-multiselect-item');
        await this.page.click(`.p-multiselect-item[aria-label=${colName}]`);
        await this.waitForTableToLoad();
        await this.page.click('.column-select');
    }

    async editTableDataAtIndicies(row, col, data) {
        await this.page.click(`.p-datatable-tbody tr:nth-of-type(${row}) td:nth-of-type(${col})`);
        await this.page.waitForSelector(`.p-datatable-tbody tr:nth-of-type(${row}) td:nth-of-type(${col}) .p-inputtext`);
        await this.page.waitForTimeout(1000);
        await this.page.keyboard.type(data);
        await this.page.keyboard.press('Enter');
    }
};

module.exports = DbEditorData;