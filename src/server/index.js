const path = require('path');
const log = require('../util/logger');
const { app, BrowserWindow } = require('deskgap');

const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
    require('../util/livereload')(path.join(__dirname, '../client'));
}

app.once('ready', () => {
    const win = new BrowserWindow();
    win.loadFile(path.join(__dirname, '../client/main/dist/index.html'));
});