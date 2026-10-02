import fs from 'node:fs';
const common = JSON.parse(fs.readFileSync('scheme-data/common/schemes.json')).schemes;
const sources = [];
const addSource = (code,title,issuer,url,locator) => sources.push({code,title,issuer,url,locator,classification:'primary-summary'});
addSource('NATX-MSME','MSME schemes at a glance, January–March 2026','Ministry of MSME','https://www.msme.gov.in/static/uploads/2026/05/3040dc36fd7023c4d4d1f647ee816165.pdf','National programme inventory; current eligibility and financial evidence are inherited, not refreshed.');
addSource('NATX-MSMEOFFICE','MSME development office directory','Development Commissioner MSME','https://cluster.dcmsme.gov.in/CFCRPT/CFC_DiDirectory.aspx','MSME DFO Haldwani, Uttarakhand; local facilitation route.');
addSource('NATX-RAMP','RAMP scheme guidelines','Ministry of MSME','https://ramp.msme.gov.in/ramp/scheme-guidelines','TEAM, GIFT, SPICE and ODR programme links.');
addSource('NATX-SIDBI','SIDBI branch network and financing menu','SIDBI','https://www.sidbi.in/en/branch-office','Dehradun, Haridwar and Rudrapur branch entries; loan, PRAYAAS and TReDS menus.');
addSource('NATX-NSIC','NSIC product and application surfaces','NSIC','https://www.nsic.co.in/Info/Download?AspxAutoDetectCookieSupport=1','Raw material assistance, single point registration and application forms.');
addSource('NATX-NCGTC','Mutual Credit Guarantee Scheme member lenders','NCGTC','https://www.ncgtc.in/hi-IN/product-details/MCGSMSME/Mutual-Credit-Guarantee-Scheme-for-MSMEs-%28MCGS-MSME%29','Member-lender route; borrower cannot apply directly for a cash grant.');
addSource('NATX-MUDRA','PMMY finance route','Department of Financial Services','https://financialservices.gov.in/pradhan-mantri-mudra-yojana-pmmy','Banks, NBFCs and microfinance institutions; eligibility is lender-appraised.');
addSource('NATX-CGTMSE','CGTMSE member lending institutions','CGTMSE','https://www.cgtmse.in/Home/VS/94','Guarantee through an eligible member lender.');
addSource('NATX-PHARMA','Department of Pharmaceuticals scheme and application index','Department of Pharmaceuticals','https://pharma-dept.gov.in/schemes/scheme-promotion-bulk-drug-','SPI/RPTUAS and SMDI operational guidelines and application links; project and call conditions apply.');
addSource('NATX-IDEX','iDEX application FAQ','Defence Innovation Organisation','https://idex.gov.in/faq','Challenge/rolling Open Challenge application through iDEX; selection required.');
addSource('NATX-BIRAC','BIRAC programmes and calls','BIRAC','https://www.birac.nic.in/','BIG programme; latest open call not established.');
addSource('NATX-GENESIS','GENESIS programme surface','MeitY Startup Hub','https://msh.meity.gov.in/schemes/genesis','Approved implementing-agency route for tier-II/III ecosystems.');
addSource('NATX-STPI','STPI startup incubation locations','STPI','https://startup.stpi.in/','NGIS lists Dehradun; cohort selection and current call must be checked.');
addSource('NATX-ECGC','Small Exporters Policy application','ECGC','https://main.ecgc.in/small-exporters-policy-sep/','Proposal and insurance route for eligible exporters; premium and underwriting apply.');
addSource('NATX-AA','Advance Authorisation exporter FAQ','DGFT','https://content.dgft.gov.in/Website/dgftprod/218ff804-081d-425f-95a4-ff4b7c5e3575/DGFT%20FAQs%20-%20Advance%20Authorisation%20v1.0.pdf','IEC profile, authorisation application and export obligation; access evidence only.');
addSource('NATX-EPCG','EPCG exporter user manual v4.0','DGFT','https://content.dgft.gov.in/Website/DGFT_EPCG_User_Manual_for_Exporters_v4.0.pdf','Online authorisation workflow; current national terms retained from shared catalogue.');
addSource('NATX-IREDA','IREDA financing products','IREDA','https://ireda.in/IredaWebPortal/loan-products/schemes','Project financing through IREDA appraisal; debt, not subsidy.');
addSource('NATX-TDF','Technology Development Fund portal','DRDO','https://tdf.drdo.gov.in/','Defence technology projects and application process; project invitations govern access.');
addSource('NATX-DLI','Design infrastructure support application','MeitY / C-DAC','https://www.chips-dli.gov.in/DLI/EDANew','Domestic startups/MSMEs register and file EDA tool request; semiconductor design activities.');
addSource('NATX-ECMS','Electronics Component Manufacturing Scheme portal','MeitY','https://ecms.meity.gov.in/notification','Notification and window amendments; different component segments have different application periods.');
addSource('NATX-PMBJK','Janaushadhi Kendra opening requirements','PMBI','https://janaushadhi.gov.in/pdf/English-OpenKendra.pdf','Online application, pharmacy requirements and premises conditions.');
const sharedRoutes=[];
const enterprise=[2,3,4,5,6,7,8,9,10,11];
function route(match,source,macros,stages,pattern,access){
 const scheme=common.find(s=>s.id.includes(match));if(!scheme)throw Error(match);
 sharedRoutes.push({match:scheme.id,source,macros,stages,pattern,agency:sources.find(s=>s.code===source).issuer,access:access??'Use the national programme application channel; Uttarakhand MSME DFO/DIC can facilitate. Programme-specific applicant, project and selection conditions apply.',rationale:'National programme has no other-state geographic restriction; Uttarakhand enterprise access uses the documented national channel. This mapping is conditional on the programme applicant and activity tests.'});
}
for(const key of ['PMEGP-2ND','SPECIAL-CREDIT-LINKED','MICRO-AND-SMALL-ENTERPRISES-CLUSTER','SFURTI','SUSTAINABLE-ZED','COMPETITIVE-LEAN','PUBLIC-PROCUREMENT','NATIONAL-SC-ST-HUB','PROCUREMENT-AND-MARKETING','INTERNATIONAL-COOPERATION','ENTREPRENEURSHIP-AND-SKILL','ASPIRE','SELF-RELIANT-INDIA','MSME-INNOVATIVE']){
 let macros=[5,7,8,9,10,12,13,14],stages=enterprise,pattern;
 if(key==='SFURTI'){macros=[5,8];pattern='craft|handloom|weav|wool|bamboo|wood|khadi|traditional|honey';}
 if(key==='MICRO-AND-SMALL-ENTERPRISES-CLUSTER')stages=[11];
 if(key==='COMPETITIVE-LEAN')stages=[2];
 if(key==='ASPIRE'){macros=[6,13];pattern='incubat|training|skill|entrepreneur';}
 if(key==='MSME-INNOVATIVE')stages=[2,6];
 route(key,'NATX-MSME',macros,stages,pattern);
}
for(const key of ['MSE-GIFT','MSE-SPICE','MSME-TEAM','MSE-ONLINE-DISPUTE'])route(key,'NATX-RAMP',[5,7,8,9,10,12,13,14],key==='MSE-SPICE'?[5]:enterprise);
route('MUDRA-YOJANA','NATX-MUDRA',[2,3,5,7,8,9,10,11,12,13,14],enterprise,undefined,'Apply through a participating bank, NBFC or microfinance institution; repayment and lender appraisal are required.');
route('CGTMSE','NATX-CGTMSE',[5,7,8,9,10,11,12,13,14],enterprise,undefined,'Request eligible guarantee-backed credit from a CGTMSE member lender; the lender applies for guarantee cover.');
for(const key of ['SIDBI-SPEED','SIDBI-PRAYAAS','SIDBI-DIGITAL','TREDS'])route(key,'NATX-SIDBI',[5,7,8,9,10,11,12,13,14],enterprise,undefined,key==='TREDS'?'Register with a permitted TReDS platform; accepted buyer invoices and financier bidding are required.':'Contact SIDBI via its customer portal or Uttarakhand branches; product-specific lending eligibility applies.');
for(const key of ['NSIC-RAW','NSIC-SINGLE'])route(key,'NATX-NSIC',[5,7,8,9,10],enterprise,undefined,'Apply to NSIC through its official forms/registration channel; the Dehradun branch is the local access point.');
route('MUTUAL-CREDIT-GUARANTEE','NATX-NCGTC',[5,7,8,9,10], [2,5,6],undefined,'Approach an eligible member lender for project finance; member lender seeks NCGTC guarantee, subject to current scheme conditions.');
for(const key of ['REVAMPED-PHARMACEUTICAL','ASSISTANCE-TO-PHARMACEUTICAL'])route(key,'NATX-PHARMA',[7],[2,6,11], 'pharma|drug|medicine|laborator|cluster', 'Use the Department of Pharmaceuticals scheme application/implementing agency channel; current guideline, component and approval conditions apply.');
for(const key of ['SMDI-MARGINAL','SMDI-MEDICAL','SMDI-COMMON'])route(key,'NATX-PHARMA',[7],[2,6,11],'medical|device|diagnostic|testing', 'Use the SMDI online application route; support depends on component eligibility and the relevant invitation/approval process.');
route('INNOVATIONS-FOR-DEFENCE','NATX-IDEX',[7,9,12],[2,6],undefined,'Register on iDEX and submit to an eligible challenge or Open Challenge; award requires selection.');
route('BIOTECHNOLOGY-IGNITION','NATX-BIRAC',[6,7,12],[6],undefined,'Apply through BIRAC BIG calls and approved BIG partners; current call dates require confirmation.');
route('GENESIS','NATX-GENESIS',[12],[3,6],undefined,'Apply through an approved GENESIS implementing agency and its current startup selection process.');
route('STPI-NEXT','NATX-STPI',[12],[3,6],undefined,'Contact STPI Dehradun/NGIS for current cohort selection and programme terms.');
route('ECGC','NATX-ECGC',[0,1,4,5,7,8,9,12],[10],undefined,'Submit the policy proposal to ECGC; exporter underwriting, premium and policy terms apply.');
route('ADVANCE-AUTHORISATION','NATX-AA',[5,7,8,9],[2,10],undefined,'Use DGFT IEC-linked Advance Authorisation application; imported-input use and export obligations apply.');
route('EPCG','NATX-EPCG',[5,7,8,9,11,12],[2,3,10],undefined,'Use the DGFT EPCG authorisation workflow; fulfil the prescribed export obligation.');
route('IREDA','NATX-IREDA',[10],[2,3,11], 'solar|hydro|energy|biogas|biofuel|charging|renewable', 'Apply to IREDA for project appraisal under the appropriate current financing product.');
route('DRDO','NATX-TDF',[7,9,12],[2,6],undefined,'Apply through the TDF portal against eligible defence-technology projects; selection and development milestones apply.');
route('DESIGN-LINKED','NATX-DLI',[9,12],[2,6],'electronic|semiconductor|chip|design','Register on DLI and submit the EDA tool request for eligible domestic semiconductor-design work.');
route('ELECTRONICS-COMPONENT','NATX-ECMS',[9],[2],'electronic|component|battery|semiconductor','Apply through ECMS only for a target segment with a valid application window. Earlier A/B/C/E windows closed; verify amendments and the eligible segment before applying.');
route('JANAUSHADHI','NATX-PMBJK',[7,14],[4],'pharma|medicine|drug|medical|pharmacy','Apply online to PMBI for opening a Kendra; premises, pharmacist, drug licence and programme approval conditions apply.');
const candidates=[
 {name:'Expired or time-limited shared export/commodity calls',disposition:'candidate-pending',reason:'RoDTEP shared evidence ends 30 September 2026; APEDA/Tea 2021–26 periods and SPICED August call need successor/current-window evidence. No active entitlement inferred.',sources:['NATX-AA']},
 {name:'ADEETIE cluster coverage',disposition:'candidate-pending',reason:'Official BEE brochure identifies Kashipur, but exact activity/cluster eligibility requires project-level confirmation; not mapped as statewide general energy support.',sources:['NATX-MSMEOFFICE']},
 {name:'Coir Vikas and legacy TIDE 2.0',disposition:'candidate-pending',reason:'Current Uttarakhand access/intake was not established; geographical and successor restrictions require verification.',sources:['NATX-MSME','NATX-GENESIS']}
];
const agencies=[{code:'NATX-MSME',source:'NATX-MSMEOFFICE',macros:[5,7,8,9,10,12,13,14],title:'MSME Development and Facilitation Office Haldwani',outcome:'National MSME programme inventory and local facilitation checked'},{code:'NATX-FINANCE',source:'NATX-SIDBI',macros:[5,7,8,9,10,11,12,13,14],title:'National MSME lenders and NSIC',outcome:'Branch and national product access checked'},{code:'NATX-SPECIALIST',source:'NATX-PHARMA',macros:[7,9,12],title:'National specialist technology and pharmaceuticals programmes',outcome:'Application surfaces checked; calls remain conditional'},{code:'NATX-EXPORT',source:'NATX-AA',macros:[0,1,4,5,7,8,9,11,12],title:'DGFT and ECGC export access',outcome:'National authorisation and insurance route checked'}];
fs.writeFileSync('research/uttarakhand/expansion/national.json',JSON.stringify({sources,sharedRoutes,schemes:[],candidates,agencies,failedAccess:[],coverageNotes:['Direct national access checked separately from state adoption. Financial facts retain shared catalogue dates; no national refresh is claimed.']},null,2));
console.log(sharedRoutes.length);
