const path = require('path');
const log = require('../../util/logger');
const { app, ipcMain } = require('deskgap');
const EventResponse = require('../model/EventResponse');
const dbEditorService = require('../editors/db-editor-service');

let dbApi = {};

dbApi.initialize = (recentFileService) => {
    dbApi.recentFileService = recentFileService;
};

dbApi.initializeListeners = (mainWindow) => {
    ipcMain.on('db:get-recent-files', (_, data) => {
        const response = new EventResponse(true);
        response.results = dbApi.recentFileService.getRecentFilesByCategory('recentDBFiles');
        mainWindow.webContents.send('db:get-recent-files', response);
    });

    ipcMain.on('db:remove-recent-file', (_, data) => {
        dbApi.recentFileService.removeFile('recentDBFiles', data.path);
    });

    ipcMain.on('db:open-file', (_, data) => {
        dbEditorService.openFile(data)
        .then(() => {
                dbApi.recentFileService.addFile('recentDBFiles', {
                    'path': data,
                    'type': 'single'
                });

                const tables = dbEditorService.getTables();

                const response = new EventResponse(true);
                response.tables = tables;
                mainWindow.webContents.send('db:open-file', response);
            })
            .catch((err) => {
                sendErrorResponse(err, 'db:open-file');
            });
    });

    ipcMain.on('db:get-records', (_, data) => {
        dbEditorService.getTableData(data.tableName, data.options)
            .then((result) => {
                const response = new EventResponse(true);
                response.result = result;
                mainWindow.webContents.send('db:get-records', response);
            })
            .catch((err) => {
                sendErrorResponse(err, 'db:get-records');
            });
    });

    function sendErrorResponse(err, event) {
        log.error(err);
        const response = new EventResponse(false);
        response.errorMessage = err;
        mainWindow.webContents.send(event, response);
    };
};

module.exports = dbApi;