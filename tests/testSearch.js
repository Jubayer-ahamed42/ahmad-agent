import { searchLocalFiles } from '../src/fileSearch.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('Testing File Search in project root...');
const results = await searchLocalFiles('persona', projectRoot);
console.log('Search Results:\n', JSON.stringify(results, null, 2));
