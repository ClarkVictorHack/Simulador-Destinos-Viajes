import { escapeHTML as e } from './ui.js';
import { normalize, calculatePackageScores } from './simulator.js';

export const steps = ['El viaje', 'Servicios', 'Necesidades especiales', 'Propuesta', 'Cierre y seguimiento'];
const check = (name, label, data) => `<label class="check-inline"><input type="checkbox" name="${name}" ${data[name]?'checked':''}>${e(label)}</label>`;
const text = (name,label,data,type='text',extra='') => `<label class="field">${e(label)}<input name="${name}" type="${type}" value="${e(data[name]??'')}" ${extra}></label>`;
const select = (name,label,options,data) => `<label class="field">${e(label)}<select name="${name}" required><option value="">Selecciona una opción</option>${options.map(([value,label])=>`<option value="${e(value)}" ${data[name]===value?'selected':''}>${e(label)}</option>`).join('')}</select></label>`;
export function ensureQuestionnaire(state) {
  state.questionnaire ??= {version:1,step:0,data:{},completed:[]};
  return state.questionnaire;
}

// The answers are the source of the generated profile. Original scenario data is never mutated.
export function generateFromForm(source,data) {
  const scenario=structuredClone(source);
  const services=['Hospedaje','Tours','Traslados internos','Alimentación'].filter((_,i)=>data[`service${i}`]);
  const needs=data.special==='yes', pet=data.pet==='yes';
  scenario.hiddenClientProfile={
    tripType:data.tripType||null,destination:data.destination?.trim()||null,
    dates:data.start&&data.end?`${data.start} — ${data.end}`:null,
    travelers:{adults:Number(data.adults||0),children:Number(data.children||0),total:Number(data.adults||0)+Number(data.children||0)},
    purpose:data.purpose||null,budget:{maxPerPerson:data.budget?Number(data.budget):null,currency:'USD'},requestedServices:services,
    wantsAllInclusive:data.meals==='full',
    accessibility:{hasSpecialNeed:needs,condition:needs?data.condition?.trim()||null:null,supervision:needs?data.supervision?.trim()||null:null,avoid:needs&&data.sensory?.trim()?[data.sensory.trim()]:[]},
    pet:{travelsWithPet:pet,species:pet?data.species?.trim()||null:null,size:pet?data.petSize?.trim()||null:null,weight:pet?data.petWeight?.trim()||null:null}
  };
  // The current catalog is tied to the supplied destination; do not invent trips to other places.
  const matches=Boolean(data.destination&&normalize(data.destination)===normalize(source.hiddenClientProfile.destination));
  if(!matches){scenario.packages=[];scenario.questions=[];scenario.reservationRules={};}
  const p=scenario.hiddenClientProfile;
  const discovered={};
  const add=(key,value)=>{if(value!==null&&value!==undefined&&value!=='')discovered[key]={value,status:'discovered'};};
  add('tripType',p.tripType);add('destination',p.destination);add('dates',p.dates);
  if(p.travelers.total)add('travelers',`${p.travelers.total} personas · ${p.travelers.adults} adultos y ${p.travelers.children} niños`);
  add('purpose',p.purpose);add('budget',p.budget.maxPerPerson);if(services.length)add('services',services.join(', '));
  if(needs){add('accessibility',p.accessibility.condition);add('sensory',p.accessibility.avoid.join(', '));add('supervision',p.accessibility.supervision);}
  if(data.pet)add('pet',pet?(p.pet.species||'Sí'):'No viaja con mascota');
  if(pet){add('petSize',p.pet.size);add('petWeight',p.pet.weight);}
  const ranked=calculatePackageScores({discovered},scenario);
  // Explicit preferences supplement the original rubric without implying a verified price.
  for(const pkg of ranked){
    if(data.priority==='comfort'&&pkg.traits?.includes('comfort')){pkg.score+=3;pkg.reasons.push('Prioridad: comodidad');}
    if(data.priority==='quiet'&&pkg.traits?.includes('quiet')){pkg.score+=3;pkg.reasons.push('Prioridad: tranquilidad');}
    if(data.transport==='private'&&pkg.traits?.includes('private')){pkg.score+=2;pkg.reasons.push('Solicita transporte privado');}
  }
  ranked.sort((a,b)=>b.score-a.score);
  return {scenario,discovered,ranked,matches};
}

