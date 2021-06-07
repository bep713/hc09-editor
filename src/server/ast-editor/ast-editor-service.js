const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const dxt = require('dxt-js');
const sharp = require('sharp');
const { app } = require('deskgap');
const { v4: uuid } = require('uuid');
const log = require('../../util/logger');
const prettyBytes = require('pretty-bytes');
const ASTParser = require('madden-file-tools/streams/ASTParser');
const DDSParser = require('madden-file-tools/streams/DDSParser');
const { pipeline, Transform, Readable, Writable } = require('stream');
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

astService.readAST = (astAbsolutePath, recursiveRead, extractPreviews, key) => {
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(astAbsolutePath);
        readASTFromStream(stream, recursiveRead, extractPreviews)
            .then((astFile) => {
                astService.activeASTFiles[key] = {
                    'absolutePath': astAbsolutePath,
                    'file': astFile,
                    'tempFolderId': astFile.id
                };

                resolve(astFile);
            })
    });
};

astService.readChildAST = (childNode, recursiveRead, temporaryOutputBasePath) => {
    // Get root AST from key
    const readPath = childNode.key.split('_');
    const rootKey = readPath[0];
    const rootAST = astService.activeASTFiles[rootKey];
    const rootStream = fs.createReadStream(rootAST.absolutePath);

    return readASTFromStream(rootStream, recursiveRead, temporaryOutputBasePath, readPath.slice(1));
};

function readASTFromStream(stream, recursiveRead, extractPreviews, readPathAfterRoot) {
    return new Promise((resolve, reject) => {
        let readASTCompressedFilePromises = [];

        const parser = new ASTParser();
        parser.extract = true;

        parser.file.id = uuid();

        parser.on('compressed-file', (astData) => {
            if (!readPathAfterRoot || readPathAfterRoot.length === 0 || (readPathAfterRoot && astData.toc.index == readPathAfterRoot[0])) {
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
    
                    let tempStoreStream = new Readable();
                    tempStoreStream._read = () => {};
    
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
    
                                    if (extractPreviews) {
                                        tempStoreStream.push(chunk);
                                    }
    
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

                            let extractPreviewPromise = new Promise((resolve, reject) => {
                                if (extractPreviews && fileExtension === 'dds') {
                                    tempStoreStream.push(null);
                                    
                                    const ddsParser = new DDSParser();
                                    let imageData;
                                    
                                    pipeline(
                                        tempStoreStream,
                                        ddsParser,
                                        new Transform({
                                            transform(chunk, enc, cb) {
                                                if (this.ddsData === undefined) { 
                                                    this.ddsData = chunk;
                                                }
                                                else { 
                                                    this.ddsData = Buffer.concat([this.ddsData, chunk]);
                                                }
        
                                                cb();
                                            },
                                            flush(cb) {
                                                if (Object.keys(ddsParser._file.header).length > 0) {
                                                    let flag = null;
                                                    
                                                    switch(ddsParser._file.header.format) {
                                                        case 'dxt1':
                                                            flag = dxt.flags.DXT1;
                                                            break;
                                                        case 'dxt3':
                                                            flag = dxt.flags.DXT3;
                                                            break;
                                                        case 'dxt5':
                                                            flag = dxt.flags.DXT5;
                                                            break;
                                                        default:
                                                            flag = 'uncompressed';
                                                            break;
                                                    }
        
                                                    if (flag === 'uncompressed') {
                                                        // Transform DDS data from BGRA to RGBA
                                                        for (let i = ddsParser._file.header.images[0].offset; i < this.ddsData.length; i += 4) {
                                                            const temp = this.ddsData[i];
                                                            this.ddsData[i] = this.ddsData[i+2];
                                                            this.ddsData[i+2] = temp;
                                                        }
        
                                                        imageData = this.ddsData.slice(ddsParser._file.header.images[0].offset);
                                                    }
                                                    else {
                                                        const compressedBuffer = new Uint8Array(this.ddsData.slice(ddsParser._file.header.images[0].offset));
                                                        imageData = Buffer.from(dxt.decompress(compressedBuffer, ddsParser._file.header.width, ddsParser._file.header.height, flag));
                                                    }
                                                }
        
                                                cb();
                                            }
                                        }),
                                        (err) => {
                                            if (err) {
                                                log.error(err);
                                                reject(err);
                                            }
        
                                            if (imageData) {
                                                try {
                                                    sharp(imageData, {
                                                        'raw': {
                                                            'width': ddsParser._file.header.width,
                                                            'height': ddsParser._file.header.height,
                                                            'channels': 4
                                                        }
                                                    })
                                                        .webp()
                                                        .toBuffer()
                                                            .then((buf) => {
                                                                astData.toc.preview = `data:image/webp;base64,${buf.toString('base64')}`;
                                                                resolve();
                                                            })
                                                            .catch((err) => {
                                                                log.error(err);
                                                                reject(err);
                                                            })
                                                }
                                                catch (err) {
                                                    log.error(err);
                                                    reject(err);
                                                }
                                            }
                                            else {
                                                resolve();
                                            }
                                        }
                                    )
                                }
                                else {
                                    tempStoreStream = null;
                                    astData.toc.preview = '';
                                    resolve();
                                }
                            });

                            extractPreviewPromise.then(() => {
                                if (readPathAfterRoot && readPathAfterRoot.length > 0) {
                                    readASTFromStream(newASTStream, recursiveRead, extractPreviews, readPathAfterRoot.slice(1))
                                        .then((file) => {
                                            astData.toc.file = file;
                                            resolve(parser.file);
                                        })
                                        .catch((err) => {
                                            reject(err);
                                        });
                                }
                                else if (recursiveRead && fileExtension === 'ast') {
                                    readASTFromStream(newASTStream, true, extractPreviews)
                                        .then((file) => {
                                            astData.toc.file = file;
                                            resolve(parser.file);
                                        })
                                        .catch((err) => {
                                            reject(err);
                                        });
                                }
                                else {
                                    resolve(parser.file);
                                }
                            })
    
                        }
                    )
                }));
            }
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
                'loaded': toc.fileExtension === 'ast' ? (toc.file !== null && toc.file !== undefined) : true,
                'isCompressed': toc.uncompressedSize.length > 0 ? toc.uncompressedSizeInt > 0 : false,
                'previewLocation': toc.preview ? toc.preview : ''
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

                    if (options.shouldDecompressFile && astData.toc.isCompressed) {
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

        // const tempFolder = path.join(app.getPath('userData'), uuid());
        // fs.promises.mkdir(tempFolder)
            // .then(() => {
                const options = {
                    'originalNodeHierarchy': nodeHierarchy,
                    'currentNodeHierarchy': nodeHierarchy.slice(1),
                    'importFilePath': filePath,
                    'temporaryStreams': [],
                    'astParserFiles': []
                };
                
                astService.importNodeFromStream(rootStream, options)
                    .then(() => {
                        // fs.promises.rmdir(tempFolder, { force: true, recursive: true })
                            // .then(() => {
                                resolve();
                            // })
                            // .catch((err) => {
                                // log.error('There was a problem removing the temporary folder: ' + err);
                                // resolve();
                            // });
                    });
            })
            .catch((err) => {
                log.error(err);
            })

    // });
};

