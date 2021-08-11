const { ipcMain } = require('deskgap');
const log = require('../../util/logger');
const EventResponse = require('../model/EventResponse');
const API = require('../../util/server-api-definition');
const dbQueryHelper = require('../helpers/db-query-helper');
const astQueryHelper = require('../helpers/ast-query-helper');
const astEditorService = require('../editors/ast-editor-service');

let coachApi = {};

coachApi.astReadsDone = false;
coachApi.astRoots = [];

coachApi.initialize = (dbEditorService, config) => {
    coachApi.dbEditorService = dbEditorService;
    dbQueryHelper.initialize(dbEditorService);
    coachApi.settingsHelper = config;

    const gameRootFolder = coachApi.settingsHelper.config.get('gameRootFolder');

    if (gameRootFolder) {
        log.info('Game root folder setting: ' + gameRootFolder);
        astQueryHelper.initialize(astEditorService, gameRootFolder);
    }
};

coachApi.initializeListeners = (mainWindow) => {
    ipcMain.on(API.COACH.GET_ALL_COACHES, async () => {        
        let coaches = await dbQueryHelper.getAllCoaches();
        const coachPortraits = await astQueryHelper.getCoachPortraits();

        coachPortraits.forEach((portraitData) => {
            const coach = coaches.find((coach) => {
                return coach.portraitId === portraitData.id;
            });

            if (coach) {
                coach.portrait = portraitData.preview;
            }
        });

        const response = new EventResponse(true);
        response.results = coaches;

        mainWindow.webContents.send(API.COACH.GET_ALL_COACHES, response);
    });
};

module.exports = coachApi;