export function validateStep(step,data){
  if(step===0){
    if(!data.tripType||!data.destination?.trim()||!data.purpose||!data.start||!data.end)return 'Completa el destino, las fechas y el motivo del viaje.';
    if(data.end<data.start)return 'La fecha de regreso debe ser igual o posterior a la salida.';
    if(data.adults==null||data.adults===''||data.children==null||data.children==='')return 'Completa el número de adultos y niños (0 si no hay niños).';
    const adults=Number(data.adults),children=Number(data.children);
    if(!Number.isInteger(adults)||adults<1||!Number.isInteger(children)||children<0||adults+children>20)return 'Indica al menos un adulto y un máximo de 20 viajeros en total.';
  }
  if(step===1){if(!Number.isFinite(Number(data.budget))||Number(data.budget)<=0)return 'Indica un presupuesto mayor que cero.';if(![0,1,2,3].some(i=>data[`service${i}`]))return 'Selecciona al menos un servicio.';if(!data.meals||!data.transport||!data.priority)return 'Selecciona alimentación, transporte y prioridad.';}
  if(step===2){if(!data.special||!data.pet)return 'Indica si hay necesidades especiales y si viaja una mascota.';if(data.special==='yes'&&(!data.condition?.trim()||!data.supervision?.trim()||!data.sensory?.trim()))return 'Completa las necesidades especiales. Si no se conoce un dato, escribe “Por verificar”.';if(data.pet==='yes'&&!data.species?.trim())return 'Indica el tipo de mascota.';}
  return null;
}

export function selectFormPackage(state,source,id){
  const q=ensureQuestionnaire(state),output=generateFromForm(source,q.data);
  if(!output.ranked.some(p=>p.id===id))return false;
  if(state.selectedPackage!==id){state.reservationCompleted=false;state.actions.paymentSimulated=false;delete state.actions.paymentMethod;q.completed=q.completed.filter(i=>i<3);}
  state.selectedPackage=id;return true;
}

export function storeFormStep(state,values){
  const q=ensureQuestionnaire(state);
  const changed=JSON.stringify(q.data)!==JSON.stringify({...q.data,...values});
  q.data={...q.data,...values};
  if(changed&&q.step<3){
    // Invalidate dependent output when a traveler changes their original answers.
    state.selectedPackage=null;state.reservationCompleted=false;state.followUpCompleted=false;
    state.actions={};state.metrics={};state.answeredQuestions=[];state.incomingCallHandled=false;state.callPending=false;
    q.completed=q.completed.filter(i=>i<=q.step);
  }
}

export function evaluateForm(state,source){
  const q=ensureQuestionnaire(state),d=q.data,generated=generateFromForm(source,d);
  const labels={travel:'Datos del viaje',services:'Servicios y presupuesto',needs:'Necesidades especiales',proposal:'Propuesta seleccionada',reservation:'Reserva simulada',followUp:'Plan de seguimiento'};
  const checks={travel:!validateStep(0,d),services:!validateStep(1,d),needs:!validateStep(2,d),proposal:generated.ranked.some(p=>p.id===state.selectedPackage),reservation:state.reservationCompleted,followUp:['email','whatsapp','advice','future'].filter(k=>d[k]).length/4};
  const weights={travel:25,services:20,needs:15,proposal:15,reservation:15,followUp:10};
  const categories=Object.fromEntries(Object.entries(checks).map(([k,v])=>[k,Math.round(Number(v)*100)]));
  const totalScore=Math.round(Object.entries(checks).reduce((n,[k,v])=>n+Number(v)*weights[k],0));
  const completedFields=Object.keys(checks).filter(k=>Number(checks[k])===1);
  const missingFields=Object.keys(checks).filter(k=>Number(checks[k])<1).map(k=>labels[k]);
  return {id:state.id,kind:'questionnaire',scenario:`${source.publicTitle} · Formulario de viaje`,date:new Date(state.endTime||Date.now()).toISOString(),totalScore,rawScore:totalScore,categories,labels,deductions:[],strengths:completedFields.map(k=>`${labels[k]} completado.`),improvements:missingFields.map(k=>`Completar: ${k.toLowerCase()}.`),completedFields,missingFields,
    feedback:'Este resultado mide la completitud del formulario, la selección de una propuesta disponible y las etapas registradas. No evalúa habilidades conversacionales ni acredita que se hayan realizado envíos o reservas reales.'};
}

