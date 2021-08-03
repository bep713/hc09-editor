const Conf = require('conf');
const settingsMapping = require('../data/settingsMapping.json');

let settingsHelper = {};

settingsHelper.initialize = () => {
    const settingSchemas = Object.keys(settingsMapping).reduce((accum, cur) => {
        accum[cur] = settingsMapping[cur].schema;
        return accum;
    }, {});

    settingsHelper.config = new Conf({
        schema: settingSchemas,
        projectSuffix: ''
    });
};

settingsHelper.getAllSettings = () => {
    const store = settingsHelper.config.store;

    return Object.keys(settingsHelper.config.store).reduce((accum, cur) => {
        accum[cur] = {
            uiName: settingsMapping[cur].uiName,
            uiType: settingsMapping[cur].uiType,
            value: store[cur]
        };
        
        return accum;
    }, {});
};

module.exports = settingsHelper;