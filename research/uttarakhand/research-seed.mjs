import fs from 'node:fs';
const sources = [];
const source = (code, title, issuer, url, classification = 'primary-summary', locator = 'Official programme page; current budget and intake not established.') => sources.push({ code, title, issuer, url, classification, locator });
source('DIRECTORY', 'State department directory', 'Government of Uttarakhand', 'https://cm.uk.gov.in/department/');
source('MSME', 'MSME Policy 2023 operational guidelines', 'MSME Department, Uttarakhand', 'https://investuttarakhand.uk.gov.in/swcsincentive/common/protected/msme_policy/MSMEpolicy.pdf', 'primary-operative', 'Sections 6–7 eligibility; 8–10 DPR, stamp duty and capital subsidy.');
source('MSY', 'MSY 2.0 notification — indexed official text', 'MSME Department, Uttarakhand', 'https://startuputtarakhand.uk.gov.in/attachments/MSY.pdf', 'primary-summary', 'Indexed first-page text establishes 2025-26 to 2029-30 scheme and merger; direct PDF timed out. No financial slabs published from the incomplete retrieval.');
source('STARTUP', 'State Startup Ecosystem Report 2026', 'DPIIT / Startup India', 'https://www.startupindia.gov.in/srf/portal/SRF_2026_Result_page/Uttarakhand_State_Report.pdf', 'primary-summary', 'Section 2.1 describes Startup Policy 2023. Older policy landing page conflicts on allowance; omit monetary amounts.');
source('TOURISM', 'Tourism investment and self-employment programme surface', 'Uttarakhand Tourism Development Board', 'https://nivesh.uttarakhandtourism.gov.in/');
source('HOMESTAY', 'Homestay registration declaration', 'Uttarakhand Tourism Development Board', 'https://homestay.uttarakhandtourism.gov.in/signup', 'primary-operative', 'Declaration citing GO 53 vi (1)/2026 dated 5 June 2026: rural location and permanent resident requirement.');
source('HORT', 'State horticulture DBT scheme register', 'Horticulture and Food Processing Department, Uttarakhand', 'https://shm.uk.gov.in/dbt-scheme/', 'primary-summary', 'State DBT register rows 1–7; names verified, benefit slabs and live calls unconfirmed.');
source('AGRI', 'Agriculture scheme register', 'Agriculture Department, Uttarakhand', 'https://agriculture.uk.gov.in/schemes-programmes/');
source('PMFME', 'PMFME state implementation page', 'Horticulture and Food Processing Department, Uttarakhand', 'https://shm.uk.gov.in/pmfme/');
source('LIVESTOCK', 'Mukhyamantri Rajya Pashudhan Mission', 'Animal Husbandry Department, Uttarakhand', 'https://ahd.uk.gov.in/hi/scheme/मुख्यमंत्री-राज्य-पशुधन/', 'primary-summary', 'Department scheme summary lists unit sizes, loan interest support and veterinary-office application route.');
source('GOAT', 'Goat Valley', 'Animal Husbandry Department, Uttarakhand', 'https://ahd.uk.gov.in/hi/scheme/गोट-वैली/');
source('POULTRY', 'Poultry Valley', 'Animal Husbandry Department, Uttarakhand', 'https://ahd.uk.gov.in/hi/scheme/पोल्ट्री-वैली-की-स्थापना/');
source('AH', 'Animal husbandry scheme register', 'Animal Husbandry Department, Uttarakhand', 'https://ahd.uk.gov.in/hi/योजनाएं/');
source('FISH', 'Mukhyamantri Matsya Sampada Yojana', 'Fisheries Department, Uttarakhand', 'https://fisheries.uk.gov.in/scheme/mukhyamantri-matsysa-sampada-yojna/', 'primary-summary', 'Scheme page dated 5 April 2026; apply to district office. Detailed financial component guideline not verified.');
source('COOP', 'Cooperative programme register', 'Cooperative Department, Uttarakhand', 'https://cooperative.uk.gov.in/schemes-programmes/');
source('KISAN', 'Deendayal Upadhyay Sahkarita Kisan Kalyan Yojana', 'Cooperative Department, Uttarakhand', 'https://cooperative.uk.gov.in/scheme/deendayal-upadhay-sahkarita-kisan-kalyan-yojana/');
source('GHASIYARI', 'Mukhyamantri Ghasiyari Kalyan Yojana', 'Cooperative Department, Uttarakhand', 'https://cooperative.uk.gov.in/scheme/chief-minister-ghasiyari-kalyan-yojana/');
source('TAXI', 'Motorcycle Taxi Yojana', 'Cooperative Department, Uttarakhand', 'https://cooperative.uk.gov.in/scheme/kasturba-gandhi-balika-vidyalaya/', 'primary-summary', 'Official index links this mismatched URL slug to Motorcycle Taxi Yojana; page title and application text checked.');
source('ERICK', 'E-Rickshaw Kalyan Yojana', 'Cooperative Department, Uttarakhand', 'https://cooperative.uk.gov.in/scheme/pradhan-mantri-gram-sadak-yojana/', 'primary-summary', 'Official index links this mismatched URL slug to E-Rickshaw Kalyan Yojana; title and body checked.');
source('SOLAR', 'Solar Energy Schemes', 'UREDA, Uttarakhand', 'https://ureda.uk.gov.in/solar-energy-schemes/', 'primary-summary', 'Lists MSSY March 2023 update and Solar Policy 2023; PDF links were not exposed by the parsed index.');
source('DAIRY', 'Dairy programme register', 'Dairy Development Department, Uttarakhand', 'https://dairyvikasuttarakhand.in/');
source('GANGA', 'Ganga Gaay Mahila Dairy Yojana', 'Dairy Development Department, Uttarakhand', 'https://dairyvikasuttarakhand.in/ganga-gaay-mahila-dairy-yojana/');
source('MILK', 'Milk Incentive Yojana', 'Dairy Development Department, Uttarakhand', 'https://dairyvikasuttarakhand.in/milk-incentive-yojna/');
source('RURAL', 'Rural development programme surface', 'Rural Development Department, Uttarakhand', 'https://ukrd.uk.gov.in/dehradun/');
source('SOCIAL', 'Social welfare department and loan notices', 'Social Welfare Department, Uttarakhand', 'https://socialwelfare.uk.gov.in/');
source('MINORITY', 'Minority welfare department', 'Minority Welfare Department, Uttarakhand', 'https://minoritywelfare.uk.gov.in/');
source('SKILL', 'Training and employment programme surface', 'Directorate of Training and Employment, Uttarakhand', 'https://rojgar.uk.gov.in/');
source('FOREST', 'Forest department programme surface', 'Forest Department, Uttarakhand', 'https://forest.uk.gov.in/');
const schemes = [];
function scheme(code, name, source, family, support, benefit, eligible, access, macros, stages, pattern, extra = {}) {
  schemes.push({ code, name, source, family, support, benefit, eligible, access, macros, stages, pattern, ...extra });
}
const industryAccess = 'Submit the single-window CAF and obtain in-principle approval before commercial production; file the incentive claim through the prescribed portal and DIC.';
const industryEligible = 'Eligible Uttarakhand manufacturing MSMEs and permitted non-conventional energy units; location category and policy exclusions apply.';
scheme('MSY-2', 'Mukhyamantri Swarojgar Yojana 2.0', 'MSY', 'Enterprise self-employment', 'Credit-linked self-employment', 'Bank-linked support for setting up enterprises; earlier MSY and Nano merged for 2025-26 to 2029-30.', 'Eligible Uttarakhand self-employment applicants; detailed conditions require DIC confirmation.', 'Confirm the current MSY 2.0 application service and requirements with the District Industries Centre.', [5,6,7,8,9,10,11,12,13,14], [2,3,4,9], null);
for (const [code, name, benefit, eligible] of [
  ['CAPITAL', 'capital subsidy', 'Location and investment-slab based capital assistance on eligible assets.', industryEligible],
  ['DPR', 'DPR reimbursement', 'Reimbursement of 75% of empanelled-consultant DPR fees.', 'New micro manufacturing enterprises meeting the policy conditions.'],
  ['STAMP', 'stamp-duty reimbursement', 'Land stamp-duty reimbursement by area category: A/B 100%, C 75%, D 50%.', industryEligible],
]) scheme(`MSME23-${code}`, `Uttarakhand MSME Policy 2023 — ${name}`, 'MSME', 'MSME incentives', name, benefit, eligible, industryAccess, [5,7,8,9,10], [2], null, { parent: 'Uttarakhand MSME Policy 2023', stage: code === 'CAPITAL' ? 'New or qualifying expansion' : 'New units', caution: 'CAF approval before production is mandatory. Manufacturing eligibility, district category, eligible assets and claim deadlines control sanction; expansion units receive only eligible capital subsidy.' });
scheme('STARTUP23', 'Uttarakhand Startup Policy 2023', 'STARTUP', 'Startup support', 'Startup incubation and financial support', 'Recognition-linked incubation, seed, intellectual-property and ecosystem support; financial terms need operative-policy verification.', 'Recognised innovative startups satisfying state-policy requirements.', 'Check recognition and live incentive services on Startup Uttarakhand through the MSME startup cell.', [6,7,9,10,12], [2,3,6], null);
for (const [code,name] of [['TOURISM23','Tourism Policy 2023 investment incentives'], ['VCSG','Veer Chandra Singh Garhwali Tourism Self-Employment Scheme'], ['PARYATAN','Uttarakhand Paryatan Udhyami Protsahan Yojana']]) scheme(code,name,'TOURISM','Tourism enterprise','Tourism investment support','Programme support for qualifying tourism projects; amounts and approval conditions require current guidelines.','Eligible tourism entrepreneurs under the respective programme.','Check the UTDB investment portal and district tourism office for the scheme application and current sanction process.',[11],[3],null);
scheme('HOMESTAY', 'Deendayal Upadhyay Grah Aawas Homestay Vikas Yojana', 'TOURISM', 'Tourism enterprise', 'Homestay development support', 'Homestay development route; registration is separate from subsidy sanction.', 'Permanent Uttarakhand residents with a rural homestay location under the current registration declaration.', 'Register through the UTDB homestay portal; confirm finance and subsidy application with the district tourism office.', [11], [3], 'homestay|home stay', { caution: 'June 2026 registration declaration requires rural location and permanent residency. Historical policy descriptions mentioning urban homestays should not be relied on. Current subsidy slabs and budget remain unconfirmed.' });
for (const [code,name,pattern] of [
  ['MUSHROOM','Mushroom Production and Marketing','mushroom|spawn|compost'], ['PROTECTED','Chief Minister Protected Cultivation','greenhouse|polyhouse|protected|vegetable'],
  ['POLYTHENE','Greenhouse Polythene Replacement','greenhouse|polyhouse|protected'], ['OFFSEASON','Off-season Vegetable Production','vegetable|tomato|cucumber|capsicum|potato|onion|pea|cabbage|cauliflower|radish|broccoli|carrot|bean'],
  ['BEE','Beekeeping','bee|honey'], ['FENCING','Fencing of Old Orchards','orchard|apple|pear|peach|plum|apricot|citrus|fruit'], ['APPLE','Mission Apple','apple'],
]) scheme(`HORT-${code}`,name,'HORT','Horticulture development','Component-based horticulture support','State DBT programme listed; component amounts, beneficiary share and allocation require district confirmation.','Eligible growers or producers for the named horticulture component.','Confirm component availability and application with the District Horticulture Office.',[1,3],[0,1],pattern);
scheme('PASHUDHAN', 'Mukhyamantri Rajya Pashudhan Mission', 'LIVESTOCK', 'Livestock enterprise', 'Loan interest subsidy', 'Interest support for approved dairy, small-animal, draft-animal and poultry units; current sanction norms apply.', 'Uttarakhand residents establishing prescribed animal units.', 'Apply at the local veterinary hospital with lender consent for the proposed loan.',[2],[0,1],null);
scheme('GOAT-VALLEY', 'Goat Valley', 'GOAT', 'Livestock enterprise', 'Cluster livestock finance', 'Cluster goat-rearing units combining loan, subsidy and beneficiary contribution.', 'Eligible Uttarakhand residents selected for the notified goat cluster.', 'Apply through Apuni Sarkar; block-level scrutiny and cluster selection apply.',[2],[0], 'goat');
scheme('POULTRY-VALLEY', 'Poultry Valley', 'POULTRY', 'Livestock enterprise', 'Poultry input and cooperative credit', 'Poultry inputs and cooperative credit for approved low-input poultry units.', 'Eligible mPACS members with land and required non-default status; women receive preference.', 'Apply through mPACS and the veterinary/cooperative departments.',[2],[0], 'poultry|chicken|layer|broiler');
scheme('CM-MATSYA', 'Mukhyamantri Matsya Sampada Yojana', 'FISH', 'Fisheries development', 'Fishery enterprise support', 'Fish-production and self-employment components; current approved component norms control support.', 'Applicants meeting the selected fisheries component requirements.', 'Submit an application to the concerned district fisheries office.',[3],[0,1], 'fish|trout|carp|aquaculture|hatchery');
scheme('SAHKARITA-KISAN', 'Deendayal Upadhyay Sahkarita Kisan Kalyan Yojana', 'KISAN', 'Cooperative finance', 'Interest-free cooperative credit', 'Indicative official summary: interest-free loans up to ₹3 lakh for individuals and ₹5 lakh for SHGs; sanction terms apply.', 'Eligible small/marginal cooperative members and approved groups.', 'Apply at the cooperative society or bank branch; block selection and PACS/DCB lending follow.',[0,1,2,3,6],[0,1,8],null);
scheme('GHASIYARI', 'Mukhyamantri Ghasiyari Kalyan Yojana', 'GHASIYARI', 'Livestock inputs', 'Subsidised silage and feed', 'Concessional silage and animal-feed distribution through cooperative channels.', 'Covered hill livestock keepers and participating cooperative feed producers.', 'Confirm local availability with the silage distribution centre or cooperative society.',[2],[0,1],null);
scheme('MOTORCYCLE-TAXI', 'Motorcycle Taxi Yojana', 'TAXI', 'Transport self-employment', 'Cooperative vehicle loan', 'Cooperative-bank finance for approved motorcycle taxi self-employment.', 'Eligible permanent Uttarakhand residents satisfying transport and bank conditions.', 'Submit the prescribed loan application to the district cooperative bank for district selection.',[14],[9,3], 'taxi|passenger transport');
scheme('E-RICKSHAW', 'E-Rickshaw Kalyan Yojana', 'ERICK', 'Transport self-employment', 'Cooperative vehicle finance', 'Finance route for approved e-rickshaw operations; current bank terms require confirmation.', 'Eligible Uttarakhand resident drivers meeting scheme and lending conditions.', 'Obtain a vehicle quotation and apply through the relevant cooperative bank.',[14],[9,3], 'rickshaw|taxi|passenger transport');
scheme('MSSY', 'Mukhyamantri Saur Swarojgar Yojana', 'SOLAR', 'Renewable energy', 'Solar self-employment route', 'State solar self-employment programme listed with a March 2023 update; current capacity, tariff and finance norms unverified.', 'Eligible state applicants meeting UREDA project and grid-connectivity conditions.', 'Confirm the current MSSY application and grid feasibility through UREDA and UPCL.',[10],[0,2,3], 'solar|photovoltaic');
scheme('GANGA-GAAY', 'Ganga Gaay Mahila Dairy Yojana', 'GANGA', 'Dairy development', 'Women dairy development support', 'Department-listed women dairy development route; live animal-unit terms and allocation require confirmation.', 'Eligible women dairy applicants under the department rules.', 'Confirm participation through the Dairy Development Department and local milk union.',[2],[0], 'dairy|cow|cattle');
scheme('MILK-INCENTIVE', 'Milk Incentive Yojana', 'MILK', 'Dairy development', 'Milk supply incentive', 'Incentive route for qualifying cooperative milk supply; current rate and payment eligibility unconfirmed.', 'Eligible participating milk producers under the department rules.', 'Confirm eligible milk supply and claim process through the milk cooperative or district dairy office.',[2],[0,8], 'dairy|milk|cattle');
const sharedRoutes = [];
function shared(match, source, macros, stages, pattern) { const issuer = sources.find(s=>s.code===source).issuer; sharedRoutes.push({match,source,macros,stages,pattern,agency:issuer+' / designated national agency or lender',access:'Use the official programme channel and confirm Uttarakhand implementation and current intake with the designated office or lender.',rationale:'Reuse of the common national programme; the state department lists this implementation or policy linkage. Financial facts retain their original national evidence dates.'}); }
shared('EMPLOYMENT-GENERATION-PRO','MSME',[5,8,9,11,12,13,14],[2,3]);
shared('MICRO-FOOD-PROCESSING','PMFME',[5],[2]);
shared('AGRICULTURE-INFRASTRUCTURE','AGRI',[4],[7,8]);
shared('KISAN-CREDIT-CARD','AGRI',[0,1,2,3],[0,1]);
shared('AGRICULTURAL-MECHANIZATION','AGRI',[0],[0,1,3]);
shared('RKVY','AGRI',[0,1,6],[0,1,3]);
shared('SOIL-HEALTH','AGRI',[0],[0,1,6]);
shared('FOOD-NUTRITION','AGRI',[0],[0]);
shared('PARAMPARAGAT','AGRI',[0,1],[0]);
shared('NATIONAL-LIVESTOCK-MISSION','AH',[2],[0,1]);
shared('DAY-NRLM','RURAL',[6,8,14],[2,3,4]);
const agencies = [
  ['INDUSTRIES','MSME',[5,7,8,9,10]], ['STARTUP','STARTUP',[6,7,9,10,12]], ['TOURISM','TOURISM',[11]], ['HORTICULTURE','HORT',[1,3,4,5]],
  ['AGRICULTURE','AGRI',[0,1,4,6]], ['ANIMAL-HUSBANDRY','AH',[2]], ['FISHERIES','FISH',[3]], ['COOPERATION','COOP',[0,1,2,3,4,5,6,8,14]],
  ['DAIRY','DAIRY',[2,5]], ['ENERGY','SOLAR',[10]], ['RURAL','RURAL',[0,1,2,3,5,6,8,11,14]], ['SOCIAL','SOCIAL',[...Array(15).keys()]],
  ['MINORITY','MINORITY',[...Array(15).keys()]], ['SKILLS','SKILL',[13]], ['FORESTS','FOREST',[1,8,10]],
].map(([code,source,macros])=>({code,source,macros,title:sources.find(s=>s.code===source).issuer,outcome:'official-surface-reviewed; unresolved beneficiary details retained as candidates'}));
const candidates = [
  ['Earlier MSY and MSY Nano','duplicate/alias','Merged into MSY 2.0; do not publish as separate current applications.',['MSY']],
  ['MSY 2.0 financial slabs','unverified-lead','Official PDF timed out; indexed first-page text alone does not verify benefit tables.',['MSY']],
  ['Startup 2018 allowance figures','closed/superseded','Official legacy landing page conflicts with 2026 ecosystem report; no allowance amount published.',['STARTUP']],
  ['MSME 2023 remaining interest, tax, quality and cluster components','component','Verify operative sections individually before publishing financial claims.',['MSME']],
  ['Service Sector Policy 2024','unverified-lead','Official PDF retrieval failed; indexed lead retained for operative-rule verification.',['DIRECTORY']],
  ['State Integrated Cooperative Development Project','intermediary-only','Institution-led cluster processing, storage and marketing project; not an automatic individual grant.',['COOP']],
  ['Madho Singh Bhandari Collective Farming','unverified-lead','Official scheme surface located; beneficiary funding and allocation require operative verification.',['COOP']],
  ['Animal husbandry beneficiary schemes and broiler farm support','component','Additional components require current district norms and separate mapping review.',['AH']],
  ['Sailage and Dudharu Pashu and NCDC dairy routes','unverified-lead','Department routes located; confirm continuing sanction terms and convergence with other dairy schemes.',['DAIRY']],
  ['Rural SHG strengthening, House of Himalayas, migration prevention and REAP','unverified-lead','Agency lists routes; operative enterprise support and current access require verification.',['RURAL']],
  ['SC/ST/OBC/Divyang and minority enterprise finance','unverified-lead','Department and loan-notice surfaces located; current corporation slabs and windows unverified.',['SOCIAL','MINORITY']],
  ['Forest, aromatic plants, sericulture, handloom and khadi agency support','unverified-lead','Specialist beneficiary schemes and current allocations remain to be checked.',['FOREST','DIRECTORY']],
  ['Training, urban livelihoods, watershed and sector-policy support','unverified-lead','Agency directory discovery recorded; current enterprise access not established.',['SKILL','DIRECTORY']],
  ['PM Surya Ghar residential rooftop subsidy','outside scope','Residential household subsidy excluded from the enterprise catalogue.',['SOLAR']],
  ['Tourism trek-centre grants and incentive amounts','unverified-lead','Official policy index located, but current operative financial conditions require review.',['TOURISM']],
].map(([name,disposition,reason,sources])=>({name,disposition,reason,sources}));
const failedAccess = [
  {url:'https://startuputtarakhand.uk.gov.in/attachments/MSY.pdf',alternate:'Official indexed notification text',outcome:'failed-access; partial index only'},
  {url:'https://dbt.uk.gov.in/getallschemeservicelist.aspx',alternate:'https://shm.uk.gov.in/dbt-scheme/',outcome:'state DBT failed-access; horticulture register accessible'},
  {url:'https://startuputtarakhand.uk.gov.in/',alternate:'DPIIT Uttarakhand State Report 2026',outcome:'failed-access; official report used for summary only'},
  {url:'https://investuttarakhand.uk.gov.in/themes/backend/acts/act_english1713161936.pdf',alternate:'Official indexed service-policy lead',outcome:'failed-access; candidate retained'},
  {url:'https://ukrd.uk.gov.in/',alternate:'https://ukrd.uk.gov.in/dehradun/',outcome:'alternate agency page accessible'},
  {url:'https://tribalwelfare.uk.gov.in/',alternate:'https://cm.uk.gov.in/department/',outcome:'failed-access; directory only; beneficiary terms pending'},
].map(r=>({...r,checkedAt:'2026-10-02',nextCheckAt:'2026-10-16'}));
const data = { sources, schemes, sharedRoutes, agencies, candidates, failedAccess,
  activities:[['MANDUA','Mandua finger millet cultivation','Hill millets',0,0],['JHANGORA','Jhangora barnyard millet cultivation','Hill millets',0,0],['RURAL-HOMESTAY','Rural Uttarakhand homestay','Rural tourism',11,3],['ERICK','Electric rickshaw passenger service','Local transport',14,9]],
  exclusions:['Other-state records','Shared national benefits and eligibility research','Non-productive welfare schemes','Unverified financial entitlements'],
  limitations:['This is an initial Uttarakhand catalogue. Required agency/activity coverage contains explicit candidate-pending cells; full statewide research acceptance is not claimed.',
    'No route is labelled open now. District allocations, budget availability and current intake remain unconfirmed and are scheduled for recheck on 16 October 2026.',
    'Department summaries establish programme routes; financial or eligibility details without operative evidence are indicative-only.',
    'Shared national claims are reused with their original evidence dates. Common records containing other-state wording are deferred; no national facts or existing state packs were refreshed.',
    'MSY 2.0 direct PDF access failed; only the indexed official first page was available. Startup allowance sources conflict, so no amount is published.',
    'Specialist agencies and schemes in the candidate ledger need further operative-rule verification. Component cost norms are not yet verified; department contacts link to checked official programme pages.'],
  legacy:[{name:'MSY 2020 and MSY Nano 2021',position:'Merged into MSY 2.0',why:'Official MSY 2.0 notification records the merger.',alt:'Confirm MSY 2.0 through DIC.',src:sources.find(s=>s.code==='MSY').url},{name:'Older urban homestay references',position:'Current registration conditions changed',why:'June 2026 declaration requires rural location and permanent state residency.',alt:'Use current UTDB registration rules.',src:sources.find(s=>s.code==='HOMESTAY').url}] };
fs.writeFileSync('research/uttarakhand/research.json',JSON.stringify(data,null,2)+'\n');
