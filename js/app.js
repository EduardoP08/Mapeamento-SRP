import './ui.js';
import { initAuthObserver } from './auth.js';
import { updateUIForUser } from './ui.js';

initAuthObserver(updateUIForUser);

// Initialize the UI for the current user on page load