import { fileURLToPath } from 'node:url';
import createConfig from '../vite.config';

// eslint-disable-next-line compat/compat
const path = fileURLToPath(new URL('.', import.meta.url));

export default createConfig(path);
