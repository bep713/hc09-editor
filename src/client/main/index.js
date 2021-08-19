import App from './App';
import router from './router';
import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Tooltip from 'primevue/tooltip';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';

import 'primevue/resources/themes/saga-blue/theme.css'
import 'primevue/resources/primevue.min.css';
import 'primeicons/primeicons.css';

const app = createApp(App);
app.use(router);
app.use(PrimeVue, {ripple: true});
app.use(ToastService);
app.use(ConfirmationService);

app.directive('tooltip', Tooltip);

app.mount('#app');
