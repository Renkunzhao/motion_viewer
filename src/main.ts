import './styles.css';
import { AppController } from './app/App';

const app = new AppController();

window.addEventListener('beforeunload', () => {
  app.dispose();
});
