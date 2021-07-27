const path = require('path');
const sinon = require('sinon');
const expect = require('chai').expect;
const proxyquire = require('proxyquire').noCallThru();

let fsMockExistsReturnValue = false;

let fsMock = {
    'existsSync': sinon.spy(() => {
        return fsMockExistsReturnValue;
    }),
    'writeFile': sinon.spy((path, data, cb) => {
        cb();
    })
};

const deskgapMock = {
    'app': {
        'getPath': sinon.spy(() => { return path.join(__dirname, '../data/recent-file-service'); })
    }
};

const recentFilesService = proxyquire('../../src/server/recent-files-service', {
    'fs': fsMock,
    'deskgap': deskgapMock
});

describe('recent files service unit tests', () => {
    beforeEach(() => {
        fsMock.existsSync.resetHistory();
        fsMock.writeFile.resetHistory();
        recentFilesService.recentFiles = {};
    });

    describe('can initialize the service', () => {
        it('function exists', () => {
            expect(recentFilesService.initialize).to.exist;
        });

        it('checks if the system file exists', () => {
            recentFilesService.initialize();
            
            expect(fsMock.existsSync.callCount).to.equal(1);
            expect(fsMock.existsSync.firstCall.args[0]).to.equal(path.join(deskgapMock.app.getPath(), 'recent-files.json'));

            expect(fsMock.writeFile.callCount).to.equal(0);
        });

        it('migrates old recent files schema to new schema', () => {
            fsMockExistsReturnValue = true;

            recentFilesService.initialize();

            expect(recentFilesService.recentFiles).to.eql({
                'recentASTFiles': [{
                    'path': 'test/path/old/schema',
                    'type': 'root',
                    'time': 1623949510885
                }]
            });

            expect(fsMock.writeFile.callCount).to.equal(1);

            fsMockExistsReturnValue = false;
        });
    });

    describe('can add a recent file', () => {
        it('function exists', () => {
            expect(recentFilesService.addFile).to.exist;
        });

        it('adds a file to the list', () => {
            recentFilesService.addFile('recentASTFiles', {
                'path': 'test/path',
                'type': 'file',
                'time': '20'
            });

            expect(recentFilesService.recentFiles).to.eql({
                'recentASTFiles': [{
                    'path': 'test/path',
                    'type': 'file',
                    'time': '20'
                }]
            });
        });

        it('will put in the current time if no time is passed to options', () => {
            recentFilesService.addFile('recentASTFiles', {
                'path': 'test/path',
                'type': 'file'
            });

            expect(recentFilesService.recentFiles.recentASTFiles[0].time).to.not.be.null;
            expect(recentFilesService.recentFiles.recentASTFiles[0].time).to.be.a('Number')
        });

        it('will remove the oldest file(s) if list reaches max capacity', () => {
            for (let i = 0; i < 20; i++) {
                recentFilesService.addFile('recentASTFiles', {
                    'path': `${i}`,
                    'type': 'file'
                });
            }

            expect(recentFilesService.recentFiles.recentASTFiles.length).to.equal(10);

            expect(recentFilesService.recentFiles.recentASTFiles[0].path).to.equal('10');
            expect(recentFilesService.recentFiles.recentASTFiles[9].path).to.equal('19');
        });

        it('writes the new files', () => {
            recentFilesService.addFile('recentASTFiles', {
                'path': 'test/path',
                'type': 'file'
            });

            expect(fsMock.writeFile.callCount).to.equal(1);
            expect(fsMock.writeFile.firstCall.args[0]).to.equal(path.join(deskgapMock.app.getPath(), 'recent-files.json'));
            expect(fsMock.writeFile.firstCall.args[1]).to.eql(JSON.stringify(recentFilesService.recentFiles));
        });

        it('will not add a duplicate to the list', () => {
            recentFilesService.addFile('recentASTFiles', {
                'path': 'test/path',
                'type': 'file',
                'time': '20'
            });

            recentFilesService.addFile('recentASTFiles', {
                'path': 'test/path',
                'type': 'file',
                'time': '20'
            });

            expect(recentFilesService.recentFiles.recentASTFiles.length).to.equal(1);
        });
    });

    describe('can remove a recent file', () => {
        it('function exists', () => {
            expect(recentFilesService.removeFile).to.exist;
        });

        it('removes a file from the list', () => {
            recentFilesService.addFile('recentASTFiles', {
                'path': 'test/path',
                'type': 'file'
            });

            recentFilesService.addFile('recentASTFiles', {
                'path': 'test/path/2',
                'type': 'file',
                'time': '1'
            });

            recentFilesService.removeFile('recentASTFiles', 'test/path');

            expect(recentFilesService.recentFiles.recentASTFiles).to.eql([{
                'path': 'test/path/2',
                'type': 'file',
                'time': '1'
            }]);
        });

        it('removes the category if there are no more recent files in it', () => {
            recentFilesService.addFile('recentASTFiles', {
                'path': 'test/path',
                'type': 'file',
                'time': '1'
            });

            recentFilesService.addFile('test', {
                'path': 'test1',
                'type': 'test2',
                'time': '2'
            })

            recentFilesService.removeFile('recentASTFiles', 'test/path');

            expect(recentFilesService.recentFiles).to.eql({
                'test': [{
                    'path': 'test1',
                    'type': 'test2',
                    'time': '2'
                }]
            });
        });

        it('writes the data', () => {
            recentFilesService.addFile('recentASTFiles', {
                'path': 'test/path',
                'type': 'file',
                'time': '1'
            });

            fsMock.writeFile.resetHistory();

            recentFilesService.removeFile('recentASTFiles', 'test/path');

            expect(fsMock.writeFile.callCount).to.equal(1);
            expect(fsMock.writeFile.firstCall.args[0]).to.equal(path.join(deskgapMock.app.getPath(), 'recent-files.json'));
            expect(fsMock.writeFile.firstCall.args[1]).to.eql(JSON.stringify(recentFilesService.recentFiles));
        });
    });

    describe('can retrieve recent files by subcategory', () => {
        it('function exists', () => {
            expect(recentFilesService.getRecentFilesByCategory).to.exist;
        });

        it('returns expected result', () => {
            recentFilesService.addFile('recentASTFiles', {
                'path': 'test/path',
                'type': 'file',
                'time': '1'
            });

            recentFilesService.addFile('dbFiles', {
                'path': 'test/path/db',
                'type': 'file',
                'time': '2'
            });

            const result = recentFilesService.getRecentFilesByCategory('dbFiles');
            expect(result).to.eql([{
                'path': 'test/path/db',
                'type': 'file',
                'time': '2'
            }])
        });

        it('results are sorted by time', () => {
            recentFilesService.addFile('dbFiles', {
                'path': 'test/path',
                'type': 'file',
                'time': 1
            });

            recentFilesService.addFile('dbFiles', {
                'path': 'test/path/db',
                'type': 'file',
                'time': 2
            });

            const result = recentFilesService.getRecentFilesByCategory('dbFiles');
            expect(result).to.eql([{
                'path': 'test/path/db',
                'type': 'file',
                'time': 2
            }, {
                'path': 'test/path',
                'type': 'file',
                'time': 1
            }])
        });

        it('returns undefined if the category is empty', () => {
            const result = recentFilesService.getRecentFilesByCategory('dbFiles');
            expect(result).to.be.undefined;
        });
    });
});