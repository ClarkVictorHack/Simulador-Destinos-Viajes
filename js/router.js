export function setupRouter(render) {
  const routes = ['inicio','escenarios','simulacion','paquetes','reserva','evaluacion','reportes','configuracion'];
  const update = () => { const route = location.hash.slice(1); render(routes.includes(route) ? route : 'inicio'); const sidebar=document.querySelector('#sidebar');sidebar.classList.remove('open');sidebar.inert=matchMedia('(max-width:850px)').matches;document.querySelector('#menu-toggle').setAttribute('aria-expanded','false'); };
  window.addEventListener('hashchange', update); update();
}
export function navigate(route) { location.hash = route; }
