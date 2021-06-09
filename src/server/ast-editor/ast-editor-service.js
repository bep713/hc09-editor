const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const dxt = require('dxt-js');
const sharp = require('sharp');
const { app } = require('deskgap');
const { v4: uuid } = require('uuid');
const log = require('../../util/logger');
const prettyBytes = require('pretty-bytes');
const EventEmitter = require('events').EventEmitter;
const ASTParser = require('madden-file-tools/streams/ASTParser');
const DDSParser = require('madden-file-tools/streams/DDSParser');
const { pipeline, Transform, Readable, Writable } = require('stream');
const ASTTransformer = require('madden-file-tools/streams/ASTTransformer');

let astService = {};

astService.activeASTFiles = {};
astService.eventEmitter = new EventEmitter();

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
                    return astService.openSingleAST(path.join(absoluteRootPath, fileName), fileName, index);
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

astService.openSingleAST = (astPath, fileName, index) => {
    return new Promise((resolve, reject) => {
        if (!index) {
            index = Object.keys(astService.activeASTFiles).length;
        }
    
        if (!fileName) {
            const splitPaths = astPath.split('\\');
            fileName = splitPaths[splitPaths.length-1];
        }

        fs.promises.stat(astPath)
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
                        'absolutePath': astPath,
                        'loaded': false
                    },
                    'leaf': false
                });
            })
            .catch((err) => {
                reject(err);
            });
    });
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
                    let subtype = null;
    
                    const fileExtensionPicker = new Transform({
                        transform(chunk, enc, cb) {
                            if (fileExtension === '?') {
                                if (chunk[0] === 0x44 && chunk[1] === 0x44 && chunk[2] === 0x53) {
                                    fileExtension = 'dds';
                                    subtype = getCompressionSubtype(chunk);
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
                                    subtype = getCompressionSubtype(chunk);
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

                            function getCompressionSubtype(chunk) {                                
                                switch(chunk[0x57]) {
                                    case 0x31:
                                        return 'DXT1';
                                    case 0x33:
                                        return 'DXT3';
                                    case 0x35:
                                        return 'DXT5';
                                    default:
                                        return 'NONE';
                                }
                            }
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
                            astData.toc.subtype = subtype;
                            
                            let extractPreviewPromise = new Promise((resolve, reject) => {
                                if (extractPreviews && (fileExtension === 'dds' || fileExtension === 'p3r')) {
                                    tempStoreStream.push(null);
                                    astService.extractPreviewImageFromStream(tempStoreStream)
                                        .then((preview) => {
                                            astData.toc.preview = preview;
                                            resolve();
                                        })
                                        .catch((err) => {
                                            log.error(err);
                                            astData.toc.preview = '';
                                            resolve();
                                        });
                                }
                                else {
                                    tempStoreStream = null;
                                    astData.toc.preview = '';
                                    resolve();
                                }
                            });

                            extractPreviewPromise.catch((err) => {
                                log.error(err); 
                            }).finally(() => {
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
                'type': toc.fileExtension ? toc.subtype ? `${toc.fileExtension.toUpperCase()} (${toc.subtype.toUpperCase()})` : toc.fileExtension.toUpperCase() : '?',
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

astService.exportNode = (exportPath, node, shouldDecompressFile, convertOptions) => {
    return new Promise((resolve, reject) => {
        const nodeHierarchy = node.key.split('_');
        const rootASTFile = astService.activeASTFiles[nodeHierarchy[0]];
        const rootStream = fs.createReadStream(rootASTFile.absolutePath);

        const options = {
            'nodeHierarchy': nodeHierarchy.slice(1),
            'total': nodeHierarchy.length,
            'exportPath': exportPath,
            'shouldDecompressFile': shouldDecompressFile,
            'convertOptions': convertOptions
        };
        
        resolve(astService.exportNodeFromStream(rootStream, options));
    });
};

astService.exportNodeFromStream = (stream, options) => {
    return new Promise((resolve, reject) => {
        const newParser = new ASTParser();

        newParser.on('compressed-file', (astData) => {
            if (astData.toc.index == options.nodeHierarchy[0]) {
                astService.eventEmitter.emit('progress', Math.round(((options.total - options.nodeHierarchy.length) / options.total) * 100));

                if (options.nodeHierarchy.length > 1) {
                    resolve(astService.exportNodeFromStream(astData.stream, {
                        total: options.total,
                        nodeHierarchy: options.nodeHierarchy.slice(1),
                        exportPath: options.exportPath,
                        shouldDecompressFile: options.shouldDecompressFile,
                        convertOptions: options.convertOptions
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

                    if (options.convertOptions) {
                        if (options.convertOptions.from === 'P3R' && options.convertOptions.to === 'DDS') {
                            let numberBytesRead = 0;
    
                            pipes.push(new Transform({
                                transform(chunk, enc, cb) {
                                    if (numberBytesRead === 0) {
                                        chunk.writeUInt32BE(0x44445320, 0)
                                    }
    
                                    numberBytesRead += chunk.length;
    
                                    this.push(chunk);
                                    cb();
                                }
                            }))
                        }
                    }

                    pipeline(
                        ...pipes,
                        fs.createWriteStream(options.exportPath),
                        (err) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                astService.eventEmitter.emit('progress', 100);
                                resolve();
                            }
                        }
                    )
                }
            }
        });

        log.profile('read node');

        pipeline(
            stream,
            newParser,
            (err) => {
                if (err) {
                    reject(err);
                }

                log.profile('read node');
            }
        );
    });
};

astService.importNode = (filePath, node, convertOptions) => {
    return new Promise((resolve, reject) => {
        const nodeHierarchy = node.key.split('_');
        const rootASTFile = astService.activeASTFiles[nodeHierarchy[0]];
        const rootStream = fs.createReadStream(rootASTFile.absolutePath);

        // const tempFolder = path.join(app.getPath('userData'), uuid());
        // fs.promises.mkdir(tempFolder)
            // .then(() => {
                const options = {
                    'keyToImport': node.key,
                    'originalNodeHierarchy': nodeHierarchy,
                    'currentNodeHierarchy': nodeHierarchy.slice(1),
                    'importFilePath': filePath,
                    'temporaryStreams': [],
                    'astParserFiles': [],
                    'convertOptions': convertOptions
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
        astService.eventEmitter.emit('progress', (index / ((options.originalNodeHierarchy.length - 1) * 2)) * 100);

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
                        keyToImport: options.keyToImport,
                        originalNodeHierarchy: options.originalNodeHierarchy,
                        currentNodeHierarchy: options.currentNodeHierarchy.slice(1),
                        importFilePath: options.importFilePath,
                        temporaryStreams: options.temporaryStreams,
                        astParserFiles: options.astParserFiles,
                        convertOptions: options.convertOptions
                    }));
                }
                else {
                    const reverseNodeHierarchy = options.originalNodeHierarchy.reverse();

                    resolve(importNode({
                        index: index,
                        total: options.originalNodeHierarchy.length - 1,
                        keyToImport: options.keyToImport,
                        reverseNodeHierarchy: reverseNodeHierarchy,
                        dataToImport: options.importFilePath,
                        astParserFiles: options.astParserFiles,
                        temporaryStreams: options.temporaryStreams,
                        convertOptions: options.convertOptions
                    }))

                    function importNode(options) {
                        return new Promise((resolve, reject) => {
                            astService.eventEmitter.emit('progress', (((options.total - options.index) + options.total) / (options.total * 2)) * 100);

                            if (options.dataToImport instanceof Buffer) {
                                resolve(postReadInputImportNode(options.dataToImport));
                            }
                            else {
                                fs.promises.readFile(options.dataToImport)
                                    .then((importFileBuffer) => {
                                        if (options.convertOptions) {
                                            if (options.convertOptions.from === 'DDS' && options.convertOptions.to === 'P3R') {                        
                                                importFileBuffer.writeUInt32BE(0x70335202, 0);
                                            }
                                        }

                                        const importExtension = path.extname(options.dataToImport);

                                        if (importExtension === '.p3r' || importExtension === '.dds') {
                                            let tempReadStream = new Readable();
                                            tempReadStream._read = () => {};
                                            tempReadStream.push(importFileBuffer);
                                            tempReadStream.push(null);

                                            astService.extractPreviewImageFromStream(tempReadStream)
                                                .then((preview) => {
                                                    astService.eventEmitter.emit('preview', {
                                                        'key': options.keyToImport,
                                                        'preview': preview
                                                    });
                                                })
                                                .catch((err) => {
                                                    console.log(err);
                                                })
                                        }

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
                                                    total: options.total,
                                                    keyToImport: options.keyToImport,
                                                    reverseNodeHierarchy: options.reverseNodeHierarchy.slice(1),
                                                    dataToImport: Buffer.concat(newDataTempBuffers),
                                                    temporaryStreams: options.temporaryStreams,
                                                    astParserFiles: options.astParserFiles,
                                                    convertOptions: options.convertOptions
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

                                                astService.eventEmitter.emit('progress', 100);
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

astService.extractPreviewImageFromStream = (nodeStream) => {
    return new Promise((resolve, reject) => {
        const ddsParser = new DDSParser();

        let imageData;
        
        pipeline(
            nodeStream,
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
                else {
                    
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
                                        resolve(`data:image/webp;base64,${buf.toString('base64')}`);
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

            }
        )
    });
}

module.exports = astService;