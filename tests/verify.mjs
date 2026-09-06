import {readdir} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import {validateCampaign} from '../src/data/campaign.js';
async function check(path){for(const entry of await readdir(path,{withFileTypes:true})){const p=`${path}/${entry.name}`;if(entry.isDirectory())await check(p);else if(/\.(mjs|js)$/.test(p)){const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);}}}
await check('src');await check('tests');await check('scripts');validateCampaign();console.log('Syntax and all twelve campaign contracts passed.');
