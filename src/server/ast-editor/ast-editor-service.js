const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const log = require('../../util/logger');
const prettyBytes = require('pretty-bytes');
const { pipeline, Transform, Readable, Writable } = require('stream');
const ASTParser = require('madden-file-tools/streams/ASTParser');
const ASTTransformer = require('madden-file-tools/streams/ASTTransformer');

let astService = {};

astService.activeASTFiles = {};

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
                }).map((fileName, index) => {
                    return new Promise((resolve, reject) => {
                        fs.promises.stat(path.join(absoluteRootPath, fileName))
                            .then((stats) => {
                                resolve({
                                    'key': `${index}`,
                                    'label': fileName,
                                    'data': {
                                        'index': index,
                                        'name': fileName,
                                        'sizeUnformatted': stats.size ? stats.size : 0,
                                        'size': prettyBytes(stats.size),
                                        'type': 'Root AST',
                                        'description': '',
                                        'absolutePath': path.join(absoluteRootPath, fileName),
                                        'loaded': false
                                    },
                                    'leaf': false
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

astService.readAST = (astAbsolutePath, recursiveRead) => {
    const stream = fs.createReadStream(astAbsolutePath);
    return readASTFromStream(stream, recursiveRead);
};

function readASTFromStream(stream, recursiveRead) {
    return new Promise((resolve, reject) => {
        let readASTCompressedFilePromises = [];

        const parser = new ASTParser();
        parser.extract = true;

        parser.on('compressed-file', (astData) => {
            readASTCompressedFilePromises.push(new Promise((resolve, reject) => {
                let fileExtension = '?';

                const fileExtensionPicker = new Transform({
                    transform(chunk, enc, cb) {
                        if (fileExtension === '?') {
                            if (chunk[0] === 0x44 && chunk[1] === 0x44 && chunk[2] === 0x53) {
                                fileExtension = 'dds';
                            }
                            else if (chunk[0] === 0x44 && chunk[1] === 0x42) {
                                fileExtension = 'db';
                            }
                            else if (chunk[0] === 0x78 && chunk[1] === 0x9C) {
                                fileExtension = 'ftc';
                            }
                            else if (chunk[0] === 0x46 && chunk[1] === 0x72 && chunk[2] === 0x54 && chunk[3] === 0x6B) {
                                fileExtension = 'frt';
                            }
                            else if (chunk[0] === 0x42 && chunk[1] === 0x47 && chunk[2] === 0x46 && chunk[3] === 0x41 && chunk[4] === 0x31) {
                                fileExtension = 'ast';
                            }
                            else if (chunk[0] === 0x1A && chunk[1] === 0x45 && chunk[2] === 0xDF && chunk[3] === 0xA3) {
                                fileExtension = 'webm';
                            }
                            else if (chunk[0] === 0x3C || (chunk[0] === 0xEF && chunk[1] === 0xBB && chunk[2] === 0xBF && chunk[3] === 0x3C)) {
                                fileExtension = 'xml';
                            }
                            else if (chunk[0] === 0x70 && chunk[1] === 0x33 && chunk[2] === 0x52) {
                                fileExtension = 'p3r';
                            }
                            else if (chunk[0] === 0x41 && chunk[1] === 0x70 && chunk[2] === 0x74) {
                                fileExtension = 'apt';
                            }
                            else if (chunk[0] === 0x52 && chunk[1] === 0x53 && chunk[2] === 0x46) {
                                fileExtension = 'rsf';
                            }
                            else if (chunk[0] === 0x45 && chunk[1] === 0x42 && chunk[2] === 0x4F) {
                                fileExtension = 'ebo';
                            }
                            else if (chunk[0] === 0x53 && chunk[1] === 0x43 && chunk[2] === 0x48 && chunk[3] === 0x6C) {
                                fileExtension = 'schl';
                            }
                            else if (chunk[0] === 0x89 && chunk[1] === 0x50 && chunk[2] === 0x4E && chunk[3] === 0x47) {
                                fileExtension = 'png';
                            }
                            else {
                                fileExtension = 'dat';
                            }
                        }
            
                        this.push(chunk);
                        cb();
                    }
                });

                let newASTStream = new Readable();
                newASTStream._read = () => {};

                const isNotCompressed = astData.toc.uncompressedSize.length === 0 || astData.toc.uncompressedSizeInt === 0;
                let pipes = [];

                if (isNotCompressed) {
                    pipes = [
                        astData.stream,
                        fileExtensionPicker,
                        new Transform({
                            transform(chunk, enc, cb) {
                                newASTStream.push(chunk);
                                cb();
                            }
                        }),
                    ];
                }
                else {
                    pipes = [
                        astData.stream,
                        zlib.createInflate(),
                        fileExtensionPicker,
                        new Transform({
                            transform(chunk, enc, cb) {
                                newASTStream.push(chunk);
                                cb();
                            }
                        }),
                    ];
                }

                pipeline(
                    ...pipes,
                    (err) => {
                        if (err) {
                            reject(err);
                        }

                        newASTStream.push(null);

                        astData.toc.fileExtension = fileExtension;

                        if (recursiveRead && fileExtension === 'ast') {
                            readASTFromStream(newASTStream, true)
                                .then((file) => {
                                    astData.toc.file = file;
                                    resolve(parser.file);
                                })
                                .catch((err) => {
                                    reject(err);
                                })
                        }

                        // if (astData.toc === parser.file.tocs[parser.file.tocs.length - 1]) {
                            // resolve(parser.file);
                        // }

                        resolve(parser.file);
                    }
                )
            }));
        });

        pipeline(
            stream,
            parser,
            (err) => {
                if (err) {
                    reject(err);
                }

                Promise.all(readASTCompressedFilePromises)
                    .then(() => {
                        resolve(parser.file);
                    })
                    .catch((err) => {
                        reject(err);
                    })
            }
        );
    });
};

astService.parseArchiveFileList = (astFile, rootNode) => {
    return astFile.tocs.map((toc, index) => {
        let mappedFile = {
            'key': `${rootNode.key}_${toc.index}`,
            'label': `${toc.index.toString('16')} - ${toc.startPositionInt.toString('16').padStart(8, '0')}`,
            'data': {
                'index': toc.index,
                'name': `${toc.index.toString('16')} - ${toc.startPositionInt.toString('16').padStart(8, '0')}`,
                'sizeUnformatted': toc.fileSizeInt ? toc.fileSizeInt : 0,
                'size': prettyBytes(toc.fileSizeInt),
                'type': toc.fileExtension ? toc.fileExtension.toUpperCase() : '?',
                'description': toc.descriptionString,
                'loaded': true,
                'isCompressed': toc.uncompressedSize.length > 0 ? toc.uncompressedSizeInt > 0 : false
            },
            'leaf': toc.fileExtension !== 'ast'
        }

        if (toc.file && toc.file.tocs) {
            mappedFile.children = astService.parseArchiveFileList(toc.file, mappedFile);
        }

        return mappedFile;
    })
};

astService.exportNode = (exportPath, node, shouldDecompressFile) => {
    return new Promise((resolve, reject) => {
        const nodeHierarchy = node.key.split('_');
        const rootASTFile = astService.activeASTFiles[nodeHierarchy[0]];
        const rootStream = fs.createReadStream(rootASTFile.absolutePath);

        const options = {
            'nodeHierarchy': nodeHierarchy.slice(1),
            'exportPath': exportPath,
            'shouldDecompressFile': shouldDecompressFile
        };
        
        resolve(astService.exportNodeFromStream(rootStream, options));
    });
};

astService.exportNodeFromStream = (stream, options) => {
    return new Promise((resolve, reject) => {
        const newParser = new ASTParser();

        newParser.on('compressed-file', (astData) => {
            if (astData.toc.index == options.nodeHierarchy[0]) {
                if (options.nodeHierarchy.length > 1) {
                    resolve(astService.exportNodeFromStream(astData.stream, {
                        nodeHierarchy: options.nodeHierarchy.slice(1),
                        exportPath: options.exportPath,
                        shouldDecompressFile: options.shouldDecompressFile
                    }));
                }
                else {
                    let pipes = [
                        astData.stream
                    ];

                    if (options.shouldDecompressFile) {
                        pipes = [
                            astData.stream,
                            zlib.createInflate()
                        ]
                    }

                    pipeline(
                        ...pipes,
                        fs.createWriteStream(options.exportPath),
                        (err) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve();
                            }
                        }
                    )
                }
            }
        });

        pipeline(
            stream,
            newParser,
            (err) => {
                if (err) {
                    reject(err);
                }
            }
        );
    });
};

astService.importNode = (filePath, node) => {
    return new Promise((resolve, reject) => {
        const nodeHierarchy = node.key.split('_');
        const rootASTFile = astService.activeASTFiles[nodeHierarchy[0]];
        const rootStream = fs.createReadStream(rootASTFile.absolutePath);

        const options = {
            'originalNodeHierarchy': nodeHierarchy,
            'currentNodeHierarchy': nodeHierarchy.slice(1),
            'importFilePath': filePath,
            'astBuffers': [],
            'astParserFiles': []
        };
        
        resolve(astService.importNodeFromStream(rootStream, options));
    });
};

astService.importNodeFromStream = (stream, options) => {
    return new Promise((resolve, reject) => {
        let compressedStreamToReadNext = null;
        let currentASTBuffers = [];

        const newParser = new ASTParser();

        if (options.currentNodeHierarchy.length > 1) {
            newParser.on('compressed-file', (astData) => {
                if (astData.toc.index == options.currentNodeHierarchy[0]) {
                    compressedStreamToReadNext = astData.stream;
                }
            });
        }

        pipeline(
            stream,
            new Transform({
                transform(chunk, enc, cb) {
                    currentASTBuffers.push(chunk);
                    this.push(chunk);
                    cb();
                }
            }),
            newParser,
            (err) => {
                if (err) {
                    reject(err);
                }

                options.astBuffers.push(currentASTBuffers);
                options.astParserFiles.push(newParser);

                if (options.currentNodeHierarchy.length > 1) {
                    resolve(astService.importNodeFromStream(compressedStreamToReadNext, {
                        originalNodeHierarchy: options.originalNodeHierarchy,
                        currentNodeHierarchy: options.currentNodeHierarchy.slice(1),
                        importFilePath: options.importFilePath,
                        astBuffers: options.astBuffers,
                        astParserFiles: options.astParserFiles
                    }));
                }
                else {
                    // read the file to import
                    fs.promises.readFile(options.importFilePath)
                        .then((importFileBuffer) => {
                            const reverseNodeHierarchy = options.originalNodeHierarchy.reverse();

                            resolve(importNode({
                                reverseNodeHierarchy: reverseNodeHierarchy,
                                dataToImport: importFileBuffer,
                                astBuffers: options.astBuffers,
                                astParserFiles: options.astParserFiles
                            }))

                            function importNode(options) {
                                return new Promise((resolve, reject) => {
                                    log.info('Index: ' + options.reverseNodeHierarchy[0]);

                                    const parserToUse = options.astParserFiles.pop();
                                    const tocToImport = parserToUse.file.tocs.find((toc) => { return toc.index == options.reverseNodeHierarchy[0] });
                                    const newDataNeedsCompressed = tocToImport.uncompressedSize.length > 0 && tocToImport.uncompressedSizeInt > 0
                                    
                                    if (newDataNeedsCompressed) {
                                        log.info('needs compressed');
                                        options.dataToImport = zlib.deflateSync(options.dataToImport)
                                    }
                                    
                                    tocToImport.data = options.dataToImport;
                                    
                                    const transformer = new ASTTransformer(parserToUse.file);
                                    
                                    const readable = new Readable();
                                    readable._read = () => {};
                                    
                                    const buffersToReadIn = options.astBuffers.pop();
                                    
                                    buffersToReadIn.forEach((buf) => {
                                        readable.push(buf);
                                    });
                                    
                                    readable.push(null);
                                    
                                    let newDataToImportBuffers = [];

                                    if (options.reverseNodeHierarchy.length > 2) {
                                        pipeline(
                                            readable,
                                            transformer,
                                            new Writable({
                                                write(chunk, enc, cb) {
                                                    newDataToImportBuffers.push(chunk);
                                                    cb();
                                                }
                                            }),
                                            (err) => {
                                                if (err) {
                                                    reject(err);
                                                }

                                                resolve(importNode({
                                                    reverseNodeHierarchy: options.reverseNodeHierarchy.slice(1),
                                                    dataToImport: Buffer.concat(newDataToImportBuffers),
                                                    astBuffers: options.astBuffers,
                                                    astParserFiles: options.astParserFiles
                                                }));
                                            }
                                        )
                                    }
                                    else {
                                        pipeline(
                                            readable,
                                            transformer,
                                            fs.createWriteStream(astService.activeASTFiles[options.reverseNodeHierarchy[1]].absolutePath),
                                            (err) => {
                                                if (err) {
                                                    reject(err);
                                                }

                                                resolve();
                                            }
                                        )
                                    }
                                });
                            };
                        });
                }
            }
        );
    });
};

module.exports = astService;