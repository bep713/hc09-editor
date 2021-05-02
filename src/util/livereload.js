const path = require('path');
const chokidar = require('chokidar');
const log = require('../util/logger');
const { BrowserWindow } = require('deskgap');

function run(dirname) {
    log.info('Starting live reload');
    
    chokidar.watch(path.join(dirname, '/**/*')).on('change', (event, path) => {
        const windows = BrowserWindow.getAllWindows();
    
        for (var window of windows) {
            window.webView.reload();
        }
    });
};

module.exports = run;