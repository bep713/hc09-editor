const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const kill = require('tree-kill');
const { expect } = require('chai');
const { pipeline } = require('stream');
const { chromium } = require('playwright');
const util = require('../util/UiTestUtil');
// const csvParse = require('csv-parse/lib/sync');
const runDeskgap = require('../../../../lib/deskgap/run');

const HomePage = require('../model/HomePage');
const DbEditorHome = require('../model/db/DbEditorHome');
const DbEditorData = require('../model/db/DbEditorData');
const RecentFiles = require('../model/common/RecentFiles');
const ToastMessage = require('../model/common/ToastMessage');
const UnsavedChangesModal = require('../model/common/UnsavedChangesModal');

let browser, page, deskgapProcess;

beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    deskgapProcess = runDeskgap(path.join(__dirname, '../../../../lib/deskgap/dist'), path.join(__dirname, '../../../../'));

    return new Promise((resolve, reject) => {
        let tries = 0;
        let interval = setInterval(async () => {
            try {
                browser = await chromium.connectOverCDP({
                    endpointURL: 'http://localhost:9223'
                });
            
                page = browser.contexts()[0].pages()[0];
                
                clearInterval(interval);
                resolve();
            }
            catch (err) {
                tries += 1;

                if (tries > 10) {
                    clearInterval(interval);
                    reject();
                }
            }
        }, 100);
    });
});

afterEach(async () => {
    kill(deskgapProcess.pid);
});

function cloneFile(filePath, cloneOutputPath) {
    return new Promise((resolve, reject) => {
        pipeline(
            fs.createReadStream(filePath),
            fs.createWriteStream(cloneOutputPath),
            (err) => {
                if (err) {
                    reject(err);
                }

                resolve();
            }
        )
    });
};

