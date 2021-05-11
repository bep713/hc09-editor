const fs = require('fs');
const path = require('path');
const log = require('../../util/logger');
const prettyBytes = require('pretty-bytes');


let astService = {};

astService.validateRootFolder = (rootPath) => {
    return new Promise((resolve, reject) => {
        fs.promises.access(rootPath)
            .then(() => {
                fs.promises.access(path.join(rootPath, 'PS3_GAME/USRDIR'))
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            })
            .catch((err) => {
                reject(err);
            })
    });
};

astService.openRootFolder = (rootPath) => {
    return new Promise((resolve, reject) => {
        const absoluteRootPath = path.join(rootPath, 'PS3_GAME/USRDIR');

        fs.promises.readdir(absoluteRootPath)
            .then((fileNames) => {
                const rootASTFileStatPromises = fileNames.filter((fileName) => {
                    return fileName.indexOf('.ast') > -1;
                }).map((fileName) => {
                    return new Promise((resolve, reject) => {
                        fs.promises.stat(path.join(absoluteRootPath, fileName))
                            .then((stats) => {
                                resolve({
                                    'data': {
                                        'name': fileName,
                                        'size': prettyBytes(stats.size),
                                        'type': 'AST'
                                    }
                                });
                            })
                            .catch((err) => {
                                reject(err);
                            });
                        });
                });

                Promise.all(rootASTFileStatPromises)
                    .then((rootASTFileData) => {
                        resolve(rootASTFileData);
                    })
                    .catch((err) => {
                        log.error(err);
                    })
            })
            .catch((err) => {
                reject(err);
            });
    })
};

module.exports = astService;