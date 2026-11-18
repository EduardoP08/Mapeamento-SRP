import './ui.js?v=20261118';
import { initAuthObserver } from './auth.js?v=20261118';
import { updateUIForUser } from './ui.js?v=20261118';

initAuthObserver(updateUIForUser);

// Initialize the UI for the current user on page load