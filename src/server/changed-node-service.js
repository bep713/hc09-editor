const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('deskgap');
const log = require('../util/logger');

let changedNodeService = {};
changedNodeService.nodes = {};

changedNodeService.initialize = () => {
    this.BASE_USER_DATA = app.getPath('userData');
    this.PATH_TO_CHANGED_NODES = path.join(this.BASE_USER_DATA, 'changed-nodes.json');
    this.PATH_TO_PRISTINE_NODES = path.join(this.BASE_USER_DATA, 'pristine-nodes');

    if (fs.existsSync(this.PATH_TO_CHANGED_NODES)) {
        changedNodeService.nodes = require(this.PATH_TO_CHANGED_NODES);
        delete require.cache[require.resolve(this.PATH_TO_CHANGED_NODES)]
    }
    else {
        changedNodeService.nodes = {};
    }

    if (!fs.existsSync(this.PATH_TO_PRISTINE_NODES)) {
        fs.mkdirSync(this.PATH_TO_PRISTINE_NODES);
    }
};

changedNodeService.addNode = (rootFilePath, nodeKey) => {
    const hashedPath = getHash(rootFilePath);

    if (!changedNodeService.nodes[hashedPath]) {
        changedNodeService.nodes[hashedPath] = [nodeKey];
        changedNodeService._writeToChangedNodesStore(changedNodeService.nodes);
        fs.mkdirSync(path.join(this.PATH_TO_PRISTINE_NODES, hashedPath));
    }
    else if (changedNodeService.nodes[hashedPath].indexOf(nodeKey) === -1) {
        changedNodeService.nodes[hashedPath].push(nodeKey);
        changedNodeService._writeToChangedNodesStore(changedNodeService.nodes);
    }
};

changedNodeService.removeNode = (rootFilePath, nodeKey) => {
    const hashedPath = getHash(rootFilePath);
    const changedRootNodes = changedNodeService.nodes[hashedPath];

    if (changedRootNodes) {
        const nodeIndex = changedRootNodes.indexOf(nodeKey);

        if (nodeIndex >= 0) {
            changedRootNodes.splice(nodeIndex, 1);

            try {
                fs.unlinkSync(path.join(this.PATH_TO_PRISTINE_NODES, hashedPath, `${nodeKey}.prs`));
            }
            catch (err) {
                log.error(err);
            }
        }

        if (changedRootNodes.length === 0) {
            delete changedNodeService.nodes[hashedPath];
            fs.rmdirSync(path.join(this.PATH_TO_PRISTINE_NODES, hashedPath));
        }

        changedNodeService._writeToChangedNodesStore(changedNodeService.nodes);
    }
};

changedNodeService.getChangedNodesByPath = (path) => {
    const hashedPath = getHash(path);
    return changedNodeService.nodes[hashedPath];
};

changedNodeService.nodeWasChanged = (rootFilePath, nodeKey) => {
    const hashedPath = getHash(rootFilePath);
    if (changedNodeService.nodes[hashedPath] && changedNodeService.nodes[hashedPath].indexOf(nodeKey) >= 0) {
        return true;
    }
    else {
        return false;
    }
};

changedNodeService.getHashedKey = (path) => {
    return getHash(path);
};

changedNodeService.getHashedNodePath = (rootFilePath, nodeKey) => {
    return path.join(this.PATH_TO_PRISTINE_NODES, getHash(rootFilePath), `${nodeKey}.prs`);
};

changedNodeService._writeToChangedNodesStore = (data) => {
    fs.writeFile(this.PATH_TO_CHANGED_NODES, JSON.stringify(data), function (err) {
        if (err) {
            log.error(err);
        }
    });
};

module.exports = changedNodeService;

function getHash(input) {
    return crypto.createHash('md5').update(input).digest('hex');
};