astService.importNodeFromStream = (stream, options) => {
    return new Promise((resolve, reject) => {
        let compressedStreamToReadNext = null;
        const newParser = new ASTParser();
        let tempStream = new Readable();
        tempStream._read = () => {};

        const index = options.originalNodeHierarchy.length - options.currentNodeHierarchy.length;
        // const writeStream = fs.createWriteStream(path.join(options.temporaryFolderPath, `${index}.temp`));

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
                    tempStream.push(chunk);
                    this.push(chunk);
                    cb();
                }
            }),
            newParser,
            (err) => {
                if (err) {
                    reject(err);
                }

                // writeStream.end();
                tempStream.push(null);

                options.temporaryStreams.push(tempStream);
                options.astParserFiles.push(newParser);

                if (options.currentNodeHierarchy.length > 1) {
                    resolve(astService.importNodeFromStream(compressedStreamToReadNext, {
                        originalNodeHierarchy: options.originalNodeHierarchy,
                        currentNodeHierarchy: options.currentNodeHierarchy.slice(1),
                        importFilePath: options.importFilePath,
                        temporaryStreams: options.temporaryStreams,
                        astParserFiles: options.astParserFiles
                    }));
                }
                else {
                    const reverseNodeHierarchy = options.originalNodeHierarchy.reverse();

                    resolve(importNode({
                        index: index,
                        reverseNodeHierarchy: reverseNodeHierarchy,
                        dataToImport: options.importFilePath,
                        astParserFiles: options.astParserFiles,
                        temporaryStreams: options.temporaryStreams
                    }))

                    function importNode(options) {
                        return new Promise((resolve, reject) => {
                            if (options.dataToImport instanceof Buffer) {
                                resolve(postReadInputImportNode(options.dataToImport));
                            }
                            else {
                                fs.promises.readFile(options.dataToImport)
                                    .then((importFileBuffer) => {
                                        resolve(postReadInputImportNode(importFileBuffer));
                                    });
                            }
                                
                            function postReadInputImportNode(importFileBuffer) {
                                return new Promise((resolve, reject) => {
                                    const tempStreamToUse = options.temporaryStreams.pop();
                                    const parserToUse = options.astParserFiles.pop();
                                    const tocToImport = parserToUse.file.tocs.find((toc) => { return toc.index == options.reverseNodeHierarchy[0] });
                                    const newDataNeedsCompressed = tocToImport.uncompressedSize.length > 0 && tocToImport.uncompressedSizeInt > 0
                                    
                                    if (newDataNeedsCompressed) {
                                        importFileBuffer = zlib.deflateSync(importFileBuffer)
                                    }
                                    
                                    tocToImport.data = importFileBuffer;
                                    
                                    // const newDataOutputTempPath = path.join(options.temporaryFolderPath, `${options.index}.NEW.temp`);
                                    let newDataTempBuffers = [];
                                    const transformer = new ASTTransformer(parserToUse.file);
    
                                    if (options.reverseNodeHierarchy.length > 2) {
                                        pipeline(
                                            tempStreamToUse,
                                            transformer,
                                            new Transform({
                                                transform(chunk, enc, cb) {
                                                    newDataTempBuffers.push(chunk);
                                                    cb();
                                                }
                                            }),
                                            (err) => {
                                                if (err) {
                                                    reject(err);
                                                }
    
                                                resolve(importNode({
                                                    index: options.index - 1,
                                                    reverseNodeHierarchy: options.reverseNodeHierarchy.slice(1),
                                                    dataToImport: Buffer.concat(newDataTempBuffers),
                                                    temporaryStreams: options.temporaryStreams,
                                                    astParserFiles: options.astParserFiles
                                                }));
                                            }
                                        )
                                    }
                                    else {
                                        pipeline(
                                            tempStreamToUse,
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
            }
        );
    });
};

module.exports = astService;