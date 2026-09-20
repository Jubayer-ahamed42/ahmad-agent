import { searchLocalFiles } from './fileSearch.js';

console.log('Testing File Search in C:\\Personal Agent...');
const results = await searchLocalFiles('persona', 'C:\\Personal Agent');
console.log('Search Results:\n', JSON.stringify(results, null, 2));
