import { getMissingFields } from './simulator.js';
import { formatDuration } from './ui.js';
import { evaluateForm } from './questionnaire.js';
export const categoryLabels={greeting:'Bienvenida',needsDetection:'Detección de necesidades',inclusion:'Inclusión',recommendation:'Recomendación',documentation:'Documentación',objectionHandling:'Manejo de objeciones',reservationClosing:'Cierre',interruptionHandling:'Manejo de llamada',followUp:'Seguimiento'};
const fraction=items=>items.filter(Boolean).length/Math.max(1,items.length);
// Evidence is collected during the conversation; UI transitions never award competency points.
export function evaluateSimulation(state,scenario){
 if(state.questionnaire)return {...evaluateForm(state,scenario),duration:formatDuration((state.endTime||Date.now())-state.startTime)};
 const m=state.metrics,a=state.actions,d=state.discovered;const pkg=scenario.packages.find(p=>p.id===state.selectedPackage);
 const compatible=Boolean(pkg&&(!d.sensory||(pkg.traits||[]).some(t=>['quiet','adapted'].includes(t))));
 const documentQuestions=scenario.questions.filter(q=>q.intent.startsWith('answer_'));
 const ratios={
 greeting:fraction([m.greeting,m.introduce_agent,m.offer_help]),
 needsDetection:fraction(['destination','dates','travelers','purpose','budget','services'].map(k=>d[k]?.status==='discovered')),
 inclusion:fraction([m.ask_disability,m.ask_supervision,m.ask_sensory_needs,a.adaptedRecommendation]),
 recommendation:fraction([a.recommended,compatible,a.explainedReasons,m.ask_budget]),
 documentation:documentQuestions.length?documentQuestions.filter(q=>state.answeredQuestions.includes(q.id)).length/documentQuestions.length:0,
 objectionHandling:scenario.questions.length?state.answeredQuestions.length/scenario.questions.length:0,
 reservationClosing:fraction([state.reservationCompleted,m.explain_reservation,m.explain_payment,m.explain_deadline,m.explain_cancellation,m.request_traveler_data,m.farewell]),
 interruptionHandling:fraction([a.phoneInterruptionHandledCorrectly,a.phoneInterruptionHandledCorrectly,a.phoneInterruptionHandledCorrectly&&a.callbackReturned]),
 followUp:fraction([a.email,a.whatsapp,a.advice,a.future])};
 const categories=Object.fromEntries(Object.entries(ratios).map(([key,v])=>[key,Math.round(v*100)]));
 const deductions=[];const penalize=(condition,key,label)=>{if(condition)deductions.push({key,points:scenario.penalties[key]||0,label});};
 penalize(!m.ask_budget,'noBudget','No consultó el presupuesto');penalize(scenario.hiddenClientProfile.accessibility?.hasSpecialNeed&&!m.ask_disability,'ignoredAccessibility','No investigó la discapacidad');
 penalize(pkg&&!compatible,'incompatibleRecommendation','La recomendación no considera la sensibilidad descubierta');penalize(scenario.hiddenClientProfile.pet?.travelsWithPet&&!m.ask_pet&&!m.ask_pet_size&&!m.ask_pet_weight,'ignoredPet','No investigó las necesidades de la mascota');
 penalize(state.incomingCallHandled&&!a.phoneInterruptionHandledCorrectly,'badPhoneHandling','Gestión inadecuada de la llamada');penalize(!state.reservationCompleted,'incompleteReservation','Reserva incompleta');
 const strengths=[],improvements=[];
 const check=(ok,yes,no)=>{if(ok)strengths.push(yes);else improvements.push(no);};
 check(d.destination?.value&&d.dates?.value,'Identificó destino y fechas.','Faltó identificar destino o fechas.');
 check(m.ask_budget,'Consultó el presupuesto.','Faltó consultar el presupuesto.');
 check(m.ask_disability,'Investigó las necesidades especiales.','Faltó preguntar por las necesidades especiales.');
 check(m.ask_sensory_needs&&m.ask_supervision,'Consultó sensibilidad sensorial y supervisión.','Faltó consultar '+[!m.ask_sensory_needs?'sensibilidad sensorial':null,!m.ask_supervision?'supervisión':null].filter(Boolean).join(' y ')+'.');
 check(a.explainedReasons&&a.adaptedRecommendation,'Justificó y adaptó su recomendación.',a.explainedReasons?'Adapte explícitamente la propuesta a las sensibilidades descubiertas.':a.adaptedRecommendation?'Explique las razones de su recomendación.':'Explique por qué la propuesta se adapta a las necesidades descubiertas.');
 if(scenario.hiddenClientProfile.pet?.travelsWithPet){check(m.ask_pet_size&&m.ask_pet_weight,'Consultó tamaño y peso de la mascota; los datos no especificados siguen sujetos a verificación.','Faltó consultar el tamaño o el peso de la mascota.');}
 check(ratios.documentation===1,'Respondió los requisitos documentales del guion.','Complete o precise las respuestas documentales del guion.');
 check(m.explain_deadline&&m.explain_cancellation&&m.explain_payment,'Explicó pago, plazo y cancelación.','Faltó explicar: '+[!m.explain_payment?'forma de pago':null,!m.explain_deadline?'plazo':null,!m.explain_cancellation?'cancelación':null].filter(Boolean).join(', ')+'.');
 check(a.phoneInterruptionHandledCorrectly&&a.callbackReturned,'Priorizó la atención presencial y devolvió la llamada.',a.phoneInterruptionHandledCorrectly?'Faltó devolver la llamada pendiente.':a.callbackReturned?'Durante la llamada entrante, priorice la atención presencial y solicite contacto.':'Priorice la atención presencial, tome contacto y devuelva la llamada al finalizar.');
 check(ratios.followUp===1,'Ofreció correo, WhatsApp, consejos y seguimiento.','Complete la postventa: '+[!a.email?'envío por correo':null,!a.whatsapp?'información por WhatsApp':null,!a.advice?'consejos antes del viaje':null,!a.future?'seguimiento posterior':null].filter(Boolean).join(', ')+'.');
 if(!m.farewell)improvements.push('Cierre con un agradecimiento o una despedida cordial.');
 if(!state.reservationCompleted)improvements.push('Complete el registro de la reserva simulada.');
 const rawScore=Object.entries(ratios).reduce((sum,[key,v])=>sum+v*(scenario.rubric[key]||0),0);
 const totalScore=Math.max(0,Math.min(100,Math.round(rawScore+deductions.reduce((sum,p)=>sum+p.points,0))));
 const result={id:state.id,scenario:scenario.title,date:new Date(state.endTime||Date.now()).toISOString(),totalScore,rawScore:Math.round(rawScore),categories,deductions,strengths,improvements,completedFields:Object.keys(d).filter(k=>d[k]?.status==='discovered'),missingFields:getMissingFields(state,scenario).map(f=>f.label),duration:formatDuration((state.endTime||Date.now())-state.startTime)};
 result.feedback=generateFeedback(result);return result;
}
export function scoreLabel(score){return score>=90?'Excelente desempeño':score>=80?'Muy buen desempeño':score>=70?'Buen desempeño':score>=60?'Desempeño aceptable':'Necesita reforzar competencias';}
export function generateFeedback(result){return `${scoreLabel(result.totalScore)}. ${result.strengths.slice(0,2).join(' ')} ${result.improvements.length?'Para su próxima práctica: '+result.improvements.slice(0,2).join(' '):'Completó las competencias del caso. Mantenga la verificación de información pendiente antes de cualquier contratación.'}`.split(/\s+/).slice(0,80).join(' ');}
