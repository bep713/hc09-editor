const fs = require('fs');
const path = require('path');
const { app } = require('deskgap');

const PATH_TO_RECENT_FILES = path.join(app.getPath('userData'), 'recent-files.json');
const MAX_RECENT_FILES = 10;

let recentFileService = {};
recentFileService.recentFiles = [];

recentFileService.initialize = () => {
    if (fs.existsSync(PATH_TO_RECENT_FILES)) {
        recentFileService.recentFiles = require(PATH_TO_RECENT_FILES);
        delete require.cache[require.resolve(PATH_TO_RECENT_FILES)];

        if (recentFileService.recentFiles instanceof Array) {
            recentFileService.recentFiles = {
                'recentASTFiles': recentFileService.recentFiles
            };

            writeToRecentFilesStore(recentFileService.recentFiles);
        }
    }
    else {
        recentFileService.recentFiles = {};
    }
};

recentFileService.addFile = (key, options) => {
    let recentFile = {
        'path': options.path,
        'type': options.type,
        'time': options.time ? options.time : Date.now()
    };

    if (!recentFileService.recentFiles[key]) {
        recentFileService.recentFiles[key] = [recentFile];
    }
    else {
        const nodeDoesNotExist = recentFileService.recentFiles[key].find((file) => {
            return file.path.toLowerCase() === recentFile.path.toLowerCase();
        }) === undefined;

        if (nodeDoesNotExist) {
            recentFileService.recentFiles[key].push(recentFile);
    
            if (recentFileService.recentFiles[key].length > MAX_RECENT_FILES) {
                recentFileService.recentFiles[key] = recentFileService.recentFiles[key].slice(MAX_RECENT_FILES * -1);
            }
        }
    }
    
    writeToRecentFilesStore(recentFileService.recentFiles);
};

recentFileService.removeFile = (key, path) => {
    const recentFilesInCategory = recentFileService.recentFiles[key];

    if (recentFilesInCategory) {
        const nodeIndex = recentFilesInCategory.findIndex((file) => {
            return file.path.toLowerCase() === path.toLowerCase();
        });

        if (nodeIndex >= 0) {
            recentFilesInCategory.splice(nodeIndex, 1);
        }

        if (recentFilesInCategory.length === 0) {
            delete recentFileService.recentFiles[key];
        }

        writeToRecentFilesStore(recentFileService.recentFiles);
    }
};

recentFileService.getRecentFiles = () => {
    return recentFileService.recentFiles.sort((a, b) => { return b.time - a.time; });
};

recentFileService.getRecentFilesByCategory = (category) => {
    return recentFileService.recentFiles[category];
};

module.exports = recentFileService;

function writeToRecentFilesStore(data) {
    fs.writeFile(PATH_TO_RECENT_FILES, JSON.stringify(data), function (err) {
        if (err) {
            console.log(err);
        }
    });
};