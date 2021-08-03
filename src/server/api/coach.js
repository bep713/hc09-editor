const { ipcMain } = require('deskgap');
const log = require('../../util/logger');
const EventResponse = require('../model/EventResponse');
const API = require('../../util/server-api-definition');
const dbQueryHelper = require('../helpers/db-query-helper');

let coachApi = {};

coachApi.initialize = (dbEditorService, config) => {
    coachApi.dbEditorService = dbEditorService;
    dbQueryHelper.initialize(dbEditorService);
};

coachApi.initializeListeners = (mainWindow) => {
    ipcMain.on(API.COACH.GET_ALL_COACHES, async () => {
        const coaches = await dbQueryHelper.getAllCoaches();
        const response = new EventResponse(true);
        response.results = coaches;

        mainWindow.webContents.send(API.COACH.GET_ALL_COACHES, response);
    });
};

module.exports = coachApi;