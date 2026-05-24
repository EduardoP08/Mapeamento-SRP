import './ui.js';
import { initAuthObserver } from './auth.js';
import { updateUIForUser } from './ui.js';

initAuthObserver(updateUIForUser);
