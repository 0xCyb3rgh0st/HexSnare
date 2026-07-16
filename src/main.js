// main.js — entry point.
import './styles.css';
import { init } from './ui.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
