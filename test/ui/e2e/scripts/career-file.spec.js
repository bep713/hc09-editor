const path = require('path');
const kill = require('tree-kill');
const { expect } = require('chai');
const { chromium } = require('playwright');
const runDeskgap = require('../../../../lib/deskgap/run');

const HomePage = require('../model/HomePage');
const CareerPage = require('../model/career/CareerPage');
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

describe('career file tests', function () {
    this.timeout(60000);
    const CAREER_FILE_PATH = path.join(__dirname, '../../../data/db/BLUS30128-CAREER-TEST/USR-DATA');

    it('can change a team', async () => {
        const home = new HomePage(page);
        await home.waitForPageLoad();

        // can load a career file
        await home.loadCareerFile(CAREER_FILE_PATH);
        
        const career = new CareerPage(page);
        await career.waitForPageLoad();

        // displays expected career file name
        const name = await career.readFileName();
        expect(name).to.equal('CAREER-TEST');

        // can change to any NFL team
        const changeTeamOptions = await career.readChangeTeamOptions();
        expect(changeTeamOptions.length).to.equal(32);

        await career.closeChangeTeamModal();

        // can change a team
        await career.changeTeam('Ravens');
        const team = await career.readCurrentTeam();
        expect(team).to.equal('Ravens');

        // displays expected warning message when trying to close with unsaved changes
        await career.closeFile();
        const modal = new UnsavedChangesModal(page);
        const modalText = await modal.readDescription();
        expect(modalText).to.equal('Are you sure you want to close with unsaved changes? The changes will be lost.');
        await modal.cancelClose();

        // can save the career
        await career.saveCareer();
        
        // expected success notification is displayed
        const toast = new ToastMessage(page);
        await toast.waitForToast();
        const severity = await toast.readToastSeverity();
        expect(severity).to.equal('success');

        // can close to file without a modal
        await career.closeFile();

        // can load the career again
        await home.loadCareerFile(CAREER_FILE_PATH);
        await career.waitForPageLoad();

        // make sure the career team change stuck
        const newTeam = await career.readCurrentTeam();
        expect(newTeam).to.equal('Ravens');

        // reset the team back for the next test, save, and close
        await career.changeTeam('Browns');
        await career.saveCareer();
        await career.closeFile();
    });
});