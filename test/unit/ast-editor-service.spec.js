const fs = require('fs');
const path = require('path');
const sinon = require('sinon');
const crypto = require('crypto');
const expect = require('chai').expect;
const proxyquire = require('proxyquire').noCallThru();

const deskgapMock = {
    'app': {
        'getPath': sinon.spy(() => { return 'test'; })
    }
};

const astEditorService = proxyquire('../../src/server/editors/ast-editor-service', {
    'deskgap': deskgapMock
});

const testDataRoot = path.join(__dirname, '../data');
const hc09BootPath = 'D:\\Media\\Games\\NFL Head Coach 09 [U] [BLUS-30128]\\PS3_GAME\\USRDIR\\qkl_boot.ast';
const hc09StreamPath = 'D:\\Media\\Games\\NFL Head Coach 09 [U] [BLUS-30128]\\PS3_GAME\\USRDIR\\qkl_stream.ast';

describe('ast editor service unit tests', () => {
    let result = null;
    let previews = [];

    describe('read ast (non-recursive)', () => {
        let progressUpdates = [];

        before((done) => {
            astEditorService.eventEmitter.on('preview', (data) => {
                previews.push(data);
            });

            astEditorService.eventEmitter.once('previews-done', () => {
                astEditorService.eventEmitter.removeAllListeners('preview');
                done();
            });

            console.time('read');

            astEditorService.eventEmitter.on('progress', (value) => {
                progressUpdates.push(value);
            });

            astEditorService.readAST(hc09BootPath, false, true, 0)
                .then((astFile) => {
                    console.timeEnd('read');
                    astEditorService.eventEmitter.removeAllListeners('progress');
                    result = astFile;
                });
        });

        baseBootASTTests();

        it('does not read children if recursive read is set to false', () => {
            expect(result.tocs[0xe].file).to.be.undefined;
        });

        it('will emit progress while reading a node', function () {
            this.timeout(3000);

            const numberOfTocs = result.tocs.length;

            let expectedProgressUpdates = result.tocs.map((toc, index) => {
                return Math.floor(((index+1) / numberOfTocs) * 100);
            });

            expect(progressUpdates).to.eql(expectedProgressUpdates);
        });

        describe('previews', () => {
            it('contains correct count', () => {
                expect(previews.length).to.equal(45);
            });

            it('0xf (p3r) contains correct preview', () => {
                const f = previews.find((preview) => {
                    return preview.key === '0_15';
                });

                expect(f).to.not.be.undefined;
                expect(f.preview).to.eql('data:image/webp;base64,UklGRjAAAABXRUJQVlA4ICQAAADQAgCdASogACAAPm0cmUmkISMhlACADYlpAABF7KAAAAAAAAA=');
            });

            it('0x15 (dds) contains correct preview', () => {
                const result = previews.find((preview) => {
                    return preview.key === '0_21';
                });

                expect(result).to.not.be.undefined;
                expect(result.preview).to.eql('data:image/webp;base64,UklGRjIAAABXRUJQVlA4ICYAAADQAgCdASogACAAPm00lkekIyIhKAgAgA2JaQAAPaOgAP7gAAAAAA==');
            });
        });

        describe('can read a child AST after reading in the root', () => {
            let childAst = null;
            let childPreviews = [];
            let childProgressUpdates = [];

            before((done) => {
                let promises = [];

                astEditorService.readAST(hc09BootPath, false, true, 0)
                    .then(() => {
                        astEditorService.eventEmitter.on('progress', (value) => {
                            childProgressUpdates.push(value);
                        });

                        promises.push(new Promise((resolve, reject) => {
                            astEditorService.eventEmitter.on('preview', (data) => {
                                childPreviews.push(data);
                                resolve();
                            });
                        }));

                        promises.push(new Promise((resolve, reject) => {
                            astEditorService.readChildAST({
                                'key': '0_672'
                            }, false, true)
                                .then((astFile) => {
                                    childAst = astFile.tocs[672].file;
                                    resolve();
                                })
                        }));
                        
                        Promise.all(promises)
                            .then(() => {
                                astEditorService.eventEmitter.removeAllListeners('preview');
                                astEditorService.eventEmitter.removeAllListeners('progress');
                                done();
                            });
                    });
            });

            it('DDS', () => {
                const firstIndex = childAst.tocs.find((toc) => { return toc.index === 0; });
                expect(firstIndex.fileExtension).to.eql('dds');
            });

            it('DAT', () => {
                const secondIndex = childAst.tocs.find((toc) => { return toc.index === 1; });
                expect(secondIndex.fileExtension).to.eql('dat');
            });

            it('APT', () => {
                const thirdIndex = childAst.tocs.find((toc) => { return toc.index === 2; });
                expect(thirdIndex.fileExtension).to.eql('apt');
            });

            it('will emit progress while reading a child node', function () {
                this.timeout(3000);
    
                let expectedProgressUpdates = [25, 50, 75, 100];
                expect(childProgressUpdates).to.eql(expectedProgressUpdates);
            });

            describe('previews', () => {
                it('contains correct count', () => {
                    expect(childPreviews.length).to.equal(1);
                });

                it('0x0 (dds) contains correct preview', () => {
                    expect(childPreviews[0].key).to.equal('0_672_0');
                    expect(childPreviews[0].preview).to.eql('data:image/webp;base64,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');
                });
            });
        });
    });

    // Disabled as it is very slow

    // describe('read ast (recursive)', () => {
    //     let result = null;

    //     before(function(done) {
    //         this.timeout(60000);

    //         astEditorService.readAST(hc09BootPath, true, true, 0)
    //             .then((astFile) => {
    //                 result = astFile;
    //                 done();
    //             })
    //             .catch((err) => {
    //                 done(err);
    //             })
    //     })

    //     baseBootASTTests();

    //     describe('extracts children', () => {
    //         describe('first toc', () => {
    //             it('number of results', () => {
    //                 expect(result.tocs[0xe].file.tocs.length).to.equal(156);
    //             });

    //             it('file extension', () => {
    //                 expect(result.tocs[0x2b1].file.tocs[0].fileExtension).to.equal('dds');
    //             });

    //             it('preview', () => {
    //                 const brownsLogo = result.tocs[0x2b0].file.tocs.find((toc) => {
    //                     return toc.index === 3;
    //                 });

    //                 expect(brownsLogo.preview).to.equal('data:image/webp;base64,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');
    //             });
    //         });
    //     });
    // });

    describe('export', () => {
        before((done) => {
            astEditorService.readAST(hc09BootPath, false, true, 0)
                .then((astFile) => {
                    result = astFile;
                    done();
                })
        });
        
        it('can export a file in the root AST', (done) => {
            astEditorService.exportNode(path.join(testDataRoot, 'export/244-compare.dat'), {
                'key': '0_244'
            }, {
                'shouldDecompressFile': true
            })
                .then(() => {
                    const pristineFile = fs.readFileSync(path.join(testDataRoot, 'export/244-pristine.dat'));
                    const compareFile = fs.readFileSync(path.join(testDataRoot, 'export/244-compare.dat'));

                    testBufferHashes(compareFile, pristineFile);
                    done();
                })
                .catch((err) => {
                    done(err);
                })
        });

        it('can export a file within many AST layers', (done) => {
            astEditorService.exportNode(path.join(testDataRoot, 'export/689_4-compare.dds'), {
                'key': '0_689_4'
            }, {
                'shouldDecompressFile': true
            })
                .then(() => {
                    const pristineFile = fs.readFileSync(path.join(testDataRoot, 'export/689_4-pristine.dds'));
                    const compareFile = fs.readFileSync(path.join(testDataRoot, 'export/689_4-compare.dds'));

                    testBufferHashes(compareFile, pristineFile);
                    done();
                })
                .catch((err) => {
                    done(err);
                })
        });

        it('will emit progress updates while exporting a node', (done) => {
            let progressUpdates = [];

            astEditorService.eventEmitter.on('progress', (value) => {
                progressUpdates.push(value);
            });

            astEditorService.exportNode(path.join(testDataRoot, 'export/689_4-compare.dds'), {
                'key': '0_689_4'
            }, {
                'shouldDecompressFile': true
            })
                .then(() => {
                    expect(progressUpdates).to.eql([33, 67, 100]);
                    done();
                })
                .catch((err) => {
                    done(err);
                })
        });

        it('can export a file from the original AST after reading in a second AST', function (done) {
            this.timeout(10000);

            astEditorService.readAST(hc09StreamPath, false, true, 1)
                .then(() => {
                    astEditorService.exportNode(path.join(testDataRoot, 'export/689_4-compare-2.dds'), {
                        'key': '0_689_4'
                    }, {
                        'shouldDecompressFile': true
                    })
                        .then(() => {
                            const pristineFile = fs.readFileSync(path.join(testDataRoot, 'export/689_4-pristine.dds'));
                            const compareFile = fs.readFileSync(path.join(testDataRoot, 'export/689_4-compare-2.dds'));
        
                            testBufferHashes(compareFile, pristineFile);
                            done();
                        })
                        .catch((err) => {
                            done(err);
                        })
                })
                .catch((err) => {
                    done(err);
                })
        });

        it('will not attempt to decompress if the file is not compressed to begin with', (done) => {
            astEditorService.exportNode(path.join(testDataRoot, 'export/66_1-compare.rsf'), {
                'key': '1_66_1'
            }, {
                'shouldDecompressFile': true
            })
                .then(() => {
                    const pristineFile = fs.readFileSync(path.join(testDataRoot, 'export/66_1-pristine.rsf'));
                    const compareFile = fs.readFileSync(path.join(testDataRoot, 'export/66_1-compare.rsf'));

                    testBufferHashes(compareFile, pristineFile);
                    done();
                })
                .catch((err) => {
                    done(err);
                })
        });

        it('can export an uncompressed version of a file', (done) => {
            astEditorService.exportNode(path.join(testDataRoot, 'export/689_4-compare-uncompressed.dat'), {
                'key': '0_689_4'
            }, {
                'shouldDecompressFile': false
            })
                .then(() => {
                    const compareFile = fs.readFileSync(path.join(testDataRoot, 'export/689_4-compare-uncompressed.dat'));
                    expect(compareFile[0] === 0x79 && compareFile[1] === 0xDA);
                    done();
                })
                .catch((err) => {
                    done(err);
                })
        });

        it('can convert a p3r to a dds and export the dds', (done) => {
            astEditorService.exportNode(path.join(testDataRoot, 'export/0_15-compare.dds'), 
            {
                'key': '0_15'
            }, 
            {
                'shouldDecompressFile': true,
                'convertOptions': {
                    'to': 'DDS',
                    'from': 'P3R'
                }
            })
                .then(() => {
                    const pristineFile = fs.readFileSync(path.join(testDataRoot, 'export/0_15-pristine.dds'));
                    const compareFile = fs.readFileSync(path.join(testDataRoot, 'export/0_15-compare.dds'));
                    testBufferHashes(compareFile, pristineFile);
                    done();
                })
                .catch((err) => {
                    done(err);
                })
        });

        it('can convert a p3r to a dds and export the dds - through many AST levels', (done) => {
            astEditorService.exportNode(path.join(testDataRoot, 'export/0_648_17-compare.dds'), 
            {
                'key': '0_648_17'
            }, 
            {
                'shouldDecompressFile': true,
                'convertOptions': {
                    'to': 'DDS',
                    'from': 'P3R'
                }
            })
                .then(() => {
                    const pristineFile = fs.readFileSync(path.join(testDataRoot, 'export/0_648_17-pristine.dds'));
                    const compareFile = fs.readFileSync(path.join(testDataRoot, 'export/0_648_17-compare.dds'));
                    testBufferHashes(compareFile, pristineFile);
                    done();
                })
                .catch((err) => {
                    done(err);
                })
        });
    });

    describe('import', () => {
        const importDataRoot = path.join(testDataRoot, 'import');

        before((done) => {
            astEditorService.readAST(hc09BootPath, false, true, 0)
                .then((astFile) => {
                    result = astFile;
                    done();
                })
        });

        it('can import a file to the root', function (done) {
            this.timeout(10000);

            const pathToNodeToImport = path.join(importDataRoot, 'configModified.dat');
            const pathToExport = path.join(importDataRoot, '0_0-compare.dat');

            astEditorService.importNode(pathToNodeToImport, 
            {
                'key': '0_0'
            }, 
            {
                'shouldCompressFile': true
            })
                .then(() => {
                    expect(astEditorService.activeASTFiles[0].file.tocs.length).to.equal(727);

                    astEditorService.exportNode(pathToExport, {
                        'key': '0_0'
                    }, {
                        'shouldDecompressFile': true
                    })
                        .then(() => {
                            const pristineFile = fs.readFileSync(pathToNodeToImport);
                            const compareFile = fs.readFileSync(pathToExport);

                            testBufferHashes(compareFile, pristineFile);
                            done();
                        })
                        .catch((err) => {
                            done(err);
                        })
                })
                .catch((err) => {
                    done(err);
                })
        });

        it('can import a file nested in the ASTs', function (done) {
            this.timeout(10000);

            astEditorService.readChildAST({
                'key': '0_670'
            }, false, true)
                .then(() => {
                    const pathToNodeToImport = path.join(importDataRoot, 'brownsLogoModified.dds');
                    const pathToExport = path.join(importDataRoot, '0_670_13-compare.dds');

                    astEditorService.importNode(pathToNodeToImport, {
                        'key': '0_670_13'
                    }, {
                        'shouldCompressFile': true
                    })
                        .then(() => {
                            astEditorService.exportNode(pathToExport, {
                                'key': '0_670_13'
                            }, {
                                'shouldDecompressFile': true
                            })
                            .then(() => {
                                    const pristineFile = fs.readFileSync(pathToNodeToImport);
                                    const compareFile = fs.readFileSync(pathToExport);

                                    testBufferHashes(compareFile, pristineFile);
                                    done();
                                })
                                .catch((err) => {
                                    done(err);
                                })
                        })
                        .catch((err) => {
                            done(err);
                        })
                })
        });

        it('can import two files without reloading the AST', function (done) {
            this.timeout(10000);

            astEditorService.readChildAST({
                'key': '0_670'
            }, false, true)
                .then(() => {
                    const pathToNodeToImport = path.join(importDataRoot, 'brownsLogoModified.dds');
                    const secondPathToNodeToImport = path.join(importDataRoot, '0_670_5-modified.dds');
                    const pathToExport = path.join(importDataRoot, '0_670_13-compare.dds');
                    const secondPathToExport = path.join(importDataRoot, '0_670_5-compare.dds');

                    astEditorService.importNode(pathToNodeToImport, {
                        'key': '0_670_13'
                    }, {
                        'shouldCompressFile': true
                    })
                        .then(() => {
                            astEditorService.importNode(secondPathToNodeToImport, {
                                'key': '0_670_5'
                            }, {
                                'shouldCompressFile': true
                            })
                            .then(() => {
                                astEditorService.exportNode(pathToExport, {
                                    'key': '0_670_13'
                                }, {
                                    'shouldDecompressFile': true
                                })
                                    .then(() => {
                                        astEditorService.exportNode(secondPathToExport, {
                                            'key': '0_670_5'
                                        }, {
                                            'shouldDecompressFile': true
                                        })
                                            .then(() => {
                                                const pristineFile = fs.readFileSync(pathToNodeToImport);
                                                const compareFile = fs.readFileSync(pathToExport);
            
                                                testBufferHashes(compareFile, pristineFile);

                                                const pristineSecondFile = fs.readFileSync(secondPathToNodeToImport);
                                                const compareSecondFile = fs.readFileSync(secondPathToExport);
            
                                                testBufferHashes(compareSecondFile, pristineSecondFile);
                                                done();
                                            });
                                    })
                                })
                                .catch((err) => {
                                    done(err);
                                })
                        })
                        .catch((err) => {
                            done(err);
                        })
                })
        });

        it('can convert dds to p3r and import a file to the root', function (done) {
            this.timeout(10000);

            const pathToNodeToImport = path.join(importDataRoot, '0_15-pristine-to-import.dds');
            const pathToExport = path.join(importDataRoot, '0_15-compare.p3r');

            astEditorService.importNode(pathToNodeToImport, {
                'key': '0_15'
            }, 
            {
                'shouldCompressFile': true,
                'convertOptions': {
                    'from': 'DDS',
                    'to': 'P3R'
                }
            })
                .then(() => {
                    astEditorService.exportNode(pathToExport, {
                        'key': '0_15'
                    }, {
                        'shouldDecompressFile': true
                    })
                        .then(() => {
                            const pristineFile = fs.readFileSync(path.join(importDataRoot, '0_15-pristine.p3r'));
                            const compareFile = fs.readFileSync(pathToExport);

                            testBufferHashes(compareFile, pristineFile);
                            done();
                        })
                        .catch((err) => {
                            done(err);
                        })
                })
                .catch((err) => {
                    done(err);
                })
        });

        it('can convert dds to p3r and import a file nested in the ASTs', function (done) {
            this.timeout(10000);

            astEditorService.readChildAST({
                'key': '0_648'
            }, false, true)
                .then(() => {
                    const pathToNodeToImport = path.join(importDataRoot, '0_648_17-pristine-to-import.dds');
                    const pathToExport = path.join(importDataRoot, '0_648-17-compare.p3r');

                    astEditorService.importNode(pathToNodeToImport, {
                        'key': '0_648_17'
                    }, 
                    {
                        'shouldCompressFile': true,
                        'convertOptions': {
                            'from': 'DDS',
                            'to': 'P3R'
                        }
                    })
                        .then(() => {
                            astEditorService.exportNode(pathToExport, {
                                'key': '0_648_17'
                            }, {
                                'shouldDecompressFile': true
                            })
                            .then(() => {
                                    const pristineFile = fs.readFileSync(path.join(importDataRoot, '0_648_17-pristine.p3r'));
                                    const compareFile = fs.readFileSync(pathToExport);

                                    testBufferHashes(compareFile, pristineFile);
                                    done();
                                })
                                .catch((err) => {
                                    done(err);
                                })
                        })
                        .catch((err) => {
                            done(err);
                        })
                })
        });

        it('will emit a new preview image after importing a dds', function (done) {
            this.timeout(10000);

            astEditorService.readChildAST({
                'key': '0_648'
            }, false, false)
                .then(() => {
                    const pathToNodeToImport = path.join(importDataRoot, '0_648_17-pristine-to-import.dds');

                    astEditorService.eventEmitter.once('preview', (data) => {
                        expect(data.key).to.equal('0_648_17');
                        expect(data.preview.substring(0, 23)).to.equal('data:image/webp;base64,');
                        done();
                    });

                    astEditorService.importNode(pathToNodeToImport, 
                    {
                        'key': '0_648_17'
                    }, 
                    {
                        'shouldCompressFile': true,
                        'convertOptions': {
                            'from': 'DDS',
                            'to': 'P3R'
                        }
                    });
                })
        });

        it('will emit a new preview image after importing a p3r', function (done) {
            this.timeout(10000);

            astEditorService.readChildAST({
                'key': '0_648'
            }, false, true)
                .then(() => {
                    const pathToNodeToImport = path.join(importDataRoot, '0_648_17-pristine.p3r');

                    astEditorService.eventEmitter.once('preview', (data) => {
                        expect(data.key).to.equal('0_648_17');
                        expect(data.preview.substring(0, 23)).to.equal('data:image/webp;base64,');
                    });

                    astEditorService.importNode(pathToNodeToImport, 
                    {
                        'key': '0_648_17'
                    },
                    {
                        'shouldCompressFile': true
                    })
                        .then(() => {
                            done();
                        })
                })
        });

        it('will emit progress updates while importing a node', function (done) {
            this.timeout(3000);

            astEditorService.readChildAST({
                'key': '0_648'
            }, false, true)
                .then(() => {
                    const pathToNodeToImport = path.join(importDataRoot, '0_648_17-pristine.p3r');

                    let progressUpdates = [];

                    astEditorService.eventEmitter.on('progress', (value) => {
                        progressUpdates.push(value);
                    });

                    astEditorService.importNode(pathToNodeToImport, {
                        'key': '0_648_17'
                    }, {
                        'shouldCompressFile': true
                    })
                        .then(() => {
                            astEditorService.eventEmitter.removeAllListeners('progress');
                            expect(progressUpdates).to.eql([25, 50, 50, 75, 100]);
                            done();
                        })
                })
        });

        it('can import a compressed file', function (done) {
            this.timeout(10000);

            const pathToNodeToImport = path.join(importDataRoot, '0_0-pristine.dat.compressed');
            const pathToExport = path.join(importDataRoot, '0_0-compare.dat.compressed');

            astEditorService.importNode(pathToNodeToImport, {
                'key': '0_0'
            }, {
                'shouldCompressFile': false
            })
                .then(() => {
                    astEditorService.exportNode(pathToExport, {
                        'key': '0_0'
                    }, {
                        'shouldDecompressFile': false
                    })
                        .then(() => {
                            const pristineFile = fs.readFileSync(pathToNodeToImport);
                            const compareFile = fs.readFileSync(pathToExport);

                            testBufferHashes(compareFile, pristineFile);
                            done();
                        })
                        .catch((err) => {
                            done(err);
                        })
                })
                .catch((err) => {
                    done(err);
                })
        });

        it('can force previews when importing a compressed file', function (done) {
            this.timeout(5000);

            astEditorService.readChildAST({
                'key': '0_648'
            }, false, false)
                .then(() => {
                    const pathToNodeToImport = path.join(importDataRoot, '0_648_17-pristine.p3r.compressed');

                    astEditorService.eventEmitter.once('preview', (data) => {
                        expect(data.key).to.equal('0_648_17');
                        expect(data.preview.substring(0, 23)).to.equal('data:image/webp;base64,');
                    });

                    astEditorService.importNode(pathToNodeToImport, 
                    {
                        'key': '0_648_17'
                    }, 
                    {
                        'shouldCompressFile': false,
                        'forceExtractPreview': true
                    })
                        .then(() => {
                            done();
                        })
                })
        });
    });

    describe('can open a single AST file', () => {
        it('method exists', () => {
            expect(astEditorService.openSingleAST).to.not.be.null;
        });

        it('returns expected result', (done) => {
            astEditorService.openSingleAST(hc09BootPath)
                .then((astData) => {
                    expect(astData).to.eql({
                        'key': '2',
                        'label': 'qkl_boot.ast',
                        'data': {
                            'index': 2,
                            'name': 'qkl_boot.ast',
                            'sizeUnformatted': astData.data.sizeUnformatted, // tests that import will change this, so it's easier to make it dynamic
                            'size': '345 MB',
                            'type': 'Root AST',
                            'description': '',
                            'absolutePath': hc09BootPath,
                            'loaded': false
                        },
                        'leaf': false
                    });

                    done();
                })
                .catch((err) => {
                    done(err);
                })
        });
    });

    function baseBootASTTests() {
        it('result contains all expected tocs', () => {
            expect(result.tocs.length).to.equal(727);
        });
    
        describe('file extensions', () => {
            it('DAT', () => {
                expect(result.tocs[0].fileExtension).to.equal('dat');
            });
    
            it('AST', () => {
                expect(result.tocs[0xe].fileExtension).to.equal('ast');
            });
    
            it('P3R', () => {
                expect(result.tocs[0xf].fileExtension).to.equal('p3r');
                expect(result.tocs[0xf].subtype).to.equal('DXT1');
            });
    
            it('DDS', () => {
                expect(result.tocs[0x15].fileExtension).to.equal('dds');
                expect(result.tocs[0x15].subtype).to.equal('NONE');
            });
    
            it('XML', () => {
                expect(result.tocs[0x1c].fileExtension).to.equal('xml');
            });
    
            it('DB', () => {
                expect(result.tocs[0x22].fileExtension).to.equal('db');
            });
    
            it('EBO', () => {
                expect(result.tocs[0xfb].fileExtension).to.equal('ebo');
            });
    
            it('RSF', () => {
                expect(result.tocs[0xd8].fileExtension).to.equal('rsf');
            });
        });
    }
});

function testBufferHashes(bufferToTest, bufferToCompare) {
    let testHash = crypto.createHash('sha1');
    testHash.update(bufferToTest);

    let compareHash = crypto.createHash('sha1');
    compareHash.update(bufferToCompare);

    expect(testHash.digest('hex')).to.eql(compareHash.digest('hex'));
};