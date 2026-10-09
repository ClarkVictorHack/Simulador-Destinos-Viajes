import { loadScript } from './ui.js';
import { normalize } from './simulator.js';
import { storage } from './storage.js';
const defaultRubric={greeting:10,needsDetection:20,inclusion:15,recommendation:15,documentation:10,objectionHandling:5,reservationClosing:10,interruptionHandling:5,followUp:10};
const defaultPenalties={noBudget:-5,ignoredAccessibility:-10,incompatibleRecommendation:-10,ignoredPet:-5,badPhoneHandling:-5,incompleteReservation:-5};
export function textSignature(text){const n=normalize(text);let hash=2166136261;for(let i=0;i<n.length;i++)hash=Math.imul(hash^n.charCodeAt(i),16777619);return `${n.length}:${hash>>>0}`;}
export async function loadDefaultScenario(){
 try{const response=await fetch('data/default-scenario.json');if(!response.ok)throw new Error('Escenario no disponible');const scenario=validateScenario(await response.json());storage.set('default_cache',scenario);return scenario;}
 catch(error){const cached=storage.get('default_cache');if(cached)return validateScenario(cached);throw error;}
}
export function validateScenario(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('El escenario debe ser un objeto JSON.');
 const s=structuredClone(input);
 if(typeof s.title!=='string'||!s.title.trim())throw new Error('El escenario necesita un título.');
 if(!s.hiddenClientProfile&&s.client)s.hiddenClientProfile=s.client;
 if(!s.hiddenClientProfile||typeof s.hiddenClientProfile!=='object'||Array.isArray(s.hiddenClientProfile))throw new Error('Falta hiddenClientProfile con los datos del cliente.');
 s.id=typeof s.id==='string'?s.id:crypto.randomUUID();s.publicTitle=typeof s.publicTitle==='string'?s.publicTitle:'Escenario importado';
 for(const name of ['packages','questions','conversationRules','interruptions','evaluationRules']){if(s[name]===undefined)s[name]=[];if(!Array.isArray(s[name]))throw new Error(`${name} debe ser una lista.`);}
 s.packages.forEach((p,index)=>{if(!p||typeof p.name!=='string')throw new Error(`Paquete ${index+1}: falta nombre.`);p.id=p.id||`package-${index+1}`;p.initialActivities=p.initialActivities||[];p.laterTourAnswer=p.laterTourAnswer||[];p.traits=p.traits||[];for(const k of ['initialActivities','laterTourAnswer','traits'])if(!Array.isArray(p[k])||p[k].some(x=>typeof x!=='string'))throw new Error(`${p.name}: ${k} debe ser una lista de textos.`);p.price=p.price??null;if(p.price!==null&&!p.demoPrice)throw new Error('Los precios importados deben identificarse como referenciales con demoPrice: true.');});
 if(new Set(s.packages.map(p=>p.id)).size!==s.packages.length)throw new Error('Los identificadores de paquetes deben ser únicos.');
 s.questions.forEach(q=>{if(!q||typeof q.text!=='string'||typeof q.intent!=='string'||typeof q.id!=='string'||!Array.isArray(q.checks))throw new Error('Cada pregunta necesita id, text, intent y checks.');for(const c of q.checks){if(typeof c!=='string'||c.length>150||/\([^)]*[+*][^)]*\)[+*{]/.test(c))throw new Error('Patrón de respuesta no válido.');try{new RegExp(c);}catch{throw new Error('Hay una expresión de verificación inválida.');}}});
 s.conversationRules.forEach(r=>{if(!r||typeof r.intent!=='string'||typeof r.response!=='string')throw new Error('Las reglas necesitan intent y response.');});
 s.evaluationRules.forEach(r=>{if(!r||typeof r.metric!=='string'||!Array.isArray(r.checks))throw new Error('Cada regla de evaluación necesita metric y checks.');for(const c of r.checks){if(typeof c!=='string'||c.length>150||/\([^)]*[+*][^)]*\)[+*{]/.test(c))throw new Error('Patrón de evaluación no válido.');try{new RegExp(c);}catch{throw new Error('Patrón de evaluación no válido.');}}});
 const p=s.hiddenClientProfile;
 if(p.travelers?.total!==undefined&&p.travelers.total!==null&&(!Number.isInteger(p.travelers.total)||p.travelers.total<1||p.travelers.total>20))throw new Error('El número de viajeros debe ser de 1 a 20.');
 if(p.requestedServices!==undefined&&(!Array.isArray(p.requestedServices)||p.requestedServices.some(x=>typeof x!=='string')))throw new Error('requestedServices debe ser una lista de textos.');
 if(p.accessibility?.avoid!==undefined&&(!Array.isArray(p.accessibility.avoid)||p.accessibility.avoid.some(x=>typeof x!=='string')))throw new Error('accessibility.avoid debe ser una lista de textos.');
 s.rubric=s.rubric||defaultRubric;
 if(Object.keys(defaultRubric).some(k=>typeof s.rubric[k]!=='number'||s.rubric[k]<0)||Math.abs(Object.values(s.rubric).reduce((a,b)=>a+b,0)-100)>.01)throw new Error('La rúbrica debe contener las nueve competencias y sumar 100.');
 s.penalties={...defaultPenalties,...s.penalties};if(Object.values(s.penalties).some(x=>typeof x!=='number'||x>0||x< -100))throw new Error('Las penalizaciones deben estar entre -100 y 0.');
 s.reservationRules=s.reservationRules||{};s.metadata=s.metadata||{};s.characters=s.characters||{};s.aliases=s.aliases||{};
 return s;
}
export async function readDocx(file){if(!window.mammoth)await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js');const result=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return result.value;}
export async function readPdf(file){
 const pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
 const task=pdfjs.getDocument({data:await file.arrayBuffer(),isEvalSupported:false});const pdf=await task.promise;let text='';
 try{for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);const content=await page.getTextContent();text+=content.items.map(i=>i.str+(i.hasEOL?'\n':' ')).join('')+'\n';}}finally{await pdf.destroy();}return text;
}
export async function importScenario(file,base){
 if(file.size>10*1024*1024)throw new Error('El archivo supera el límite de 10 MB.');
 const extension=file.name.split('.').pop().toLowerCase();
 if(extension==='json'){let parsed;try{parsed=JSON.parse(await file.text());}catch{throw new Error('El JSON tiene un formato inválido. Revise comillas, comas y llaves.');}return {scenario:validateScenario(parsed),rawText:'',warnings:['Revise los campos antes de guardar.']};}
 if(!['txt','docx','pdf'].includes(extension))throw new Error('Formato no compatible. Use DOCX, PDF, TXT o JSON.');
 const rawText=extension==='txt'?await file.text():extension==='docx'?await readDocx(file):await readPdf(file);
 if(rawText.trim().length<30)throw new Error('No encontramos suficiente texto. Los PDF escaneados requieren reconocimiento de texto previo.');
 return normalizeScenario(rawText,base);
}
// Deliberately conservative: explicit labels and recognizable speaker/section blocks only.
// The supplied script has a fingerprint; changed scripts are never silently filled from the base.
export function normalizeScenario(rawText,base){
 const n=normalize(rawText);const fingerprint=base&&['angelica navarro','mariposario de gamboa','isla taboga','30000','48 horas'].every(x=>n.replace(/30 000/g,'30000').includes(x));
 if(fingerprint && normalize(rawText).includes('1500')&&normalize(rawText).includes('10 anos con autismo')){
   // Only the exact supplied source can reuse the verified extraction stored in JSON.
   const source=storage.get('source_fingerprint');
   if(source===textSignature(rawText)){const scenario=structuredClone(base);scenario.id=crypto.randomUUID();scenario.metadata={...scenario.metadata,reviewed:false,imported:true};return {scenario,rawText,warnings:['Guion original reconocido. Revise las inconsistencias de tours y el alias Premium.']};}
 }
 const lines=rawText.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const label=(...names)=>{for(const line of lines){for(const name of names){const match=line.match(new RegExp(`^${name}\\s*:\\s*(.+)$`,'i'));if(match)return match[1];}}return null;};
 const explicitBudget=label('Presupuesto');const amount=explicitBudget?.match(/(?:USD|\$)?\s*(\d[\d.,]*)/i);const budget=amount?Number(amount[1].replace(/[.,](?=\d{3}\b)/g,'').replace(',','.')):null;
 const total=label('Pasajeros','Viajeros')?.match(/^\d+/)?.[0];const destination=label('Destino');
 const characters={};for(const name of ['Empleado','Cliente','Cliente por teléfono'])if(new RegExp(name+'\\s*:', 'i').test(rawText))characters[name]=name;
 const sectionNames=['Recepción','Identificación de necesidades','Presentación de opciones','Resolución de dudas','Reserva','Seguimiento','Atención telefónica'];
 const sections=sectionNames.filter(s=>n.includes(normalize(s)));
 const conversationRules=[];const blocks=rawText.matchAll(/Empleado:\s*([\s\S]*?)Cliente:\s*([\s\S]*?)(?=Empleado:|$)/gi);
 // Repeated/ambiguous dialogue remains in source preview for the editor, without invented intent mappings.
 const dialogue=[...blocks].map(m=>({advisor:m[1].trim(),client:m[2].trim()}));
 const scenario=validateScenario({id:crypto.randomUUID(),title:label('Título','Titulo','Escenario')||lines[0].slice(0,140),publicTitle:'Escenario importado',subtitle:'Atención presencial',difficulty:'Por revisar',duration:null,context:'Consulte al cliente para descubrir sus necesidades.',objective:'Identificar las necesidades del cliente y ofrecer atención personalizada según el guion importado.',metadata:{imported:true,reviewed:false,sections,dialogue},characters,hiddenClientProfile:{tripType:label('Tipo de viaje'),destination,dates:label('Fechas'),travelers:{total:total?Number(total):null,adults:null,children:null},purpose:label('Motivo'),budget:{maxPerPerson:budget,currency:'USD'},requestedServices:label('Servicios')?.split(/[,;]/).map(x=>x.trim())||[],accessibility:{condition:label('Necesidades especiales','Discapacidad'),hasSpecialNeed:label('Necesidades especiales','Discapacidad')?true:null,avoid:[]},pet:{travelsWithPet:label('Mascota')?/^s[ií]/i.test(label('Mascota')):null,species:null,size:null,weight:null}},packages:[],questions:[],conversationRules,interruptions:[],reservationRules:{},evaluationRules:[],rubric:defaultRubric});
 return {scenario,rawText,warnings:['No pudimos interpretar completamente este archivo. Revise los campos detectados antes de guardar.','Los valores vacíos están pendientes de revisión; no se heredan datos del escenario predeterminado.']};
}
