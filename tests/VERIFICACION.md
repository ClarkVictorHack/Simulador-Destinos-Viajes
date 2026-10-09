# Verificación de la entrega

## Pruebas automáticas

15 pruebas aprobadas con `node --test --test-isolation=none tests/simulator.test.js`.

- Ruta completa: 100/100; consultas esenciales completadas.
- Omisión de discapacidad: reduce inclusión y aplica −10.
- Omisión de presupuesto: aplica −5 y elimina evidencia presupuestaria en recomendaciones.
- Llamada incorrecta: 0 % en interrupciones y penalización de −5.
- Tres formulaciones equivalentes de presupuesto.
- Saludo sin revelar datos; viajeros sin revelar automáticamente autismo.
- Respuesta documental incorrecta sin crédito.
- Serialización y restauración de progreso.
- JSON inválido rechazado.
- TXT desconocido sin heredar datos de Panamá.
- Validación de preguntas, alias y eventos del JSON.
- Alias Premium resuelto a Relájate y Conecta y activación de llamada.
- Pregunta equivalente sobre la condición del hijo.
- Avance de demostración sin crédito por devolución automática.
- Reporte HTML: contenido autónomo y acción de descarga, sin datos del formulario personal.

## Comprobaciones en el navegador

- Inicio, escenarios y datos ocultos antes de conversar.
- Recorrido completo con preguntas libres, panel progresivo, tres propuestas, llamada automática, respuestas documentales, formulario de cuatro viajeros, reserva, postventa y devolución de llamada.
- Resultado visible: 100/100 y nueve competencias al 100 %.
- Recarga durante la atención: conversación y datos conservados.
- Reintentar: conversación nueva, campos pendientes e historial anterior conservado.
- Importación del DOCX original con Mammoth: escenario reconocido, campos y tres paquetes en el editor; guardado y persistencia tras recargar.
- PDF de prueba con PDF.js: título, Cuenca, fechas, dos pasajeros y presupuesto de USD 400 extraídos. Campos ausentes pendientes de revisión.
- Archivo JSON inválido: mensaje de error y aplicación utilizable.
- Omisión de presupuesto en el navegador: detección de necesidades al 83 %, recomendación al 75 % y mejora específica.
- Omisión de discapacidad en el navegador: inclusión al 75 % y mejora específica.
- Llamada completa en el navegador: interrupciones al 0 % y penalización de −5 visible en el detalle.
- Pantallas a 1366 × 768 y 1920 × 1080; revisión móvil a 390 × 844 y navegación mediante menú colapsable.
- Ajuste de altura del chat para mantener visible el campo de respuesta en laptop.
- Sin errores ni advertencias de consola en el recorrido y las comprobaciones de importación.

## Límites de la verificación

La descarga se comprobó mediante su contenido HTML y el disparo del enlace. La automatización del navegador integrado no notificó un evento nativo de descarga, por lo que no se verificó allí un archivo final en la carpeta Descargas. El código utiliza el mecanismo estándar Blob + enlace `download`; para guardar el reporte como PDF, abra el HTML en un navegador normal y use Imprimir.

La operación sin Internet se apoya en archivos locales y lectores opcionales: no se simuló un corte de red en el navegador. DOCX y PDF requieren acceso al CDN al cargar sus lectores; la simulación principal y TXT/JSON no lo necesitan.

## Cuestionario de viaje — 2026-10-09

24 pruebas automatizadas aprobadas. En el navegador se completó el formulario de cinco pasos, se recargaron y recuperaron respuestas, se generaron propuestas, se seleccionó Relájate y Conecta, se registró una reserva para tres viajeros y se terminó con 100/100 de completitud. Sin errores ni advertencias de consola en este recorrido.
