export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const icon = name => `<i data-lucide="${escapeHTML(name)}" aria-hidden="true"></i>`;
export const formatDuration = milliseconds => { const secs = Math.max(0, Math.floor(milliseconds / 1000)); return `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`; };
let toastTimer;
export function showToast(message, type='info') { const el=document.querySelector('#toast'); el.textContent=message; el.dataset.type=type; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('visible'),5000); }
export function refreshIcons(){ window.lucide?.createIcons(); }
export function showModal(content, mandatory=false) { const modal=document.querySelector('#modal'); document.querySelector('#modal-content').innerHTML=content; modal.oncancel=event=>{ if(mandatory)event.preventDefault(); }; if(!modal.open)modal.showModal(); refreshIcons(); }
export function closeModal(){ document.querySelector('#modal').close(); }
export function loadScript(src) { return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('No se pudo cargar la biblioteca. Compruebe su conexión para importar este formato.'));};document.head.append(script);}); }
