const path = require('path');
const sinon = require('sinon');
const expect = require('chai').expect;
const proxyquire = require('proxyquire').noCallThru();

const fsMock = {
    'existsSync': sinon.spy(() => {
        return false;
    }),
    'mkdirSync': sinon.spy(() => {
        return true;
    }),
    'unlinkSync': sinon.spy(() => {
        return true;
    }),
    'rmdirSync': sinon.spy(() => {
        return true;
    }),
    'writeFile': sinon.spy((path, data, cb) => {
        cb();
    })
};

let cryptoMock = {
    'input': '',
    'createHash': sinon.spy(() => {
        return cryptoMock;
    }),
    'update': sinon.spy((input) => {
        this.input = input;
        return cryptoMock;
    }),
    'digest': sinon.spy(() => {
        return `${this.input}_hash_test`;
    })
};

const deskgapMock = {
    'app': {
        'getPath': sinon.spy(() => { return path.join(__dirname, '../data/changed-node-service'); })
    }
};

const changedNodeService = proxyquire('../../src/server/changed-node-service', {
    'fs': fsMock,
    'crypto': cryptoMock,
    'deskgap': deskgapMock
});

describe('changed node service unit tests', () => {
    beforeEach(() => {
        fsMock.existsSync.resetHistory();
        fsMock.mkdirSync.resetHistory();
        fsMock.unlinkSync.resetHistory();
        fsMock.rmdirSync.resetHistory();
        fsMock.writeFile.resetHistory();
        cryptoMock.createHash.resetHistory();
        cryptoMock.update.resetHistory();
        cryptoMock.digest.resetHistory();
    });

    describe('can add a node', () => {
        beforeEach(() => {
            changedNodeService.nodes = {};
        });

        it('function exists', () => {
            expect(changedNodeService.addNode).to.exist;
        });

        it('hashes the input root path', () => {
            changedNodeService.addNode('test/path/1', '0');
            expect(cryptoMock.createHash.callCount).to.equal(1);
            expect(cryptoMock.createHash.firstCall.args[0]).to.equal('md5');

            expect(cryptoMock.update.callCount).to.equal(1);
            expect(cryptoMock.update.firstCall.args[0]).to.equal('test/path/1');

            expect(cryptoMock.digest.callCount).to.equal(1);
            expect(cryptoMock.digest.firstCall.args[0]).to.equal('hex');
        });

        it('adds node as expected by root file path', () => {
            changedNodeService.addNode('test/path/1', '0');

            expect(changedNodeService.nodes).to.eql({
                'test/path/1_hash_test': ['0']
            });
        });

        it('adds a second node inside the first root path', () => {
            changedNodeService.addNode('test/path/1', '0');
            changedNodeService.addNode('test/path/1', '1_1');
            
            expect(changedNodeService.nodes).to.eql({
                'test/path/1_hash_test': ['0', '1_1']
            });
        });

        it('does not add a duplicate value', () => {
            changedNodeService.addNode('test/path/1', '0');
            changedNodeService.addNode('test/path/1', '1_1');
            changedNodeService.addNode('test/path/1', '1_1');
            
            expect(changedNodeService.nodes).to.eql({
                'test/path/1_hash_test': ['0', '1_1']
            });
        });

        it('can add a second root path', () => {
            changedNodeService.addNode('test/path/1', '0');
            changedNodeService.addNode('test/path/1', '1_1');
            changedNodeService.addNode('test/path/2', '1_1');

            expect(changedNodeService.nodes).to.eql({
                'test/path/1_hash_test': ['0', '1_1'],
                'test/path/2_hash_test': ['1_1']
            });
        });
    });

    describe('can remove a node', () => {
        beforeEach(() => {
            changedNodeService.nodes = {};
        });
        
        it('function exists', () => {
            expect(changedNodeService.removeNode).to.exist;
        });

        it('hashes the input root path', () => {
            changedNodeService.removeNode('test/path/1', '0');
            expect(cryptoMock.createHash.callCount).to.equal(1);
            expect(cryptoMock.createHash.firstCall.args[0]).to.equal('md5');

            expect(cryptoMock.update.callCount).to.equal(1);
            expect(cryptoMock.update.firstCall.args[0]).to.equal('test/path/1');

            expect(cryptoMock.digest.callCount).to.equal(1);
            expect(cryptoMock.digest.firstCall.args[0]).to.equal('hex');
        });

        it('can remove an added node', () => {
            changedNodeService.addNode('test/path/1', '0');

            changedNodeService.removeNode('test/path/1', '0')

            expect(changedNodeService.nodes).to.eql({});
        });

        it('can remove an added node when there are nodes in the root', () => {
            changedNodeService.addNode('test/path/1', '0');
            changedNodeService.addNode('test/path/1', '1_1');
            changedNodeService.addNode('test/path/1', '1_2');

            changedNodeService.removeNode('test/path/1', '0');

            expect(changedNodeService.nodes).to.eql({
                'test/path/1_hash_test': ['1_1', '1_2']
            });
        });

        it('can remove an added node when there are multiple root nodes', () => {
            changedNodeService.addNode('test/path/1', '0');
            changedNodeService.addNode('test/path/2', '1_1');
            changedNodeService.addNode('test/path/1', '1_2');

            changedNodeService.removeNode('test/path/1', '0');

            expect(changedNodeService.nodes).to.eql({
                'test/path/1_hash_test': ['1_2'],
                'test/path/2_hash_test': ['1_1']
            });
        });
    });

    describe('can write, save, and reload nodes', () => {
        beforeEach(() => {
            changedNodeService.nodes = {};
        });

        it('initialize checks if the file exists', () => {
            changedNodeService.initialize();
            expect(fsMock.existsSync.callCount).to.equal(2);
            expect(fsMock.existsSync.firstCall.args).to.eql([deskgapMock.app.getPath() + '\\changed-nodes.json']);
        });

        it('initialize checks if the pristine folder exists', () => {
            changedNodeService.initialize();
            expect(fsMock.existsSync.callCount).to.equal(2);
            expect(fsMock.existsSync.secondCall.args).to.eql([deskgapMock.app.getPath() + '\\pristine-nodes']);
        });

        it('initialize creates pristine folder if it does not exist', () => {
            changedNodeService.initialize();
            expect(fsMock.mkdirSync.callCount).to.equal(1);
            expect(fsMock.mkdirSync.firstCall.args).to.eql([deskgapMock.app.getPath() + '\\pristine-nodes']);
        });

        it('addNode writes to the file', () => {
            changedNodeService.addNode('test', '1');
            expect(fsMock.writeFile.callCount).to.equal(1);
        });

        it('addNode does not write to the file if a duplicate is passed', () => {
            changedNodeService.addNode('test', '1');
            changedNodeService.addNode('test', '1');
            expect(fsMock.writeFile.callCount).to.equal(1);
        });

        it('addNode creates a new pristine folder with the hashed key if a new root path is passed', () => {
            changedNodeService.addNode('test', '1');
            expect(fsMock.mkdirSync.callCount).to.equal(1);
            expect(fsMock.mkdirSync.firstCall.args[0]).to.eql(deskgapMock.app.getPath() + '\\pristine-nodes\\test_hash_test');
        });

        it('addNode does not create a new pristine folder if the hashed key has been passed before', () => {
            changedNodeService.addNode('test', '1');
            changedNodeService.addNode('test', '1');
            expect(fsMock.mkdirSync.callCount).to.equal(1); // only call once, the first time
            expect(fsMock.mkdirSync.firstCall.args[0]).to.eql(deskgapMock.app.getPath() + '\\pristine-nodes\\test_hash_test');
        });

        it('removeNode writes to the file', () => {
            changedNodeService.addNode('test', '1');
            fsMock.writeFile.resetHistory();

            changedNodeService.removeNode('test', '1');
            expect(fsMock.writeFile.callCount).to.equal(1);
        });

        it('removeNode does not write to the file if a non-existant node is passed', () => {
            changedNodeService.removeNode('test', '1');
            expect(fsMock.writeFile.callCount).to.equal(0);
        });

        it('removeNode deletes the pristine folder if the key does not have any nodes left', () => {
            changedNodeService.addNode('test', '1');
            changedNodeService.removeNode('test', '1');
            expect(fsMock.rmdirSync.callCount).to.equal(1);
            expect(fsMock.rmdirSync.firstCall.args[0]).to.equal(deskgapMock.app.getPath() + '\\pristine-nodes\\test_hash_test');
        });

        it('removeNode does not delete the pristine folder if the key has nodes remaining', () => {
            changedNodeService.addNode('test', '1');
            changedNodeService.addNode('test', '2');
            changedNodeService.removeNode('test', '1');
            expect(fsMock.rmdirSync.callCount).to.equal(0);
        });

        it('removeNode deletes the key file', () => {
            changedNodeService.addNode('test', '1');
            changedNodeService.removeNode('test', '1');
            expect(fsMock.unlinkSync.callCount).to.equal(1);
            expect(fsMock.unlinkSync.firstCall.args[0]).to.equal(deskgapMock.app.getPath() + '\\pristine-nodes\\test_hash_test\\1.prs');
        });

        it('removeNode does not delete the key file if the key file doesnt exist', () => {
            changedNodeService.removeNode('test', '1');
            expect(fsMock.unlinkSync.callCount).to.equal(0);
        });
    });

    describe('can get a list of changed nodes by root file path', () => {
        beforeEach(() => {
            changedNodeService.nodes = {};
        });

        it('function exists', () => {
            expect(changedNodeService.getChangedNodesByPath).to.exist;
        });

        it('hashes the input root path', () => {
            changedNodeService.getChangedNodesByPath('test/path/1');
            expect(cryptoMock.createHash.callCount).to.equal(1);
            expect(cryptoMock.createHash.firstCall.args[0]).to.equal('md5');

            expect(cryptoMock.update.callCount).to.equal(1);
            expect(cryptoMock.update.firstCall.args[0]).to.equal('test/path/1');

            expect(cryptoMock.digest.callCount).to.equal(1);
            expect(cryptoMock.digest.firstCall.args[0]).to.equal('hex');
        });

        it('returns expected result', () => {
            changedNodeService.addNode('test', '1');
            changedNodeService.addNode('test2', '2_2');
            changedNodeService.addNode('test2', '2_3');
            changedNodeService.removeNode('test2', '2_2');

            const nodes = changedNodeService.getChangedNodesByPath('test2');
            expect(nodes).to.eql(['2_3']);
        });
    });

    describe('can check if a node has been changed', () => {
        beforeEach(() => {
            changedNodeService.nodes = {};
        });

        it('function exists', () => {
            expect(changedNodeService.nodeWasChanged).to.exist;
        });

        it('hashes the input root path', () => {
            changedNodeService.nodeWasChanged('test/path/1');
            expect(cryptoMock.createHash.callCount).to.equal(1);
            expect(cryptoMock.createHash.firstCall.args[0]).to.equal('md5');

            expect(cryptoMock.update.callCount).to.equal(1);
            expect(cryptoMock.update.firstCall.args[0]).to.equal('test/path/1');

            expect(cryptoMock.digest.callCount).to.equal(1);
            expect(cryptoMock.digest.firstCall.args[0]).to.equal('hex');
        });

        it('returns true if node was added', () => {
            changedNodeService.addNode('test', '1');
            expect(changedNodeService.nodeWasChanged('test', '1')).to.be.true;
        });

        it('returns false if node was not added', () => {
            changedNodeService.addNode('test', '1');
            expect(changedNodeService.nodeWasChanged('test', '2')).to.be.false;
        });

        it('returns false if path does not exist', () => {
            changedNodeService.addNode('test', '1');
            expect(changedNodeService.nodeWasChanged('test2', '2')).to.be.false;
        });
    });

    describe('can get the hashed string of a root path', () => {
        it('function exists', () => {
            expect(changedNodeService.getHashedKey).to.exist;
        });

        it('hashes the input root path', () => {
            changedNodeService.getHashedKey('test/path/1');
            expect(cryptoMock.createHash.callCount).to.equal(1);
            expect(cryptoMock.createHash.firstCall.args[0]).to.equal('md5');

            expect(cryptoMock.update.callCount).to.equal(1);
            expect(cryptoMock.update.firstCall.args[0]).to.equal('test/path/1');

            expect(cryptoMock.digest.callCount).to.equal(1);
            expect(cryptoMock.digest.firstCall.args[0]).to.equal('hex');
        });

        it('returns the expected result', () => {
            const result = changedNodeService.getHashedKey('test/path/1');
            expect(result).to.equal('test/path/1_hash_test');
        });
    });

    describe('can get the hashed path of a pristine node', () => {
        it('function exists', () => {
            expect(changedNodeService.getHashedNodePath).to.exist;
        });

        it('hashes the input root path', () => {
            changedNodeService.getHashedNodePath('test/path/1');
            expect(cryptoMock.createHash.callCount).to.equal(1);
            expect(cryptoMock.createHash.firstCall.args[0]).to.equal('md5');

            expect(cryptoMock.update.callCount).to.equal(1);
            expect(cryptoMock.update.firstCall.args[0]).to.equal('test/path/1');

            expect(cryptoMock.digest.callCount).to.equal(1);
            expect(cryptoMock.digest.firstCall.args[0]).to.equal('hex');
        });

        it('returns the expected result', () => {
            const result = changedNodeService.getHashedNodePath('test/path/1', '1_1');
            expect(result).to.equal(deskgapMock.app.getPath() + '\\pristine-nodes\\test\\path\\1_hash_test\\1_1.prs');
        });
    });
});