describe('db editor tests', async function () {
    this.timeout(60000);
    const CAREER_FILE_PATH = path.join(__dirname, '../../../data/db/BLUS30128-CAREER-TEST/USR-DATA');

    const PRISTINE_DB_FILE_PATH = path.join(__dirname, '../../../data/db/pristine/pristine-roster.db');
    const DB_FILE_PATH = path.join(__dirname, '../../../data/db/end-to-end-test.db');

    const EXPORT_PATH = path.join(__dirname, '../../../data/db/export-test.csv');
    const EXPORT_COMPARE_PATH = path.join(__dirname, '../../../data/db/pristine/export-compare.csv');

    const IMPORT_PATH = path.join(__dirname, '../../../data/db/pristine/import-test.csv');

    beforeEach(async () => {
        await cloneFile(PRISTINE_DB_FILE_PATH, DB_FILE_PATH);
    })

    it('can open and modify a DB file', async () => {
        const home = new HomePage(page);
        await home.waitForPageLoad();
        await home.openDbEditor();

        const dbEditorHome = new DbEditorHome(page);
        await dbEditorHome.waitForPageLoad();

        const recentFiles = new RecentFiles(page);
        await recentFiles.removeAllRecentFiles();

        // open DB file from button
        const accessTime = new Date();
        await dbEditorHome.openDbFile(DB_FILE_PATH);
        const dbEditorData = new DbEditorData(page);
        await dbEditorData.waitForPageLoad();

        // can close the DB file
        await dbEditorData.closeFile();
        await dbEditorHome.waitForPageLoad();
        
        // ensure DB file added to recent files list
        const newRecentFiles = await recentFiles.readRecentFiles();
        expect(newRecentFiles.length).to.equal(1);
        expect(newRecentFiles[0]).to.eql({
            fileName: DB_FILE_PATH,
            fileType: 'file',
            lastAccessTime: new Intl.DateTimeFormat('en', { 
                month: '2-digit', 
                day: '2-digit', 
                year: 'numeric', 
                hour12: true, 
                hour: '2-digit', 
                minute: '2-digit'
            }).format(accessTime).replace(',', '')
        });

        // open DB file from recent files list
        await recentFiles.openRecentFile(1);
        await dbEditorData.waitForPageLoad();
        await dbEditorData.waitForTableToLoad();

        // displays correct file name
        const fileName = await dbEditorData.readFileName();
        expect(fileName).to.equal(DB_FILE_PATH);

        // loads DB tables correctly
        const tables = await dbEditorData.readTables();
        expect(tables.length).to.equal(16);

        // auto-opens the first table
        const firstTableName = await dbEditorData.readTableName();
        expect(firstTableName).to.equal('CSKL');

        // can search the tables
        await dbEditorData.searchTables('TEAM');

        // can select and load a table
        await dbEditorData.openTableAtIndex(1);
        await dbEditorData.waitForTableToLoad();

        // displays the expected table name
        const teamTableName = await dbEditorData.readTableName();
        expect(teamTableName).to.equal('TEAM');
        
        // displays all the table columns
        const tableColumns = await dbEditorData.readTableColumns();
        expect(tableColumns.length).to.equal(78);

        // displays the table data
        const browns = await dbEditorData.readTableDataAtIndicies(5, 7);
        expect(browns).to.equal('Browns');

        // displays a limited number of rows
        const numberOfRowsDisplayed = await dbEditorData.readNumberOfRows();
        expect(numberOfRowsDisplayed).to.equal(10);

        // displays current page
        const currentPage = await dbEditorData.readCurrentPage();
        expect(currentPage).to.equal(1);

        // can navigate pages
        await dbEditorData.viewNextPage();
        const nextPage = await dbEditorData.readCurrentPage();
        expect(nextPage).to.equal(2);

        await dbEditorData.viewLastPage();
        const lastPage = await dbEditorData.readCurrentPage();
        expect(lastPage).to.equal(4);

        await dbEditorData.viewPreviousPage();
        const previousPage = await dbEditorData.readCurrentPage();
        expect(previousPage).to.equal(3);

        await dbEditorData.viewFirstPage();
        const firstPage = await dbEditorData.readCurrentPage();
        expect(firstPage).to.equal(1);

        await dbEditorData.viewPage(3);
        const thirdPage = await dbEditorData.readCurrentPage();
        expect(thirdPage).to.equal(3);

        await dbEditorData.viewFirstPage();

        // can adjust number of records to view
        await dbEditorData.setNumberOfRowsToView(50);
        const newNumberOfRows = await dbEditorData.readNumberOfRows();
        expect(newNumberOfRows).to.equal(36);

        await dbEditorData.setNumberOfRowsToView(10);

        // can sort the data ascending
        await dbEditorData.toggleColumnSort(1);

        const firstValue = await dbEditorData.readTableDataAtIndicies(1, 1);
        expect(firstValue).to.equal('35');

        const secondValue = await dbEditorData.readTableDataAtIndicies(2, 1);
        expect(secondValue).to.equal('46');

        const thirdValue = await dbEditorData.readTableDataAtIndicies(3, 1);
        expect(thirdValue).to.equal('127');

        // can sort the data descending
        await dbEditorData.toggleColumnSort(1);

        const highestValue = await dbEditorData.readTableDataAtIndicies(1, 1);
        expect(highestValue).to.equal('127');

        await dbEditorData.viewLastPage();

        const lowestValue = await dbEditorData.readTableDataAtIndicies(6, 1);
        expect(lowestValue).to.equal('35');

        const secondLowestValue = await dbEditorData.readTableDataAtIndicies(5, 1);
        expect(secondLowestValue).to.equal('46');

        // can un-sort the data
        await dbEditorData.toggleColumnSort(1);

        const newFirstValue = await dbEditorData.readTableDataAtIndicies(1, 1);
        expect(newFirstValue).to.equal('127');

        await dbEditorData.viewLastPage();

        const lastValue = await dbEditorData.readTableDataAtIndicies(1, 1);
        expect(lastValue).to.equal('127');

        // can filter the data
        await dbEditorData.filterColumn(1, 'Equals', '46');

        const filteredFirstValue = await dbEditorData.readTableDataAtIndicies(1, 1);
        expect(filteredFirstValue).to.equal('46');

        const numberFilteredRows = await dbEditorData.readNumberOfRows();
        expect(numberFilteredRows).to.equal(1);

        // can clear a filter
        await dbEditorData.clearFilterOnColumn(1);

        const originalNumberOfRows = await dbEditorData.readNumberOfRows();
        expect(originalNumberOfRows).to.equal(10);

        // can filter a text column
        await dbEditorData.filterColumn(7, 'Equals', 'Browns');

        const newBrowns = await dbEditorData.readTableDataAtIndicies(1, 7);
        expect(newBrowns).to.equal('Browns');

        const brownsNumberRecords = await dbEditorData.readNumberOfRows();
        expect(brownsNumberRecords).to.equal(1);

        await dbEditorData.clearFilterOnColumn(7);

        // can select which columns to display
        await dbEditorData.toggleColumnDisplay('SID1');
        const newTableColumns = await dbEditorData.readTableColumns();
        expect(newTableColumns.length).to.equal(77);

        // can edit a cell's value
        await dbEditorData.editTableDataAtIndicies(5, 6, 'Test');
        const newValue = await dbEditorData.readTableDataAtIndicies(5, 6);
        expect(newValue).to.equal('Test');

        // file name indicates an unsaved change has been made
        const newFileName = await dbEditorData.readFileName();
        expect(newFileName).to.equal(DB_FILE_PATH + ' *');

        // will not allow strings in numeric columns
        await dbEditorData.editTableDataAtIndicies(1, 1, 'Hello');
        const originalValue = await dbEditorData.readTableDataAtIndicies(1, 1);
        expect(originalValue).to.equal('20');

        // will show an error message if user enters a number higher than the column max
        await dbEditorData.editTableDataAtIndicies(1, 1, '9999');
        const toast = new ToastMessage(page);
        await toast.waitForToast();

        const severity = await toast.readToastSeverity();
        expect(severity).to.equal('error');

        await toast.closeToast();

        // will show a warning message if the user tries to close with unsaved changes
        await dbEditorData.closeFile();

        const modal = new UnsavedChangesModal(page);
        const modalText = await modal.readDescription();
        expect(modalText).to.equal('Are you sure you want to close with unsaved changes? The changes will be lost.');
        await modal.cancelClose();

        // can save the file
        await dbEditorData.saveFile();
        await toast.waitForToast();

        // save confirmation is shown to the user
        const saveSuccess = await toast.readToastSeverity();
        expect(saveSuccess).to.equal('success');

        await toast.closeToast();

        // file name will go back to normal
        const normalFileName = await dbEditorData.readFileName();
        expect(normalFileName).to.equal(DB_FILE_PATH);

        // can undo the change
        await util.sendUndoKeyboardShortcut(page);
        const undoneValue = await dbEditorData.readTableDataAtIndicies(5, 6);
        expect(undoneValue).to.equal('Browns');

        // can redo the change
        await util.sendRedoKeyboardShortcut(page);
        const redoneValue = await dbEditorData.readTableDataAtIndicies(5, 6);
        expect(redoneValue).to.equal('Test');

        // reset to original value
        await util.sendUndoKeyboardShortcut(page);

        // can export a table
        await dbEditorData.toggleAllColumnsDisplay();
        await dbEditorData.exportCurrentTable(EXPORT_PATH);
        await toast.waitForToast();

        const exportToastSeverity = await toast.readToastSeverity();
        expect(exportToastSeverity).to.equal('success');

        await toast.closeToast();
        
        const exportedFile = fs.readFileSync(EXPORT_PATH);
        const compareFile = fs.readFileSync(EXPORT_COMPARE_PATH);
        testBufferHashes(exportedFile, compareFile);

        // can import a table
        await dbEditorData.importCurrentTable(IMPORT_PATH);
        await toast.closeToast();

        const expectedFirstChange = await dbEditorData.readTableDataAtIndicies(1, 1);
        expect(expectedFirstChange).to.equal('22');

        const expectedSecondChange = await dbEditorData.readTableDataAtIndicies(5, 7);
        expect(expectedSecondChange).to.equal('Test');

        await util.sendSaveKeyboardShortcut(page);
        await toast.waitForToast();

        const saveKeyShortcutSeverity = await toast.readToastSeverity();
        expect(saveKeyShortcutSeverity).to.equal('success');

        const fileNameAfterSaveKey = await dbEditorData.readFileName();
        expect(fileNameAfterSaveKey).to.equal(DB_FILE_PATH);
    });

    it('undo and redo tests', async () => {
        const home = new HomePage(page);
        await home.waitForPageLoad();
        await home.openDbEditor();

        const recentFiles = new RecentFiles(page);

        const dbEditorHome = new DbEditorHome(page);
        await dbEditorHome.waitForPageLoad();

        const dbEditorData = new DbEditorData(page);
        await recentFiles.openRecentFile(1);
        await dbEditorData.waitForPageLoad();
        await dbEditorData.waitForTableToLoad();

        await dbEditorData.openTable('COCH');

        // can undo many values
        await dbEditorData.editTableDataAtIndicies(1, 52, 'Test1');
        await dbEditorData.editTableDataAtIndicies(1, 53, 'Test2');
        await dbEditorData.editTableDataAtIndicies(2, 52, 'Test3');
        await dbEditorData.editTableDataAtIndicies(2, 53, 'Test4');
        await dbEditorData.editTableDataAtIndicies(3, 52, 'Test5');
        await dbEditorData.editTableDataAtIndicies(3, 53, 'Test6');
        await dbEditorData.editTableDataAtIndicies(4, 52, 'Test7');
        await dbEditorData.editTableDataAtIndicies(4, 53, 'Test8');

        await util.sendUndoKeyboardShortcut(page);
        await util.sendUndoKeyboardShortcut(page);
        await util.sendUndoKeyboardShortcut(page);
        await util.sendUndoKeyboardShortcut(page);
        
        const test5 = await dbEditorData.readTableDataAtIndicies(3, 52);
        expect(test5).not.to.equal('Test5');

        const test6 = await dbEditorData.readTableDataAtIndicies(3, 53);

        const test1 = await dbEditorData.readTableDataAtIndicies(1, 52);
        expect(test1).to.equal('Test1');

        // can redo after undoing
        await util.sendRedoKeyboardShortcut(page);

        const newTest5 = await dbEditorData.readTableDataAtIndicies(3, 52);
        expect(newTest5).to.equal('Test5');

        const originalTest9 = await dbEditorData.readTableDataAtIndicies(5, 52);
        await dbEditorData.editTableDataAtIndicies(5, 52, 'Test9');
        
        // cannot redo after editing a cell
        await util.sendRedoKeyboardShortcut(page);

        const newTest6 = await dbEditorData.readTableDataAtIndicies(3, 53);
        expect(test6).to.equal(newTest6);

        const originalCchm = await dbEditorData.readTableDataAtIndicies(8, 51);
        await dbEditorData.editTableDataAtIndicies(8, 51, '99');

        // undo/redo still works with filters and different row indicies
        await dbEditorData.filterColumn(52, 'Equals', 'Danny');
        await dbEditorData.editTableDataAtIndicies(1, 52, 'Test10');

        await util.sendUndoKeyboardShortcut(page);
        await util.sendUndoKeyboardShortcut(page);

        const newCchm = await dbEditorData.readTableDataAtIndicies(1, 51);
        expect(newCchm).to.equal(originalCchm);

        // undo still works if undone cell is off the screen
        await util.sendUndoKeyboardShortcut(page);

        await dbEditorData.clearFilterOnColumn(52);

        const notTest9 =  await dbEditorData.readTableDataAtIndicies(5, 52);
        expect(notTest9).to.equal(originalTest9);
    });
});


function testBufferHashes(bufferToTest, bufferToCompare) {
    let testHash = crypto.createHash('sha1');
    testHash.update(bufferToTest);

    let compareHash = crypto.createHash('sha1');
    compareHash.update(bufferToCompare);

    expect(testHash.digest('hex')).to.eql(compareHash.digest('hex'));
};