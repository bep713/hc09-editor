const log = require('../util/logger');
const { app, ipcMain } = require('deskgap');
const CareerInfo = require('./model/CareerInfo');
const HC09Helper = require('madden-file-tools/helpers/HC09Helper');

let helper;

module.exports.initializeListeners = function (mainWindow) {
    ipcMain.on('get-version', () => {
        mainWindow.webContents.send('get-version', app.getVersion());
    });

    ipcMain.on('open-file', (_, path) => {
        helper = new HC09Helper();
        helper.load(path)
            .then(() => {
                const readRecordsPromises = [helper.file.DEID.readRecords()];

                Promise.all(readRecordsPromises)
                    .then(() => {
                        mainWindow.webContents.send('file-loaded', path);
                    });
            });
    });

    ipcMain.on('get-career-info', () => {
        const careerInfo = new CareerInfo();
        careerInfo.filePath = helper.filePath;
        careerInfo.teamId = helper.file.DEID.records[0].fields['TGID'].value;

        mainWindow.webContents.send('get-career-info', careerInfo)
    });
};