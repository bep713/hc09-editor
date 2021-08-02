const { ipcMain } = require('deskgap');
const log = require('../../util/logger');
const EventResponse = require('../model/EventResponse');
const API = require('../../util/server-api-definition');

let coachApi = {};

coachApi.initialize = (dbEditorService) => {
    coachApi.dbEditorService = dbEditorService;
};

coachApi.initializeListeners = (mainWindow) => {
    // ipcMain.on(z)
};

module.exports = coachApi;