import { createRouter, createWebHashHistory } from 'vue-router';

import Home from '../views/Home';
import SettingsHome from '../views/Settings';
import EditorHome from '../views/EditorHome';
import GameFilesEditorHome from '../views/GameFilesEditorHome';

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home
    }, {
        path: '/editor/home',
        name: 'Editor Home',
        component: EditorHome
    }, {
        path: '/game-files/home',
        name: 'Game Files Editor Home',
        component: GameFilesEditorHome
    }, {
        path: '/settings/home',
        name: 'Settings Home',
        component: SettingsHome
    }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

export default router;