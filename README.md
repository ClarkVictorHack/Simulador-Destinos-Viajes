# Simulador de Atención al Cliente — Coltur Portoviejo

Aplicación académica en HTML5, CSS3 y JavaScript puro. Recrea el documento **Guion dramatizado - destino Centroamérica 30-07-2025.docx** incluido en esta carpeta. No realiza reservas, cobros, correos ni consultas externas sobre requisitos de viaje.

## Cómo ejecutar

1. Descargue o copie la carpeta completa.
2. Ábrala con Visual Studio Code.
3. Abra `index.html` con **Live Server**.
4. Elija **Iniciar simulación → Comenzar caso**.

También puede ejecutar `node server.mjs` (Node 20 o posterior) o `python -m http.server 4173 --bind 127.0.0.1` desde la carpeta y abrir **http://127.0.0.1:4173**. No necesita instalar paquetes. `npm start` ejecuta el servidor incluido.

Use un servidor local: los módulos ES y la lectura del JSON no funcionan correctamente abriendo `index.html` mediante `file://`.

## Uso en una exposición

El alumno completa un formulario de datos del viaje. Las respuestas se guardan automáticamente y generan el resumen y las propuestas disponibles.

1. **El viaje:** destino, fechas, adultos, niños y motivo.
2. **Servicios:** presupuesto por persona, servicios, alimentación, traslados y prioridad.
3. **Necesidades especiales:** aparecen campos adicionales si hay adaptaciones o mascota.
4. **Propuesta:** compare y seleccione los paquetes ordenados según sus preferencias.
5. **Cierre y seguimiento:** consulte la información del escenario, registre una reserva ficticia y marque el plan de seguimiento. Finalmente, evalúe el formulario.

El catálogo predeterminado corresponde a Panamá. Para otro destino se conserva el resumen, pero no se inventan paquetes ni requisitos: importe un escenario correspondiente. Los precios quedan pendientes porque el documento no contiene cotizaciones.

Cambiar las respuestas iniciales invalida la propuesta y la reserva anteriores. Las sesiones de chat guardadas antes de esta actualización conservan su formato; comience un caso nuevo para usar el cuestionario.

## Fidelidad al documento

- Tres paquetes: Explora Tranquilo, Descubre Panamá y Relájate y Conecta.
- `aliases.Premium` apunta a Relájate y Conecta; no se crea un cuarto paquete.
- `initialActivities` conserva la presentación inicial. `laterTourAnswer` conserva la respuesta posterior de tours, sin conciliar silenciosamente la inconsistencia.
- No hay precios inventados: `price` y duración de los paquetes son `null`.
- El peso y tamaño de la mascota no aparecen en el guion. Preguntarlos cuenta, pero siguen señalados **Por verificar**.
- Documentación, vacunas, condiciones y visa Schengen llevan contexto académico. No se utiliza información migratoria externa.
- La llamada se activa al 65 % o tras explicar la propuesta, conforme al flujo solicitado para el simulador. El original la coloca durante postventa.
- La condición para cancelar exactamente a 15 días no está definida; permanece sin resolver.

## Arquitectura y archivos

| Archivo | Responsabilidad |
|---|---|
| `index.html`, `css/styles.css` | Estructura semántica, navegación, diseño adaptable |
| `js/app.js` | Pantallas, formularios y conexión entre módulos |
| `js/router.js` | Rutas locales mediante fragmentos de URL |
| `js/scenario-loader.js` | Lectura, normalización y validación de documentos |
| `js/simulator.js` | Intenciones, información progresiva, recomendaciones, llamadas y estado |
| `js/evaluator.js` | Rúbrica, penalizaciones y retroalimentación |
| `js/storage.js` | Persistencia con manejo de errores |
| `js/ui.js` | Mensajes, diálogos, iconos y formato |
| `js/report.js` | Reporte descargable en HTML, imprimible a PDF |
| `data/default-scenario.json` | Datos, requisitos y reglas del caso original |
| `data/source-fingerprint.txt` | Firma del texto original, sin copiar su contenido o contacto |
| `server.mjs` | Servidor local opcional, sin dependencias |
| `tests/simulator.test.js` | Pruebas reproducibles del flujo y de las penalizaciones |

Flujo de datos: documento → revisión → escenario JSON → motor → estado y evidencias → evaluación → almacenamiento local → reporte. Al iniciar se conserva una copia del escenario en la sesión para que editarlo después no cambie una atención en curso.

