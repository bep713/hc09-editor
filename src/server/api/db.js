const path = require('path');
const log = require('../../util/logger');
const { app, ipcMain } = require('deskgap');
const child_process = require('child_process');
const EventResponse = require('../model/EventResponse');
const API = require('../../util/server-api-definition');

let dbApi = {};

dbApi.initialize = (recentFileService, dbEditorService, config) => {
    dbApi.recentFileService = recentFileService;
    dbApi.dbEditorService = dbEditorService;
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

    ipcMain.on(API.DB.OPEN_DB_FILE, (_, data) => {
        dbApi.dbEditorService.openFile(data.path)
            .then(() => {
                if (!data.omitFromRecentFiles) {
                    dbApi.recentFileService.addFile('recentDBFiles', {
                        'path': data.path,
                        'type': 'single'
                    });
                }

                const tables = dbApi.dbEditorService.getTables();

                const response = new EventResponse(true);
                response.tables = tables;
                mainWindow.webContents.send(API.DB.OPEN_DB_FILE, response);
            })
            .catch((err) => {
                sendErrorResponse(err, API.DB.OPEN_DB_FILE);
            });
    });

    ipcMain.on(API.DB.GET_DB_FILE_INFO, (_) => {
        const fileInfo = {
            'path': dbApi.dbEditorService.activeDbHelper.filePath,
            'tables': dbApi.dbEditorService.getTables()
        };

        let response = new EventResponse(true);
        response.info = fileInfo;

        mainWindow.webContents.send(API.DB.GET_DB_FILE_INFO, response);
    });

    ipcMain.on('db:get-records', (_, data) => {
        dbApi.dbEditorService.getTableData(data.tableName, data.options)
            .then((result) => {
                const response = new EventResponse(true);
                response.result = result;
                mainWindow.webContents.send('db:get-records', response);
            })
            .catch((err) => {
                sendErrorResponse(err, 'db:get-records');
            });
    });

    ipcMain.on('db:export-table', (_, data) => {
        dbApi.dbEditorService.exportTable(data.tableName, data.options)
            .then(() => {
                if (data.options.openFile) {
                    child_process.exec('start excel "' + data.options.exportLocation + '"', {
                        windowsHide: true
                    })
                }

                const response = new EventResponse(true);
                response.exportLocation = data.options.exportLocation;
                mainWindow.webContents.send('db:export-table', response);
            })
            .catch((err) => {
                sendErrorResponse(err, 'db:export-table');
            });
    });

    ipcMain.on('db:import-table', (_, data) => {
        dbApi.dbEditorService.importTable(data.tableName, data.options)
            .then(() => {
                const response = new EventResponse(true);
                mainWindow.webContents.send('db:import-table', response);
            })
            .catch((err) => {
                sendErrorResponse(err, 'db:import-table');
            });
    });

    ipcMain.on('db:update-value', (_, data) => {
        dbApi.dbEditorService.updateTableData(data)
            .then(() => {
                const response = new EventResponse(true);
                mainWindow.webContents.send('db:update-value', response);
            })
            .catch((err) => {
                sendErrorResponse(err, 'db:update-value');
            });
    });

    ipcMain.on('db:save-file', (_, data) => {
        dbApi.dbEditorService.saveActiveFile(data)
            .then(() => {
                const response = new EventResponse(true);
                mainWindow.webContents.send('db:save-file', response);
            })
            .catch((err) => {
                sendErrorResponse(err, 'db:save-file');
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