import { createRouter, createWebHashHistory } from 'vue-router';

import Home from '../views/Home';
import EditorHome from '../views/EditorHome';
import DBEditorHome from '../views/DBEditorHome';
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
        path: '/db-editor/home',
        name: 'DB Editor Home',
        component: DBEditorHome
    }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

export default router;