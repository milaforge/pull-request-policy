import { PolicyGeneratorApp } from './logic/app';

// eslint-disable-next-line no-undef
const appElement = document.querySelector('#app');
if (!(appElement instanceof HTMLElement)) {
  throw new Error('App container was not found.');
}

const app = new PolicyGeneratorApp(appElement);
app.initialize();
