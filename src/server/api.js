const path = require('path');
const log = require('../util/logger');
const { app, ipcMain } = require('deskgap');
const CareerInfo = require('./model/CareerInfo');
const EventResponse = require('./model/EventResponse');
const recentFileService = require('./recentFilesService');
const HC09Helper = require('madden-file-tools/helpers/HC09Helper');
const astEditorService = require('./ast-editor/ast-editor-service');

let helper;

recentFileService.initialize();

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

    ipcMain.on('open-root-folder', (_, path) => {
        astEditorService.validateRootFolder(path)
            .then(() => {
                astEditorService.openRootFolder(path)
                    .then((rootFiles) => {
                        const response = new EventResponse(true);
                        response._rootFiles = rootFiles;
                        mainWindow.webContents.send('open-root-folder', response);

                        recentFileService.addFile(path, 'root');
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

                recentFileService.addFile(path, 'single');
            })
            .catch((err) => {
                sendErrorResponse(err, 'open-single-ast');
            });
    });

    ipcMain.on('get-ast-child-nodes', (_, options) => {
        log.profile('get child nodes');

        const rootNode = options.rootNode;
        const node = options.nodeToLoad;

        if (node.data.type === 'Root AST') {
            astEditorService.readAST(node.data.absolutePath, false, app.getPath('userData'), node.key)
                .then((astFile) => {
                    try {
                        rootNode.data.loaded = true;
                        rootNode.children = astEditorService.parseArchiveFileList(astFile, rootNode);
                        const response = new EventResponse(true);
                        response._node = rootNode;
                        log.profile('get child nodes');
    
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
                    log.info('after read child');
                    const nodeToSet = getNodeToSetFromRoot(rootNode, node.key);
                    
                    rootNode.data.loaded = true;
                    nodeToSet.data.loaded = true;

                    const dummyRootNode = {
                        'key': rootNode.key,
                        'children': astEditorService.parseArchiveFileList(astFile, rootNode)
                    };

                    const nodeInMappedFiles = getNodeToSetFromRoot(dummyRootNode, node.key);
                    nodeToSet.children = nodeInMappedFiles.children;

                    const response = new EventResponse(true);
                    response._node = rootNode;
                    log.profile('get child nodes');

                    mainWindow.webContents.send('get-ast-child-nodes', response);
                })
                .catch((err) => {
                    sendErrorResponse(err, 'get-ast-child-nodes');
                })
        }

    });

    function getNodeToSetFromRoot(rootNode, keyToFind) {
        const keyIsChild = keyToFind.indexOf('_') > -1;
        
        if (keyIsChild) {
            const nodesToFind = keyToFind.split('_');

            if (nodesToFind.length > 1) {
                let workingNode = rootNode;

                nodesToFind.slice(1).forEach((nodeKey) => {
                    workingNode = workingNode.children.find((childNode) => {
                        return childNode.key == `${workingNode.key}_${nodeKey}`;
                    });
                });

                return workingNode;
            }
        }
        else {
            return rootNode;
        }
    };

    ipcMain.on('export-ast-node', (_, data) => {
        astEditorService.exportNode(data.filePath, data.node, data.shouldDecompressFile)
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
        astEditorService.importNode(data.filePath, data.node)
            .then(() => {
                const response = new EventResponse(true);
                response._filePath = data.filePath;
                mainWindow.webContents.send('import-ast-node', response);
            })
            .catch((err) => {
                sendErrorResponse(err, 'import-ast-node');
            })
    });

    ipcMain.on('get-recent-files', (_, data) => {
        const response = new EventResponse(true);
        response.results = recentFileService.getRecentFiles();
        mainWindow.webContents.send('get-recent-files', response);
    });

    ipcMain.on('remove-recent-file', (_, data) => {
        recentFileService.removeFile(data.path);
    });

    astEditorService.eventEmitter.on('progress', (val) => {
        const response = new EventResponse(true);
        response.value = val;
        mainWindow.webContents.send('set-progress-value', response);
    });

    function sendErrorResponse(err, event) {
        log.error(err);
        const response = new EventResponse(false);
        response.errorMessage = err;
        mainWindow.webContents.send(event, response);
    };
};