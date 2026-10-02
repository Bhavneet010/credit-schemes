import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
const roots=['scheme-data/common','scheme-data/states/himachal-pradesh','scheme-data/states/punjab','app/data/himachal-pradesh.json','app/data/punjab.json'];
const hashes={};
function visit(p){if(fs.statSync(p).isDirectory()){for(const f of fs.readdirSync(p))visit(path.join(p,f));}else hashes[p]=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');}
roots.forEach(visit);fs.writeFileSync('research/uttarakhand/out-of-scope-before.json',JSON.stringify(hashes,null,2));
