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

const astEditorService = proxyquire('../../src/server/ast-editor/ast-editor-service', {
    'deskgap': deskgapMock
});

const testDataRoot = path.join(__dirname, '../data');
const hc09BootPath = 'D:\\Media\\Games\\NFL Head Coach 09 [U] [BLUS-30128]\\PS3_GAME\\USRDIR\\qkl_boot.ast';
const hc09StreamPath = 'D:\\Media\\Games\\NFL Head Coach 09 [U] [BLUS-30128]\\PS3_GAME\\USRDIR\\qkl_stream.ast';

describe('ast editor service unit tests', () => {
    let result = null;

    describe('read ast (non-recursive)', () => {
        before((done) => {
            astEditorService.readAST(hc09BootPath, false, true, 0)
                .then((astFile) => {
                    result = astFile;
                    done();
                })
        });

        baseBootASTTests();

        it('does not read children if recursive read is set to false', () => {
            expect(result.tocs[0xe].file).to.be.undefined;
        });

        describe('can read a child AST after reading in the root', () => {
            let childAst = null;

            before((done) => {
                astEditorService.readAST(hc09BootPath, false, true, 0)
                    .then(() => {                    
                        astEditorService.readChildAST({
                            'key': '0_672'
                        }, false, true)
                            .then((astFile) => {
                                childAst = astFile.tocs[672].file;
                                done();
                            })
                    })
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
            }, true)
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
            }, true)
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
            }, true)
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
                    }, true)
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
            }, true)
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
            }, false)
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
            true, 
            {
                'to': 'DDS',
                'from': 'P3R'
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
            true, 
            {
                'to': 'DDS',
                'from': 'P3R'
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

            astEditorService.importNode(pathToNodeToImport, {
                'key': '0_0'
            })
                .then(() => {
                    expect(astEditorService.activeASTFiles[0].file.tocs.length).to.equal(727);

                    astEditorService.exportNode(pathToExport, {
                        'key': '0_0'
                    }, true)
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
                    })
                        .then(() => {
                            astEditorService.exportNode(pathToExport, {
                                'key': '0_670_13'
                            }, true)
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
                    })
                        .then(() => {
                            astEditorService.importNode(secondPathToNodeToImport, {
                                'key': '0_670_5'
                            })
                            .then(() => {
                                astEditorService.exportNode(pathToExport, {
                                    'key': '0_670_13'
                                }, true)
                                    .then(() => {
                                        astEditorService.exportNode(secondPathToExport, {
                                            'key': '0_670_5'
                                        }, true)
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
            }, {
                'from': 'DDS',
                'to': 'P3R'
            })
                .then(() => {
                    astEditorService.exportNode(pathToExport, {
                        'key': '0_15'
                    }, true)
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
                    }, {
                        'from': 'DDS',
                        'to': 'P3R'
                    })
                        .then(() => {
                            astEditorService.exportNode(pathToExport, {
                                'key': '0_648_17'
                            }, true)
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
            }, false, true)
                .then(() => {
                    const pathToNodeToImport = path.join(importDataRoot, '0_648_17-pristine-to-import.dds');

                    astEditorService.eventEmitter.once('preview', (data) => {
                        expect(data.key).to.equal('0_648_17');
                        expect(data.preview.substring(0, 23)).to.equal('data:image/webp;base64,');
                        done();
                    });

                    astEditorService.importNode(pathToNodeToImport, {
                        'key': '0_648_17'
                    }, {
                        'from': 'DDS',
                        'to': 'P3R'
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

                    astEditorService.importNode(pathToNodeToImport, {
                        'key': '0_648_17'
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
                    })
                        .then(() => {
                            astEditorService.eventEmitter.removeAllListeners('progress');
                            expect(progressUpdates).to.eql([25, 50, 50, 75, 100]);
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
                            'sizeUnformatted': 344661232,
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
    
        describe('previews', () => {
            it('blank preview if not dds', () => {
                expect(result.tocs[0].preview).to.equal('');
            });
    
            it('expected base64 result', () => {
                expect(result.tocs[0x15].preview).to.equal('data:image/webp;base64,UklGRjIAAABXRUJQVlA4ICYAAADQAgCdASogACAAPm00lkekIyIhKAgAgA2JaQAAPaOgAP7gAAAAAA==');
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