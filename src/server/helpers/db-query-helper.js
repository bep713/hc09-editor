let dbQueryHelper = {
    dbEditorService: null
};

dbQueryHelper.initialize = (dbEditorService) => {
    dbQueryHelper.dbEditorService = dbEditorService;
}

dbQueryHelper.getAllCoaches = () => {
    const file = dbQueryHelper.dbEditorService.activeDbHelper.file;

        
};

module.exports = dbQueryHelper;