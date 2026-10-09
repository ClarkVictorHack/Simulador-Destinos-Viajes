import { storage } from './storage.js';
export const normalize = text => String(text ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const patterns = {
 greeting:[/\b(hola|buenos dias|buenas tardes|buenas noches|bienvenid[oa])\b/],
 introduce_agent:[/mi nombre es|me llamo|soy (su|la|el|angelica)|le saluda/],
 offer_help:[/puedo ayudar|podemos ayudar|ayudarle|a su disposicion|en que.*ayud/],
 ask_trip_type:[/nacional|internacional|tipo de viaje/], ask_destination:[/destino|donde.*viajar|pais.*visitar|a donde|lugar.*viajar/],
 ask_dates:[/fecha|cuando.*viaj|que dias|en que mes/], ask_travelers:[/cuant[oa]s.*(persona|viajer|pasajer)|cuantos son|quienes.*viaj|numero de (viajer|persona)/],
 ask_adults_children:[/adultos|cuantos ninos|edades.*(nino|hijo)/], ask_trip_purpose:[/motivo|proposito|turismo|turistico|negocio/],
 ask_budget:[/presupuesto|cuanto.*gastar|monto|rango.*precio|cuanto.*invertir/], ask_services:[/servicios|todo incluido|incluir.*(hotel|hospedaje|alimentacion)|desean.*(hospedaje|tours|traslado)|tipo de alojamiento/],
 ask_disability_type:[/tipo de discapacidad|que discapacidad|condicion.*hijo|hijo.*condicion/], ask_disability:[/discapacidad|necesidad.*especial/],
 ask_supervision:[/supervision|acompanamiento|acompanado|acompanan|acompanar.*(hijo|nino)/],
 ask_sensory_needs:[/sensibili|ruidos|estimulos|multitudes|cambios.*(rutina|ambiente)/], ask_accessibility:[/accesibilidad|asistencia.*(hijo|nino)|silla de ruedas|alergia/],
 ask_pet:[/mascota|perr[oa]|animal/], ask_pet_size:[/tamano|pequena|grande/], ask_pet_weight:[/peso|pesa|kilo/],
 recommend_package:[/recomiendo|recomendaria|le propongo|les propongo|sugiero|ofrezco/],
 explain_package:[/incluye|incluyen|ofrece|porque|ya que|por su|por las necesidades/], ask_customer_preference:[/prefiere|prefieren|le interesa|le gustaria|que opcion|que paquete/],
 answer_passport:[/pasaporte/], answer_vaccine:[/vacuna|fiebre amarilla/], answer_disability_documents:[/carne|cedula|conadis/], answer_pet_documents:[/certificado veterinario|agrocalidad|antirrabica|rabia/], answer_airport_arrival:[/aeropuerto|antes del vuelo/],
 handle_incoming_call:[/permite.*momento|permiso.*llamada|atendiendo.*cliente/], request_callback_number:[/numero.*devolver|contacto.*llamar|dejar.*numero/],
 confirm_reservation:[/reservar|registrar.*reserva|confirm.*reserva|proced.*reserva|bloque.*espacio/], request_traveler_data:[/nombres|documentos.*viajero|datos.*viajero|verifi.*datos|confirm.*datos/],
 explain_payment:[/pago|pagar|tarjeta|transferencia|efectivo/], explain_deadline:[/48|cuarenta y ocho|plazo|proximos (2|dos) dias|disponibilidad/], explain_cancellation:[/cancelacion|reembolso|cargos del proveedor/],
 follow_up:[/seguimiento|consejos|whatsapp|envia.*correo|enviare.*informacion|dudas futuras|despues del viaje/], farewell:[/gracias por confiar|buen viaje|excelente viaje|gusto atender|hasta pronto|hasta luego/]
};
const questionLead = /\b(cual|cuanto|cuanta|cuantos|cuantas|que|donde|cuando|tienen|tiene|desean|necesitan|requieren|podria|podrian|puede indic|me indica|me cuenta|quisiera saber|viajan|viaja|prefieren|buscan|hay alguna|hay algun)\b/;
// Multiple intents are allowed, so a natural combined question discovers only its requested facts.
export function detectIntents(message) {
 const text=normalize(message); const isQuestion=message.includes('?')||questionLead.test(text);
 const intents=Object.entries(patterns).filter(([id,list])=>list.some(p=>p.test(text)) && (!id.startsWith('ask_')||isQuestion)).map(([id])=>id);
 if(intents.includes('ask_disability_type')&&intents.includes('ask_disability'))intents.splice(intents.indexOf('ask_disability'),1);
 if(intents.includes('ask_pet_size')||intents.includes('ask_pet_weight')){const i=intents.indexOf('ask_pet');if(i>=0)intents.splice(i,1);}
 if(/document|carne|cedula|certificado|vacuna/.test(text)){for(const id of ['ask_disability','ask_pet']){const i=intents.indexOf(id);if(i>=0)intents.splice(i,1);}}
 return intents;
}
export function detectIntent(message){return detectIntents(message)[0] ?? 'unknown';}
export const fieldLabels={tripType:'Tipo de viaje',destination:'Destino',dates:'Fechas',travelers:'Pasajeros',purpose:'Motivo',budget:'Presupuesto',services:'Servicios deseados',accessibility:'Discapacidad',sensory:'Sensibilidad sensorial',supervision:'Supervisión',pet:'Mascota',petSize:'Tamaño de mascota',petWeight:'Peso de mascota'};
export function createState(scenario){return {id:crypto.randomUUID(),scenarioId:scenario.id,stage:'welcome',startTime:Date.now(),endTime:null,discovered:{},intentsDetected:[],actions:{},metrics:{},selectedPackage:null,conversation:[],incomingCallHandled:false,callPending:false,reservationCompleted:false,followUpCompleted:false,score:null,questionIndex:-1,answeredQuestions:[],fallbackCount:0,progress:0};}
export function saveState(state){storage.set('active',state);}
export function resetSimulation(scenario){storage.remove('active');return createState(scenario);}
export function addMessage(state,role,text){state.conversation.push({role,text,time:Date.now()});}
const known = value => value !== null && value !== undefined && value !== '';
// Missing source data stays explicitly unresolved; it is never fabricated as a customer response.
export function generateClientResponse(intent,state,scenario){
 const p=scenario.hiddenClientProfile;const d=state.discovered;
 const record=(key,value,response)=>{d[key]={value:known(value)?value:null,status:known(value)?'discovered':'incomplete'};return known(value)?response:'Ese dato no está especificado en el guion; queda pendiente de verificación.';};
 switch(intent){
 case 'greeting':return scenario.opening||'Buenas tardes. Quisiera que me ayude a planificar un viaje.';
 case 'introduce_agent':return 'Mucho gusto. Gracias por atenderme.';
 case 'offer_help':return 'Gracias, me gustaría conocer las opciones disponibles.';
 case 'ask_trip_type':return record('tripType',p.tripType,`${p.tripType}.`);
 case 'ask_destination':return record('destination',p.destination,`Pensábamos en ${p.destination}.`);
 case 'ask_dates':return record('dates',p.dates,`Nos gustaría viajar del ${p.dates}.`);
 case 'ask_travelers':case 'ask_adults_children': {
   let response=record('travelers',p.travelers?.total?`${p.travelers.total} personas · ${p.travelers.adults ?? '?'} adultos y ${p.travelers.children ?? '?'} niños`:null,`Somos ${p.travelers?.total} personas: ${p.travelers?.adults} adultos y ${p.travelers?.children} niños.`);
   if(p.accessibility?.hasSpecialNeed){d.specialNeedMentioned=true;response+=' Uno de ellos tiene una discapacidad.';}
   if(p.pet?.travelsWithPet){d.pet={value:'Sí, viaja con mascota',status:'discovered'};response+=' Además, viajamos con nuestra mascota.';}
   return response; }
 case 'ask_trip_purpose':return record('purpose',p.purpose,`El motivo del viaje es ${p.purpose}.`);
 case 'ask_budget':return record('budget',p.budget?.maxPerPerson,`Máximo ${p.budget?.currency||'USD'} ${p.budget?.maxPerPerson} por persona.`);
 case 'ask_services':return record('services',p.requestedServices?.length?p.requestedServices.join(', '):null,`${p.requestedServices?.join(', ')}.${p.wantsAllInclusive?' Nos gustaría un paquete todo incluido, si es posible.':''}`);
 case 'ask_disability':case 'ask_disability_type':return record('accessibility',p.accessibility?.hasSpecialNeed===false?'Sin necesidad especial declarada':p.accessibility?.condition?`${p.accessibility.person}, ${p.accessibility.age ?? 'edad no indicada'} años · ${p.accessibility.condition}`:null,p.accessibility?.hasSpecialNeed===false?'No tenemos necesidades especiales que comunicar.':`Mi ${p.accessibility?.person?.toLowerCase()} tiene ${p.accessibility?.age} años y ${p.accessibility?.condition}.`);
 case 'ask_supervision':return record('supervision',p.accessibility?.supervision,p.accessibility?.supervision);
 case 'ask_sensory_needs':return record('sensory',p.accessibility?.avoid?.length?p.accessibility.avoid.join(', '):null,`Puede participar en actividades, pero preferimos evitar: ${p.accessibility?.avoid?.join(', ')}.`);
 case 'ask_accessibility':return 'Por favor, considere las necesidades que le hemos comunicado. El guion no especifica otras ayudas ni alergias; deben verificarse.';
 case 'ask_pet':return record('pet',known(p.pet?.travelsWithPet)?p.pet.travelsWithPet?(p.pet.species||'Sí, especie no indicada'):'No viaja mascota':null,p.pet?.travelsWithPet?`Sí, viajamos con ${p.pet.species||'nuestra mascota'}.`:'No viajamos con mascota.');
 case 'ask_pet_size':return record('petSize',p.pet?.size,`Su tamaño es ${p.pet?.size}.`);
 case 'ask_pet_weight':return record('petWeight',p.pet?.weight,`Pesa ${p.pet?.weight}.`);
 case 'ask_customer_preference':{const pkg=scenario.packages.find(x=>x.id===scenario.clientPreferredPackage);return pkg?`Me interesa más ${pkg.name}.`: 'Me interesa una opción que responda a lo que le he contado.';}
 case 'request_traveler_data':return 'Claro. Utilicemos los datos ficticios del formulario para esta práctica.';
 case 'follow_up':return 'Me parece excelente. Agradeceré recibir la información y el seguimiento.';
 case 'farewell':return 'Perfecto, muchas gracias por su atención.';
 default:return null;
 }
}
// Scores use discovered facts only. No package price is assumed or treated as affordable without a quote.
export function calculatePackageScores(state,scenario){
 const d=state.discovered;
 return scenario.packages.map(pkg=>{let score=0;const reasons=[];const t=pkg.traits||[];
 const add=(condition,points,reason)=>{if(condition){score+=points;reasons.push(reason);}};
 add(d.budget?.value && d.budget.value<=1000&&t.includes('budget'),3,'Prioriza un presupuesto reducido');
 add(d.budget?.value>1000&&d.budget.value<=1500&&t.includes('balance'),3,'Equilibrio de servicios; cotización pendiente');
 add(d.sensory?.value&&t.includes('quiet'),2,'Actividades tranquilas');
 add(d.accessibility?.value&&t.includes('adapted'),3,'Actividades adaptadas');
 add(d.supervision?.value&&t.includes('assistance'),3,'Guía acompañante');
 add(d.services?.value&&scenario.hiddenClientProfile.wantsAllInclusive&&t.includes('fullMeals'),2,'Alimentación completa');
 add(d.sensory?.value&&t.includes('private'),2,'Traslados privados');
 return {...pkg,score,reasons};}).sort((a,b)=>b.score-a.score);
}
export function getMissingFields(state,scenario){return Object.entries(fieldLabels).filter(([key])=>{
 if(['petSize','petWeight'].includes(key)&&!scenario.hiddenClientProfile.pet?.travelsWithPet)return false;
 return !state.discovered[key] || state.discovered[key].status==='incomplete'&&!state.metrics[key==='petSize'?'ask_pet_size':key==='petWeight'?'ask_pet_weight':'__'];
 }).map(([key,label])=>({key,label}));}
export function updateProgress(state){
 const m=state.metrics;const count=['ask_destination','ask_dates','ask_travelers','ask_trip_purpose','ask_budget','ask_services','ask_disability','ask_supervision','ask_sensory_needs','ask_pet','ask_pet_size','ask_pet_weight'].filter(i=>m[i]).length;
 state.progress=Math.min(100,(m.greeting?5:0)+Math.round(count/12*40)+(state.selectedPackage?15:0)+(m.explain_package?5:0)+(state.answeredQuestions.length?10:0)+(state.incomingCallHandled?5:0)+(state.reservationCompleted?10:0)+(state.followUpCompleted?5:0)+(state.actions.callbackReturned?5:0));
 state.stage=state.reservationCompleted?(state.followUpCompleted?'postSale':'closing'):state.selectedPackage?'questions':count>=6?'proposal':state.conversation.length?'exploration':'welcome';
}
// The modal persists across reloads and occurs once, including in demonstration mode.
export function checkAutomaticEvents(state,scenario){const threshold=scenario.interruptions[0]?.triggerProgress??65;if(!state.incomingCallHandled&&!state.callPending&&scenario.interruptions.length&&(state.progress>=threshold||state.selectedPackage&&state.metrics.explain_package)){state.callPending=true;}}
export function nextQuestion(state,scenario){state.questionIndex++;const q=scenario.questions[state.questionIndex];if(q)addMessage(state,'client',q.text);else {state.actions.requestedPackage=scenario.clientPreferredPackage||state.selectedPackage;addMessage(state,'client',`Está bien, quiero hacer la reserva${scenario.aliases?.Premium?' del paquete Premium':''}.`);}}
export function selectPackage(state,scenario,id){const pkg=scenario.packages.find(x=>x.id===id);if(!pkg)return;state.selectedPackage=id;state.actions.packageSelected=true;addMessage(state,'system',`Propuesta preparada: ${pkg.name}. Preséntela y explique sus razones en el chat.`);saveState(state);}
export function processAdvisorMessage(state,scenario,message){
 addMessage(state,'advisor',message);const text=normalize(message);const intents=detectIntents(message);const responses=[];
 const question=scenario.questions[state.questionIndex]; let answered=false;
 // Credit factual answers only after checking their content, not simply spotting a keyword.
 if(question&&question.checks?.length&&question.checks.every(check=>new RegExp(check).test(text))&&!/\bno (necesita|requiere|hace falta)|sin (pasaporte|vacuna|certificado)/.test(text)){
   state.answeredQuestions.push(question.id);state.metrics[question.intent]=true;answered=true;responses.push('Gracias, ahora lo tengo claro.');
 }
 for(const intent of intents){
   if(!state.intentsDetected.includes(intent))state.intentsDetected.push(intent);
   const isAnswer=intent.startsWith('answer_');
   if(!isAnswer&& !['explain_payment','explain_deadline','explain_cancellation','explain_package'].includes(intent))state.metrics[intent]=true;
   if(intent==='ask_disability_type')state.metrics.ask_disability=true;
   if(intent==='ask_adults_children')state.metrics.ask_travelers=true;
   if(intent==='ask_pet')state.actions.petConsidered=true;
   const custom=scenario.conversationRules.find(r=>r.intent===intent);
   const response=generateClientResponse(intent,state,scenario);
   if(custom?.response)responses.push(custom.response);else if(response)responses.push(response);
 }
 if(/(tarjeta|transferencia|efectivo)/.test(text)&&/pago|pagar|puede realizar/.test(text))state.metrics.explain_payment=true;
 if(scenario.reservationRules.paymentHours&&new RegExp(`\\b${scenario.reservationRules.paymentHours}\\b${scenario.reservationRules.paymentHours===48?'|cuarenta y ocho':''}`).test(text)&&/hora|plazo/.test(text))state.metrics.explain_deadline=true;
 if((scenario.reservationRules.cancellation||'').includes('15')&&/\b15\b|quince/.test(text)&&/reembolso/.test(text)&&/cargo|proveedor/.test(text))state.metrics.explain_cancellation=true;
 if(/bloque.*espacio|reserva.*(pago|confirm)/.test(text))state.metrics.explain_reservation=true;
 if(intents.includes('recommend_package')){const alias=Object.entries(scenario.aliases||{}).find(([name])=>text.includes(normalize(name)));const pkg=scenario.packages.find(p=>text.includes(normalize(p.name))||p.name===alias?.[1]);if(pkg)state.selectedPackage=pkg.id;if(state.selectedPackage)state.actions.recommended=true;}
 if(state.selectedPackage&&intents.includes('explain_package')&&text.length>45){state.metrics.explain_package=true;if(/porque|ya que|por su|por las necesidades|debido/.test(text))state.actions.explainedReasons=true;if(state.discovered.sensory&&/tranquil|ruido|sensorial|adaptad/.test(text))state.actions.adaptedRecommendation=true;}
 for(const rule of scenario.evaluationRules||[]){if(rule.metric&&Array.isArray(rule.checks)&&rule.checks.length&&rule.checks.every(c=>new RegExp(c).test(text)))state.metrics[rule.metric]=true;}
 if(intents.includes('follow_up')){state.actions.postSale=true;state.followUpCompleted=true;for(const [id,re] of Object.entries({email:/correo/,whatsapp:/whatsapp/,advice:/consejos|recomendaciones.*antes/,future:/seguimiento|despues del viaje|dudas futuras/}))if(re.test(text))state.actions[id]=true;}
 if(intents.includes('confirm_reservation'))responses.push(state.selectedPackage?'Sí, quisiera continuar con la reserva. Puede abrir el formulario.':'Antes de reservar, necesito que me presente una opción.');
 if(answered){addMessage(state,'client',[...new Set(responses)].join('\n'));nextQuestion(state,scenario);}
 else {
   if(!responses.length){if(intents.length&&state.selectedPackage)responses.push(question?'Gracias. ¿Podría precisar la respuesta a mi última pregunta?':'Gracias por la explicación.');else responses.push('¿Podría explicarme un poco mejor a qué se refiere?');}
   addMessage(state,'client',[...new Set(responses)].join('\n'));
 }
 state.fallbackCount=intents.length?0:state.fallbackCount+1;
 if(state.selectedPackage&&state.metrics.explain_package&&state.questionIndex===-1)nextQuestion(state,scenario);
 updateProgress(state);checkAutomaticEvents(state,scenario);saveState(state);return intents;
}
export function handleCall(state,choice){
 state.actions.phoneInterruptionHandledCorrectly=choice==='callback';state.actions.callChoice=choice;state.incomingCallHandled=true;state.callPending=false;
 if(choice==='callback'){addMessage(state,'advisor','Disculpe, ¿me permite un momento? Está entrando una llamada.');addMessage(state,'phone','Buenas tardes…');addMessage(state,'advisor','Me encuentro atendiendo a un cliente. ¿Podría dejarme su número para devolverle la llamada al finalizar?');addMessage(state,'system','Contacto ficticio anotado. Llamada pendiente de devolución.');addMessage(state,'advisor','Gracias por su comprensión. Continuamos con su atención.');}
 else addMessage(state,'system',choice==='full'?'Atendió la llamada completa e interrumpió la atención presencial.':'Rechazó la llamada sin ofrecer devolución.');
 updateProgress(state);saveState(state);
}
export function returnCall(state,scenario,credit=true){if(credit)state.actions.callbackReturned=true;else state.actions.demoCallbackShown=true;addMessage(state,'phone','Quisiera saber cómo tramitar la visa para viajar a Europa.');addMessage(state,'system',scenario.callbackAnswer||'La orientación de la segunda llamada está pendiente de revisión en este escenario.');if(!credit)addMessage(state,'system','Devolución mostrada por avance de demostración; sin puntos de competencia.');updateProgress(state);saveState(state);}
