let astQueryHelper = {};

astQueryHelper.astEditorService = null;
astQueryHelper.astsRead = false;
astQueryHelper.postInitializeFns = [];

astQueryHelper.initialize = async (astEditorService, rootFolderPath) => {
    astQueryHelper.initializePromise = new Promise(async (resolve, reject) => {
        astQueryHelper.astEditorService = astEditorService;
        astQueryHelper.astRoots = await astQueryHelper.astEditorService.openRootFolder(rootFolderPath);
        
        astQueryHelper.astRoots = astQueryHelper.astRoots.reduce((accum, cur) => {
            accum[cur.label] = cur;
            return accum;
        }, {});
    
        const fe2ig = await astQueryHelper.astEditorService.readAST(
            astQueryHelper.astRoots['qkl_fe2ig.ast'].data.absolutePath, 
            false, 
            false, 
            astQueryHelper.astRoots['qkl_fe2ig.ast'].key);
    
        astQueryHelper.ast = {
            fe2ig: fe2ig
        };
    
        astQueryHelper.astsRead = true;
        resolve();
    });

    await astQueryHelper.initializePromise;
};

astQueryHelper.getCoachPortraits = () => {
    return new Promise((resolve, reject) => {
        astQueryHelper.initializePromise.then(() => {

            let coachPreviews = [];
            let previewPromiseResolve;
            
            let previewPromise = new Promise((resolve, reject) => {
                previewPromiseResolve = resolve;
            });
    
            astQueryHelper.astEditorService.eventEmitter.on('preview', storeCoachPreviews);
            astQueryHelper.astEditorService.eventEmitter.on('previews-done', processCoachPreviews);
        
            Promise.all([
                astQueryHelper.astEditorService.readChildAST({ key:`${astQueryHelper.astRoots['qkl_fe2ig.ast'].key}_1775` }, false, true),
                previewPromise
            ])
                .then(([fe2igRoot]) => {
                    const coachPreviewToc = fe2igRoot.tocs.find((toc) => {
                        return toc.index === 1775;
                    });
    
                    astQueryHelper.astEditorService.eventEmitter.off('preview', storeCoachPreviews);
                    astQueryHelper.astEditorService.eventEmitter.off('previews-done', processCoachPreviews);
    
                    const mappedResult = coachPreviews.map((previewData) => {
                        const index = parseInt(previewData.key.split('_')[2]);
                        const toc = coachPreviewToc.file.tocs.find((toc) => {
                            return toc.index === index;
                        });
    
                        return {
                            index: index,
                            id: toc.shortId,
                            preview: previewData.preview
                        };
                    });
    
                    resolve(mappedResult);
                });
        
            function storeCoachPreviews(data) {
                coachPreviews.push(data);
            };
        
            function processCoachPreviews(data) {
                if (data.key === '1775') {
                    previewPromiseResolve();
                }
            };
        });
    });
};

module.exports = astQueryHelper;