import { createRouter, createWebHashHistory } from 'vue-router';

import Home from '../views/Home';
import EditorHome from '../views/EditorHome';

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home
    }, {
        path: '/editor/home',
        name: 'Editor Home',
        component: EditorHome
    }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

export default router;