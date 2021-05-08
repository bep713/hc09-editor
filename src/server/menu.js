const { Menu } = require('deskgap');

const template = [
    {
        label: 'File',
        submenu: [
            { role: 'close' }
        ]
    },
    { 
        label: 'View',
        submenu: [
            { role: 'reload' }
        ]
    },
    {
        label: 'Window',
        submenu: [
            { role: 'minimize' }
        ]
    }
];

const menu = Menu.buildFromTemplate(template);

module.exports = menu;