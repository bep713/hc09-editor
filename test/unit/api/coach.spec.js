const path = require('path');
const sinon = require('sinon');
const { expect } = require('chai');
const proxyquire = require('proxyquire').noCallThru();
const serverApi = require('../../../src/util/server-api-definition');
const settingsHelper = require('../../../src/server/helpers/settings-helper');
const dbEditorService = require('../../../src/server/editors/db-editor-service');

const DB_FILE_PATH = path.join(__dirname, '../../data/db/BLUS30128-CAREER-TEST/USR-DATA');

let deskgapMock = {
    listeners: {},
    ipcMain: {
        on: sinon.spy((name, fn) => {
            if (deskgapMock.listeners[name]) {
                deskgapMock.listeners[name].push(fn);
            }

            deskgapMock.listeners[name] = [fn];
        })
    }
}

let mainWindowMock = {
    sentData: {},
    webContents: {
        send: sinon.spy((name, data) => {
            mainWindowMock.sentData[name] = data;
        })
    }
}

const coach = proxyquire('../../../src/server/api/coach', {
    deskgap: deskgapMock
});

describe('coach api unit tests', () => {
    before(async () => {
        settingsHelper.initialize();
        await dbEditorService.openFile(DB_FILE_PATH);
    });
    
    beforeEach(() => {
        deskgapMock.ipcMain.on.resetHistory();
        mainWindowMock.webContents.send.resetHistory();
    });

    describe('initialize', () => {
        it('function exists', () => {
            expect(coach.initialize).to.exist;
        });

        it('sets variables', () => {
            coach.initialize(dbEditorService, settingsHelper);
            expect(coach.settingsHelper).to.eql(settingsHelper);   
            expect(coach.dbEditorService).to.eql(dbEditorService);  
        });
    });

    describe('initialize listeners', () => {
        it('function exists', () => {
            expect(coach.initializeListeners).to.exist;
        });

        it('get all coaches registered', () => {
            coach.initializeListeners(mainWindowMock);
            expect(deskgapMock.ipcMain.on.withArgs(serverApi.COACH.GET_ALL_COACHES).callCount).to.equal(1);
        });
    });

    describe('get all coaches', () => {
        beforeEach(() => {
            coach.initializeListeners(mainWindowMock);
        });

        it('returns expected response', async function () {
            this.timeout(15000);
            await deskgapMock.listeners[serverApi.COACH.GET_ALL_COACHES][0]();
            
            expect(mainWindowMock.webContents.send.callCount).to.equal(1);
            expect(mainWindowMock.webContents.send.firstCall.args[0]).to.equal(serverApi.COACH.GET_ALL_COACHES);
            expect(mainWindowMock.webContents.send.firstCall.args[1].results.length).to.equal(352);

            expect(mainWindowMock.webContents.send.firstCall.args[1].results[0]).to.eql({
                firstName: 'Lovie',
                lastName: 'Smith',
                overall: 48,
                portraitId: 559,
                portrait: "data:image/webp;base64,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",
                position: {
                    long: 'Head coach',
                    short: 'HC'
                },
                team: {
                    TGID: 1,
                    cityName: 'Chicago',
                    colors: {
                        b: 148,
                        g: 57,
                        r: 21
                    },
                    nickName: 'Bears'
                }
            });
        });
    });
});