export function questionnaireView(state,source){
  const q=ensureQuestionnaire(state),d=q.data,output=generateFromForm(source,d);
  const formFields=[
    ()=>`<div class="form-grid">${select('tripType','¿Qué tipo de viaje deseas?',[['Nacional','Nacional'],['Internacional','Internacional']],d)}${text('destination','¿A dónde deseas viajar?',d,'text','required maxlength="80"')}${text('start','Fecha de salida',d,'date','required')}${text('end','Fecha de regreso',d,'date','required')}${text('adults','Adultos',d,'number','required min="1" max="20"')}${text('children','Niños',d,'number','required min="0" max="19"')}${select('purpose','¿Cuál es el motivo?',[['Turismo','Turismo'],['Negocios','Negocios'],['Visita familiar','Visita familiar'],['Otro','Otro']],d)}</div>`,
    ()=>`<div class="form-grid">${text('budget','Presupuesto máximo por persona (USD)',d,'number','required min="1" step="0.01"')}${select('priority','¿Qué priorizas?',[['quiet','Tranquilidad'],['comfort','Comodidad'],['balance','Equilibrio entre actividades y descanso']],d)}${select('meals','Alimentación',[['breakfast','Desayuno'],['partial','Desayuno y almuerzo'],['full','Alimentación completa']],d)}${select('transport','Traslados',[['standard','Traslados compartidos o internos'],['private','Traslados privados']],d)}</div><fieldset><legend>¿Qué servicios deseas incluir?</legend><div class="question-checks">${['Hospedaje','Tours','Traslados internos','Alimentación'].map((s,i)=>check(`service${i}`,s,d)).join('')}</div></fieldset>`,
    ()=>`<div class="form-grid">${select('special','¿Hay necesidades especiales?',[['yes','Sí'],['no','No']],d)}${select('pet','¿Viajan con mascota?',[['yes','Sí'],['no','No']],d)}</div><fieldset data-conditional="special" ${d.special==='yes'?'':'hidden'}><legend>Atención personalizada</legend>${text('condition','Necesidad o adaptación requerida',d,'text','maxlength="200"')}${text('supervision','Acompañamiento o supervisión',d,'text','maxlength="200"')}${text('sensory','Sensibilidades que se deben considerar',d,'text','maxlength="200"')}</fieldset><fieldset data-conditional="pet" ${d.pet==='yes'?'':'hidden'}><legend>Mascota</legend><div class="form-grid">${text('species','Tipo de mascota',d,'text','maxlength="80"')}${text('petSize','Tamaño (o Por verificar)',d,'text','maxlength="80"')}${text('petWeight','Peso (o Por verificar)',d,'text','maxlength="80"')}</div></fieldset>`,
    ()=>`<p class="notice">Propuestas generadas con tus respuestas. El guion no incluye precios por paquete; la cotización queda pendiente.</p>${output.ranked.length?`<div class="question-packages">${output.ranked.map((p,i)=>`<label class="question-package"><input type="radio" name="package" value="${e(p.id)}" ${state.selectedPackage===p.id?'checked':''} required><div><span class="badge">${i===0?'Mayor afinidad con tus respuestas':e(p.category)}</span><h3>${e(p.name)}</h3><p>${e(p.accommodation)} · ${e(p.meals)}</p><p>${e(p.transport)}</p><p class="small">${e(p.initialActivities.join(' · '))}</p><p class="small muted">${e(p.reasons.join(' · ')||'Sin preferencias suficientes para distinguir esta opción.')}</p></div></label>`).join('')}</div>`:'<p>No hay paquetes del guion para este destino. Regresa al primer paso o importa un escenario correspondiente. Puedes finalizar para revisar el formulario sin crear una reserva.</p>'}`,
    ()=>`<h3>Información generada para esta atención</h3>${state.actions.callbackReturned?`<p class="notice"><strong>Llamada devuelta: consulta sobre visa para Europa.</strong><br>${e(source.callbackAnswer||'Orientación pendiente de revisión.')}</p>`:''}<p class="notice">Información utilizada según el escenario proporcionado. Condiciones académicas sujetas a verificación.</p><ul class="question-reference">${output.scenario.questions.filter(x=>x.id!=='tours'&&(d.special==='yes'||x.intent!=='answer_disability_documents')&&(d.pet==='yes'||x.intent!=='answer_pet_documents')).map(x=>`<li><strong>${e(x.text)}</strong><br>${e(x.answer)}</li>`).join('')||'<li>Requisitos pendientes: no hay información verificada para este destino en el escenario.</li>'}</ul><p>${e(output.scenario.reservationRules.payment||'Condiciones de pago pendientes de revisión.')}</p><p>${e(output.scenario.reservationRules.cancellation||'Condiciones de cancelación pendientes de revisión.')}</p><fieldset><legend>¿Qué acciones realizarás para el seguimiento?</legend><div class="question-checks">${check('email','Enviar resumen por correo',d)}${check('whatsapp','Enviar información por WhatsApp',d)}${check('advice','Compartir consejos antes del viaje',d)}${check('future','Hacer seguimiento después del viaje',d)}</div></fieldset><p class="small muted">Estas opciones forman el plan de seguimiento. No se envían mensajes reales.</p>`
  ];
  return `<div class="page-heading"><div class="eyebrow">Cuestionario de atención</div><h1>Diseña el viaje paso a paso</h1><p>Completa el formulario. Tus respuestas generan el resumen, las propuestas y los siguientes pasos.</p></div><ol class="question-steps">${steps.map((s,i)=>`<li class="${i===q.step?'current':''}">${i+1}. ${s}</li>`).join('')}</ol><div class="question-layout"><section class="card"><span class="badge">Paso ${q.step+1} de ${steps.length}</span><h2 style="margin-top:16px">${steps[q.step]}</h2><form id="questionnaire-form"><fieldset class="question-body" ${state.endTime?'disabled':''}>${formFields[q.step]()}</fieldset><p id="questionnaire-error" class="error-text" role="alert"></p><div class="scenario-actions">${q.step?'<button type="button" class="button secondary" data-action="question-back">← Anterior</button>':''}${!state.endTime?`<button class="button primary" type="submit">${q.step<4?'Guardar y continuar →':'Guardar plan de seguimiento'}</button>`:'<a class="button" href="#evaluacion">Ver evaluación</a>'}</div></form>${q.step===4&&!state.endTime?`<div class="scenario-actions">${state.selectedPackage?`<button class="button secondary" data-action="reservation">${state.reservationCompleted?'Ver reserva':'Registrar reserva simulada'}</button>`:''}${state.reservationCompleted&&!state.actions.callbackReturned?'<button class="button secondary" data-action="callback">Devolver llamada pendiente</button>':''}<button class="button secondary" data-action="finish">Finalizar y evaluar formulario</button></div>`:''}</section><aside class="card question-summary"><h2>Resumen generado</h2>${Object.keys(output.discovered).length?`<dl class="capture-list">${Object.entries(output.discovered).map(([k,v])=>`<div><dt>${e(({tripType:'Tipo de viaje',destination:'Destino',dates:'Fechas',travelers:'Viajeros',purpose:'Motivo',budget:'USD / persona',services:'Servicios',accessibility:'Adaptaciones',sensory:'Sensibilidad',supervision:'Supervisión',pet:'Mascota',petSize:'Tamaño',petWeight:'Peso'})[k])}</dt><dd>${e(v.value)}</dd></div>`).join('')}</dl>`:'<p class="muted">Aquí aparecerá la información que completes.</p>'}<p class="small muted">Se guarda automáticamente en este navegador. Usa únicamente datos ficticios.</p>${state.selectedPackage?`<p class="notice">Propuesta: ${e(source.packages.find(p=>p.id===state.selectedPackage)?.name)}</p>`:''}</aside></div>`;
}