## Dónde modificar el escenario

Edite `data/default-scenario.json`. `hiddenClientProfile` contiene los datos privados del caso; `publicTitle`, `context` y `objective` no deben revelarlos. `packages`, `questions`, `reservationRules`, `interruptions`, `rubric` y `penalties` controlan el resto del contenido.

Las preguntas documentales usan `checks`, una lista de patrones sobre texto normalizado. Para registrar la respuesta, deben cumplirse todos los patrones. Es un sistema de reglas, no comprensión semántica completa; una formulación inusual puede requerir reformulación. `conversationRules` permite respuestas por `intent`; `evaluationRules` permite reglas adicionales con `metric` y `checks`.

## Importar otro guion

En **Escenarios → Importar escenario**, elija DOCX, PDF, TXT o JSON (máximo 10 MB).

- DOCX: Mammoth extrae el texto.
- PDF: PDF.js extrae el texto página a página. No incorpora OCR; un PDF escaneado debe convertirse previamente a texto.
- TXT: lectura directa, sin conexión.
- JSON: acepta el esquema de `default-scenario.json`, valida tipos, listas, preguntas y rúbrica.

El documento original exacto se reconoce mediante una firma y reutiliza su extracción revisada. Si cambia el documento, no se supone que siga siendo el caso original. Para otros textos, se reconocen encabezados, participantes y campos explícitos como `Título:`, `Destino:`, `Fechas:`, `Pasajeros:`, `Presupuesto:` y `Servicios:`. **No se intenta interpretar cualquier guion libre automáticamente**: paquetes, eventos, respuestas u otros datos ambiguos quedan pendientes de revisión.

El editor permite modificar título, destino, fechas, pasajeros y presupuesto; ofrece campos JSON editables para personajes, necesidades, mascota, paquetes y eventos, además del escenario completo. Los campos individuales prevalecen sobre el JSON completo. Use el caso predeterminado como ejemplo del esquema. Tras guardar, el escenario aparece en la biblioteca. El contenido del documento no se envía a servicios de IA.

Un guion importado sin paquetes podrá usarse para explorar necesidades, pero requiere completar sus paquetes en el editor para realizar una reserva. Las preguntas sin criterios de evaluación deben revisarse para poder calificarse. No se rellenan con datos de Panamá.

## Evaluación

El resultado mide la completitud del formulario y las etapas registradas, sin atribuir habilidades conversacionales.

| Área | Puntos |
|---|---:|
| Datos del viaje | 25 |
| Servicios y presupuesto | 20 |
| Necesidades especiales | 15 |
| Propuesta seleccionada | 15 |
| Reserva simulada | 15 |
| Plan de seguimiento | 10 |

Las sesiones antiguas de chat conservan su evaluación original.

## Persistencia, reporte y conexión

Los resultados se guardan en `coltur_simulator_results`. La sesión activa está en `coltur_simulator_active`. Reiniciar solo elimina la sesión activa, conservando reportes y escenarios. Se muestra un aviso si el navegador no permite guardar.

No ingrese datos reales. Los campos personales de la reserva se descartan al registrarla y no se agregan al estado ni al reporte. El formulario y el chat académico de sesiones anteriores se conservan para continuar tras recargar. Los reportes contienen escenario, fecha, duración, puntuación, competencias, fortalezas y mejoras.

**Descargar reporte** genera un archivo HTML autónomo. Puede abrirlo y usar **Imprimir → Guardar como PDF**. No necesita html2pdf ni conexión.

La simulación predeterminada funciona sin Internet desde el servidor local. Lucide se solicita por CDN como iconografía opcional; su ausencia no bloquea ninguna función. Mammoth 1.8.0 y PDF.js 4.10.38 se cargan desde CDN únicamente al importar esos formatos, con manejo de fallos. Use TXT/JSON sin conexión. Los gráficos utilizan barras CSS, sin Chart.js.

## Pruebas

Ejecute `npm test` o `node --test tests/*.test.js`.

Se cubren ruta completa, omisión de discapacidad, omisión de presupuesto, llamada incorrecta, variantes de intención, ocultación del perfil, respuesta documental incorrecta, persistencia, archivo inválido, importación conservadora y validación del JSON. Consulte `tests/VERIFICACION.md` para las comprobaciones del navegador.

Las pruebas del cuestionario verifican validaciones, propuestas según las preferencias, destinos sin catálogo, persistencia e invalidación de reservas al cambiar respuestas.
