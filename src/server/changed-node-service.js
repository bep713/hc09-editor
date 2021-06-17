const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('deskgap');
const log = require('../util/logger');

const BASE_USER_DATA = app.getPath('userData');
const PATH_TO_CHANGED_NODES = path.join(BASE_USER_DATA, 'changed-nodes.json');
const PATH_TO_PRISTINE_NODES = path.join(BASE_USER_DATA, 'pristine-nodes');

let changedNodeService = {};
changedNodeService.nodes = {};

changedNodeService.initialize = () => {
    if (fs.existsSync(PATH_TO_CHANGED_NODES)) {
        changedNodeService.nodes = require(PATH_TO_CHANGED_NODES);
        delete require.cache[require.resolve(PATH_TO_CHANGED_NODES)]
    }
    else {
        changedNodeService.nodes = {};
    }

    if (!fs.existsSync(PATH_TO_PRISTINE_NODES)) {
        fs.mkdirSync(PATH_TO_PRISTINE_NODES);
    }
};

changedNodeService.addNode = (rootFilePath, nodeKey) => {
    const hashedPath = getHash(rootFilePath);

    if (!changedNodeService.nodes[hashedPath]) {
        changedNodeService.nodes[hashedPath] = [nodeKey];
        writeToChangedNodesStore(changedNodeService.nodes);
        fs.mkdirSync(path.join(PATH_TO_PRISTINE_NODES, hashedPath));
    }
    else if (changedNodeService.nodes[hashedPath].indexOf(nodeKey) === -1) {
        changedNodeService.nodes[hashedPath].push(nodeKey);
        writeToChangedNodesStore(changedNodeService.nodes);
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
                fs.unlinkSync(path.join(PATH_TO_PRISTINE_NODES, hashedPath, `${nodeKey}.prs`));
            }
            catch (err) {
                log.error(err);
            }
        }

        if (changedRootNodes.length === 0) {
            delete changedNodeService.nodes[hashedPath];
            fs.rmdirSync(path.join(PATH_TO_PRISTINE_NODES, hashedPath));
        }

        writeToChangedNodesStore(changedNodeService.nodes);
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
    return path.join(PATH_TO_PRISTINE_NODES, getHash(rootFilePath), `${nodeKey}.prs`);
};

module.exports = changedNodeService;

function writeToChangedNodesStore(data) {
    fs.writeFile(PATH_TO_CHANGED_NODES, JSON.stringify(data), function (err) {
        if (err) {
            log.error(err);
        }
    });
};

function getHash(input) {
    return crypto.createHash('md5').update(input).digest('hex');
};