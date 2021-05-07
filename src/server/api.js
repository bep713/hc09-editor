const log = require('../util/logger');
const { app, ipcMain } = require('deskgap');
const CareerInfo = require('./model/CareerInfo');
const HC09Helper = require('madden-file-tools/helpers/HC09Helper');
const EventResponse = require('./model/EventResponse');

let helper;

module.exports.initializeListeners = function (mainWindow) {
    ipcMain.on('get-version', () => {
        mainWindow.webContents.send('get-version', app.getVersion());
    });

    ipcMain.on('open-file', (_, path) => {
        helper = new HC09Helper();
        helper.load(path)
            .then(() => {
                const readRecordsPromises = [helper.file.DEID.readRecords(), helper.file.TEAM.readRecords()];

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
        careerInfo.teamData = helper.file.TEAM.records.map((team) => {
            return {
                'TGID': team._fields['TGID'].value,
                'cityName': team._fields['TLNA'].value,
                'nickName': team._fields['TDNA'].value,
                'colors': {
                    'r': team._fields['TBCR'].value,
                    'g': team._fields['TBCG'].value,
                    'b': team._fields['TBCB'].value
                }
            }
        });

        mainWindow.webContents.send('get-career-info', careerInfo)
    });

    ipcMain.on('save-career-info', (_, careerInfo) => {
        helper.file.DEID.records[0].fields['TGID'].value = careerInfo._teamId;

        helper.save()
            .then(() => {
                const response = new EventResponse(true);
                mainWindow.webContents.send('save-career-info', response);
            })
            .catch((err) => {
                const response = new EventResponse(false);
                response.errorMessage = err;
                mainWindow.webContents.send('save-career-info', response);
            });
    });
};