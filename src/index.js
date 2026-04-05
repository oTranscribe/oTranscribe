
require('./scss/base.scss');

import init from './js/app/init';

window.addEventListener('DOMContentLoaded', () => {
    init();    
});

if ('serviceWorker' in navigator) { navigator.serviceWorker.register('service-worker.js'); }
