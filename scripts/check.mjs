import {readFile} from 'node:fs/promises';
const files=['index.html','styles.css','styles-v11.css','styles-v12.css','app.js','data/analysis.json','README.md','VERSION'];
for(const f of files){const v=await readFile(f,'utf8');if(!v.trim())throw new Error(`${f} is empty`)}
const html=await readFile('index.html','utf8');const js=await readFile('app.js','utf8');
for(const id of ['overview','traffic','products','playbook','data'])if(!html.includes(`id="${id}"`))throw new Error(`Missing panel ${id}`);
if(!js.includes("const VERSION = '1.2.0'"))throw new Error('Version mismatch');
for(const id of ['funnel','trendChart','sources','scoreGuide'])if(!html.includes(`id="${id}"`))throw new Error(`Missing analysis block ${id}`);
console.log('Pre-deploy checks passed: files, tabs, analysis blocks, version.');
