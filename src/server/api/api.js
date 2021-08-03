const path = require('path');
const Conf = require('conf');
const log = require('../../util/logger');
const { app, ipcMain } = require('deskgap');
const CareerInfo = require('../model/CareerInfo');
const API = require('../../util/server-api-definition');
const EventResponse = require('../model/EventResponse');
const settingsHelper = require('../helpers/settings-helper');
const recentFileService = require('../recent-files-service');
const changedNodeService = require('../changed-node-service');
const dbEditorService = require('../editors/db-editor-service');
const astEditorService = require('../editors/ast-editor-service');
const HC09Helper = require('madden-file-tools/helpers/HC09Helper');

const dbApi = require('./db');
const coachApi = require('./coach');

let helper;

module.exports.initializeListeners = function (mainWindow) {
    recentFileService.initialize();
    changedNodeService.initialize();
    settingsHelper.initialize();

    dbApi.initialize(recentFileService, dbEditorService, settingsHelper);
    dbApi.initializeListeners(mainWindow);

    coachApi.initialize(dbEditorService, settingsHelper);
    coachApi.initializeListeners(mainWindow);

    ipcMain.on('get-version', () => {
        mainWindow.webContents.send('get-version', app.getVersion());
    });

    // ipcMain.on('open-file', (_, path) => {
    //     helper = new HC09Helper();
    //     helper.load(path)
    //         .then(() => {
    //             const readRecordsPromises = [helper.file.DEID.readRecords(), helper.file.TEAM.readRecords()];

    //             Promise.all(readRecordsPromises)
    //                 .then(() => {
    //                     mainWindow.webContents.send('file-loaded', path);
    //                 });
    //         });
    // });

    ipcMain.on(API.CAREER.GET_CAREER_INFO, async () => {
        const readRecordsPromises = [dbEditorService.activeDbHelper.file.DEID.readRecords(), dbEditorService.activeDbHelper.file.TEAM.readRecords()];
        await Promise.all(readRecordsPromises);
        
        const careerInfo = new CareerInfo();
        careerInfo.filePath = dbEditorService.activeDbHelper.filePath;
        careerInfo.teamId = dbEditorService.activeDbHelper.file.DEID.records[0].fields['TGID'].value;
        careerInfo.teamData = dbEditorService.activeDbHelper.file.TEAM.records.map((team) => {
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

    ipcMain.on(API.CAREER.SAVE_CAREER_INFO, (_, careerInfo) => {
        dbEditorService.activeDbHelper.file.DEID.records[0].fields['TGID'].value = careerInfo._teamId;

        dbEditorService.activeDbHelper.save()
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

    ipcMain.on(API.GENERAL.GET_SETTINGS, (options) => {
        const response = new EventResponse(true);
        response.results = settingsHelper.getAllSettings();
        mainWindow.webContents.send(API.GENERAL.GET_SETTINGS, response);
    });

    ipcMain.on(API.GENERAL.SET_SETTING_VALUE, (_, data) => {
        settingsHelper.config.set(data.key, data.value);
    });

    ipcMain.on('open-root-folder', (_, path) => {
        astEditorService.validateRootFolder(path)
            .then(() => {
                astEditorService.openRootFolder(path)
                    .then((rootFiles) => {
                        const response = new EventResponse(true);
                        response._rootFiles = rootFiles;
                        mainWindow.webContents.send('open-root-folder', response);

                        recentFileService.addFile('recentASTFiles', {
                            'path': path, 
                            'type': 'root'
                        });
                    })
                    .catch((err) => {
                        sendErrorResponse(err, 'open-root-folder');
                    })
            })
            .catch((err) => {
                sendErrorResponse(err, 'open-root-folder');                
            });
    });

    ipcMain.on('open-single-ast', (_, path) => {
        astEditorService.openSingleAST(path)
            .then((astFile) => {
                const response = new EventResponse(true);
                response._rootFiles = [astFile];
                mainWindow.webContents.send('open-single-ast', response);

                recentFileService.addFile('recentASTFiles', {
                    'path': path, 
                    'type': 'single'
                });
            })
            .catch((err) => {
                sendErrorResponse(err, 'open-single-ast');
            });
    });

    ipcMain.on('get-ast-child-nodes', (_, options) => {
        const rootNode = options.rootNode;
        const node = options.nodeToLoad;

        if (node.data.type === 'Root AST') {
            astEditorService.readAST(node.data.absolutePath, false, app.getPath('userData'), node.key)
                .then((astFile) => {
                    try {
                        rootNode.data.loaded = true;
                        rootNode.children = astEditorService.parseArchiveFileList(astFile, rootNode);
                        setChangedNodes(node.data.absolutePath, rootNode);

                        const response = new EventResponse(true);
                        response._node = rootNode;
    
                        mainWindow.webContents.send('get-ast-child-nodes', response);
                    }
                    catch (err) {
                        sendErrorResponse(err, 'get-ast-child-nodes');
                    }
                })
                .catch((err) => {
                    sendErrorResponse(err, 'get-ast-child-nodes');
                })
        }
        else {
            astEditorService.readChildAST(node, false, app.getPath('userData'))
                .then((astFile) => {
                    const nodeToSet = getNodeToSetFromRoot(rootNode, node.key);
                    
                    rootNode.data.loaded = true;
                    nodeToSet.data.loaded = true;

                    const dummyRootNode = {
                        'key': rootNode.key,
                        'children': astEditorService.parseArchiveFileList(astFile, rootNode)
                    };

                    const nodeInMappedFiles = getNodeToSetFromRoot(dummyRootNode, node.key);
                    nodeToSet.children = nodeInMappedFiles.children;

                    const rootAST = getActiveRootFromChildNode(node);
                    setChangedNodes(rootAST.absolutePath, rootNode);

                    const response = new EventResponse(true);
                    response._node = rootNode;

                    mainWindow.webContents.send('get-ast-child-nodes', response);
                })
                .catch((err) => {
                    sendErrorResponse(err, 'get-ast-child-nodes');
                })
        }

    });

    function getActiveRootFromChildNode(node) {
        const readPath = node.key.split('_');
        const rootKey = readPath[0];
        return astEditorService.activeASTFiles[rootKey];
    };

    function setChangedNodes(rootPath, rootNode) {
        const changedNodes = changedNodeService.getChangedNodesByPath(rootPath);

        if (changedNodes) {
            changedNodes.forEach((key) => {
                let node = getNodeToSetFromRoot(rootNode, `${rootNode.key}_${key}`);

                if (node) {
                    node.data.isChanged = true;
                }
            });
        }
    };

    function getNodeToSetFromRoot(rootNode, keyToFind) {
        const keyIsChild = keyToFind.indexOf('_') > -1;
        
        if (keyIsChild) {
            const nodesToFind = keyToFind.split('_');

            if (nodesToFind.length > 1) {
                let workingNode = rootNode;

                nodesToFind.slice(1).forEach((nodeKey) => {
                    if (workingNode && workingNode.children && workingNode.children.length > 1) {
                        workingNode = workingNode.children.find((childNode) => {
                            return childNode.key == `${workingNode.key}_${nodeKey}`;
                        });
                    }
                    else {
                        workingNode = undefined;
                    }
                });

                return workingNode;
            }
        }
        else {
            return rootNode;
        }
    };

    ipcMain.on('export-ast-node', (_, data) => {
        astEditorService.exportNode(data.filePath, data.node, {
            'shouldDecompressFile': data.shouldDecompressFile, 
            'convertOptions': data.convertOptions
        })
            .then(() => {
                const response = new EventResponse(true);
                response._filePath = data.filePath;
                mainWindow.webContents.send('export-ast-node', response);
            })
            .catch((err) => {
                sendErrorResponse(err, 'export-ast-node');
            })
    });

    ipcMain.on('import-ast-node', (_, data) => {
        const rootAST = getActiveRootFromChildNode(data.node);
        const nodePathAfterRoot = data.node.key.split('_').slice(1).join('_');

        const nodeHasNotBeenChanged = !changedNodeService.nodeWasChanged(rootAST.absolutePath, nodePathAfterRoot);

        if (nodeHasNotBeenChanged) {
            changedNodeService.addNode(rootAST.absolutePath, nodePathAfterRoot);
            const pathToExportPristineNode = changedNodeService.getHashedNodePath(rootAST.absolutePath, nodePathAfterRoot);
    
            astEditorService.exportNode(pathToExportPristineNode, data.node, {
                'shouldDecompressFile': false
            })
                .then(() => {
                    importNode();
                })
        }
        else {
            importNode();
        }

        function importNode() {
            astEditorService.importNode(data.filePath, data.node, {
                'shouldCompressFile': data.shouldCompressFile, 
                'convertOptions': data.convertOptions
            })
                .then(() => {
                    const response = new EventResponse(true);
                    response._filePath = data.filePath;
                    mainWindow.webContents.send('import-ast-node', response);
                })
                .catch((err) => {
                    sendErrorResponse(err, 'import-ast-node');
                })
        };
    });

    ipcMain.on('revert-node', (_, data) => {
        const rootAST = getActiveRootFromChildNode(data.node);
        const nodePathAfterRoot = data.node.key.split('_').slice(1).join('_');
        const nodeHasChanged = changedNodeService.nodeWasChanged(rootAST.absolutePath, nodePathAfterRoot);

        if (nodeHasChanged) {
            const pathToPristineNode = changedNodeService.getHashedNodePath(rootAST.absolutePath, nodePathAfterRoot);
            astEditorService.importNode(pathToPristineNode, data.node, {
                'shouldCompressFile': false,
                'forceExtractPreview': true
            })
                .then(() => {
                    changedNodeService.removeNode(rootAST.absolutePath, nodePathAfterRoot);
                    const response = new EventResponse(true);
                    mainWindow.webContents.send('revert-node', response);
                })
                .catch((err) => {
                    sendErrorResponse(err, 'revert-node');
                })
        }
        else {
            sendErrorResponse('Node was not changed, cannot revert.', 'revert-node');
        }
    });

    ipcMain.on('get-recent-ast-files', (_, data) => {
        const response = new EventResponse(true);
        response.results = recentFileService.getRecentFilesByCategory('recentASTFiles');
        mainWindow.webContents.send('get-recent-ast-files', response);
    });

    ipcMain.on('remove-recent-ast-file', (_, data) => {
        recentFileService.removeFile('recentASTFiles', data.path);
    });

    ipcMain.on('get-changed-nodes', (_) => {
        let response = new EventResponse(true);
        response.results = {};

        Object.keys(astEditorService.activeASTFiles).forEach((key) => {
            response.results[key.absolutePath] = changedNodeService.getChangedNodesByPath(key.absolutePath);
        });

        mainWindow.webContents.send('get-changed-nodes', response);
    });

    ipcMain.on('get-changed-nodes-by-path', (_, data) => {
        const response = new EventResponse(true);
        response.results = changedNodeService.getChangedNodesByPath(data.path);
        mainWindow.webContents.send('get-changed-nodes-by-path', response);
    });

    astEditorService.eventEmitter.on('progress', (val) => {
        const response = new EventResponse(true);
        response.value = val;
        mainWindow.webContents.send('set-progress-value', response);
    });

    astEditorService.eventEmitter.on('preview', (data) => {
        const response = new EventResponse(true);
        response.data = data;
        mainWindow.webContents.send('preview', response);
    });

    astEditorService.eventEmitter.on('previews-done', () => {
        const response = new EventResponse(true);
        mainWindow.webContents.send('previews-done', response);
    });

    function sendErrorResponse(err, event) {
        log.error(err);
        const response = new EventResponse(false);
        response.errorMessage = err;
        mainWindow.webContents.send(event, response);
    };
};