import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const base=read('research/uttarakhand/research-before-expansion.json');
const chunks=['national','agri','industry','livelihood'].map(n=>({name:n,...read(`research/uttarakhand/expansion/${n}.json`)}));
const merge=(key,identity)=>[...new Map([...(base[key]??[]),...chunks.flatMap(c=>c[key]??[])].map(v=>[identity(v),v])).values()];
const research={...base,sources:merge('sources',v=>v.code),schemes:merge('schemes',v=>v.code),sharedRoutes:merge('sharedRoutes',v=>v.match),agencies:merge('agencies',v=>v.code),activities:merge('activities',v=>v[0]),legacy:merge('legacy',v=>v.name)};
const common=read('scheme-data/common/schemes.json').schemes;
research.sharedRoutes=[...new Map(research.sharedRoutes.map(r=>{const s=common.find(s=>s.id.includes(r.match));if(!s)throw Error(r.match);return[s.id,{...r,match:s.id}];})).values()];
const restrictions={'LIVX-WOOL':'wool|weav|textile|handloom|spinning','LIVX-WOOLBANK':'wool|sheep|spinning|weav','LIVX-YARN':'yarn|khadi|spinning|weav|handloom'};
for(const s of research.schemes)if(restrictions[s.code])s.pattern=restrictions[s.code];
for(const r of research.sharedRoutes){
 if(/HANDLOOM|WEAVER-MUDRA/.test(r.match))r.pattern='handloom|weav';
 if(/JANAUSHADHI/.test(r.match))r.pattern='Jan Aushadhi|pharmacy';
 if(/PM-VISHWAKARMA/.test(r.match))r.pattern='craft|carpet|rug|embroidery|furniture|joinery';
 if(/NATIONAL-HANDICRAFTS/.test(r.match))r.pattern='craft|carpet|rug|embroidery';
}
if(!research.activities.some(a=>a[0]==='CHIP-DESIGN'))research.activities.push(['CHIP-DESIGN','Semiconductor chip design startup','Domestic design and EDA infrastructure',12,6]);
const addedActivities=[
 ['PROTECTED-VEG','Polyhouse and greenhouse off-season vegetable cultivation','Protected horticulture',1,0],
 ['ORGANIC-HORT','Organic horticulture cultivation','District pilot eligibility',1,0],
 ['CHILLI','Chilli cultivation','Horticulture spices',1,0],
 ['HORT-VERMI','Horticulture vermicompost input unit','Organic inputs',1,1],
 ['FRUIT-MARKET','Apple pear malta and galgal market aggregation','Notified procurement',1,8],
 ['WOMEN-DAIRY','Women milk cooperative dairy and cow enterprise','Women dairy and Ganga Gaay',2,0],
 ['EXPORT-FRUIT','Fruit and flower export enterprise','Eligible fresh horticulture exports',1,10],
 ['EXPORT-FOOD','Processed food and spice export enterprise','Export processing and market development',5,10],
 ['EXPORT-PHARMA','Pharmaceutical and medical-device export enterprise','Licensed product exports',7,10],
 ['EXPORT-CRAFT','Handloom textile and handicraft export enterprise','Craft export market development',8,10],
 ['EXPORT-ENG','Engineering and electronic goods export enterprise','Eligible manufactured exports',9,10],
 ['EXPORT-SERVICE','Software and digital service export enterprise','Eligible service exports',12,10]
 ,['MILLET-PROCESS','Mandua and jhangora millet processing unit','Millet value chain',5,2]
 ,['MILLET-STORAGE','Millet grain storage and warehouse','Millet post-harvest',4,7]
 ,['MILLET-AGGREGATION','Millet farmer group procurement and aggregation','Mandua and jhangora cooperative marketing',6,8]
];
for(const a of addedActivities)if(!research.activities.some(x=>x[0]===a[0]))research.activities.push(a);
for(const s of research.schemes)if(s.code==='HORT-APPLE')s.pattern='apple';
for(const s of research.schemes)if(s.caution)s.caution=s.caution.replace('UK-specific implementation record avoids reusing HP-labelled MIDH common row. ','');
for(const r of research.sharedRoutes)if(r.access)r.access=r.access.replace(' No HP-specific insurance row reused.','');
const publishedNames=new Set(research.schemes.map(v=>v.name.toLowerCase()));
const resolvedInitial=/MSY 2\.0 financial|MSME 2023 remaining|Service Sector Policy|Rural SHG|SC\/ST\/OBC/;
const initialMemory=(base.candidates??[]).map(c=>resolvedInitial.test(c.name)?{...c,disposition:'resolved-by-expansion',reason:'The earlier discovery-only entry was researched in this expansion. Published programme records and component-specific remaining candidates supersede the original limitation.'}:c);
research.candidates=[...new Map([...initialMemory,...chunks.flatMap(c=>c.candidates??[])].filter(c=>!publishedNames.has(c.name.toLowerCase())).map(c=>[c.name,c])).values()];
let candidateSource=1;
for(const c of research.candidates)c.sources=(c.sources??[]).map(ref=>{
 if(research.sources.some(s=>s.code===ref))return ref;
 if(/^https?:/.test(ref)){
  const found=research.sources.find(s=>s.url===ref);if(found)return found.code;
  const code=`CANDX-${candidateSource++}`;
  research.sources.push({code,title:`Research lead: ${c.name}`,issuer:'Official programme discovery lead',url:ref,classification:'secondary-lead',locator:'Candidate reference only; no publishable entitlement inferred. '+c.reason});return code;
 }
 const found=research.sources.find(s=>s.code===ref.replaceAll(' ',''));if(found)return found.code;
 throw Error(`Unresolved candidate source ${ref} for ${c.name}`);
});
research.failedAccess=chunks.flatMap(c=>c.failedAccess??[]);
research.coverageNotes=chunks.flatMap(c=>(c.coverageNotes??[]).map(note=>({segment:c.name,note})));
research.limitations=[
 'Expanded statewide research covers agriculture and allied activities, industry and services, livelihoods and category finance, and direct national enterprise routes. Remaining specific candidates are recorded; full statewide research acceptance is not claimed.',
 'Programme existence is separate from current intake and budget. District allocations and current application windows require confirmation; recheck scheduled for 16 October 2026.',
 'Official summaries are indicative-only. Precise assistance supported by operative rules remains subject to unit, location, applicant, cost and sanction conditions.',
 'National benefits retain the common catalogue evidence dates. Only Uttarakhand access and state-local presentation were expanded; common records and existing states were preserved.',
 'Expired, superseded, unverified and duplicate routes are retained in the research candidate/legacy ledger instead of presented as current entitlements.',
 'Agency/activity coverage still includes explicit pending cells. Component cost schedules and every district-specific allocation are not independently verified.'
];
for(const field of ['sources','schemes','sharedRoutes','agencies'])if(!research[field].length)throw Error(`Empty ${field}`);
fs.writeFileSync('research/uttarakhand/research.json',JSON.stringify(research,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(['sources','schemes','sharedRoutes','agencies','candidates'].map(k=>[k,research[k].length]))));
