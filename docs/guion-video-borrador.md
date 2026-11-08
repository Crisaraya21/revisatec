# Borrador de Guion de Video Demostrativo - RevisaTEC

> **Duración estimada:** 4:30 minutos (Máximo permitido: 5:00 min).  
> **Idioma:** Español natural, técnico y fluido.  
> **Objetivo:** Demostración integral de la plataforma RevisaTEC: arquitectura de microservicios, seguridad, flujos de profesor y estudiante, y notificaciones en tiempo real con Azure Web PubSub.

---

## 1. Guion por Escenas

### Escena 1: Problema y Propuesta de Valor (0:00 – 0:25)
- **Visual:** Portada del proyecto, interfaz de RevisaTEC en pantalla completa, transición rápida por el dashboard.
- **Narrador:**
  > "En los cursos de programación del TEC, los profesores evalúan proyectos grupales revisando únicamente la entrega final en GitHub. Esto impide saber con certeza si hubo revisión de código entre compañeros, quién aportó realmente al repositorio o si se cometieron malas prácticas de último momento.  
  > RevisaTEC nace para solucionar esto: es una plataforma que automatiza el análisis continuo de repositorios con IA, evalúa rúbricas con pesos objetivos y notifica a profesores y estudiantes en tiempo real ante cualquier avance o inconveniente."

---

### Escena 2: Arquitectura, Seguridad y Almacenamiento (0:25 – 1:15)
- **Visual:** Diagrama de arquitectura en pantalla (Draw.io / PDF), destacando el flujo:  
  Frontend (Static Web Apps) → Azure API Management (APIM Gateway) → MS1 (Grupos/Admin), MS2 (Rúbrica IA y Análisis en Python/FastAPI) y MS3 (Notificaciones en Node.js).  
  Muestra de Azure Portal con Azure SQL, Cosmos DB (Mongo API) y Azure Queue Storage.
- **Narrador:**
  > "RevisaTEC está diseñado con una arquitectura desacoplada basada en microservicios sobre la nube de Azure:
  > - Todo el tráfico del frontend ingresa a través de un gateway único en **Azure API Management**, asegurando rate limiting, autenticación y ocultamiento de topología interna.
  > - **MS1** gestiona la administración de cursos, grupos y calendario sobre **Azure SQL Database**.
  > - **MS2**, desarrollado en Python con FastAPI y Cosmos DB, procesa rúbricas con IA, analiza commits y Pull Requests y genera síntesis de cumplimiento.
  > - La comunicación asíncrona entre microservicios se canaliza mediante **Azure Queue Storage**, garantizando resiliencia y desacoplamiento.
  > - **MS3** escucha estos eventos y los retransmite al navegador mediante **Azure Web PubSub** en WebSockets seguros."

---

### Escena 3: Flujo del Profesor (1:15 – 2:45)
- **Visual:**
  1. Login de profesor (`profesor@itcr.ac.cr`).
  2. Navegación al Dashboard: métricas globales, promedio de rúbrica, próximas entregas e inconvenientes detectados.
  3. Navegación a **Ajustes del curso (/rubric)**:
     - Mostrar validación estricta de pesos (suma 100%).
     - Indicaciones para la IA con contador de caracteres.
     - Configuración de frecuencia de scraping.
     - Guardado con feedback visual accesible.
  4. Navegación a **Detalle de grupo (/groups/1)**:
     - Calificación global, desglose por criterio y evidencias detectadas en el repositorio.
     - Modal de síntesis de avance (`on_track`, `at_risk`, `delayed`).
  5. Navegación a **Retroalimentación (/feedback)**:
     - Comparativa: Propuesta generada por IA vs Versión del profesor.
     - Clic en 'Usar como base', edición rápida del dictamen docente.
     - Clic en **Publicar** → Diálogo de confirmación ("Se notificará al grupo y quedará visible para los estudiantes").
     - Confirmar publicación → Estado cambia a **Publicada** con badge verde.
- **Narrador:**
  > "Ingresamos como profesor. En el dashboard vemos el estado consolidado de los grupos y los inconvenientes recientes traídos en vivo desde APIM.  
  > En Ajustes del curso, el docente define los criterios de la rúbrica; el sistema valida automáticamente que la ponderación sume exactamente 100% y permite afinar las directrices del modelo de IA.  
  > Al entrar al detalle de un grupo, observamos el análisis técnico generado: nivel de cumplimiento de cada criterio y evidencias comprobables de commits y PRs.  
  > Finalmente, en la sección de Retroalimentación, el profesor toma como base el análisis de la IA, redacta sus observaciones y pulsa 'Publicar'. Tras confirmar en el diálogo de seguridad, la retroalimentación queda fijada y se dispara el evento hacia la cola de Azure."

---

### Escena 4: Notificación en Tiempo Real (2:45 – 3:30)
- **Visual:**
  - Dos ventanas lado a lado (Profesor en una, Estudiante en otra) o zoom a la campana (`NotificationBell`).
  - Al publicar la retroalimentación, la campana del estudiante sube el contador sin recargar la página (`+1`).
  - Abrir el desplegable: aparece la notificación `FEEDBACK_PUBLISHED` con su título, fecha y estado de conexión WebSocket verde.
  - Recargar la página: la campana conserva la notificación (persistencia en base de datos vía APIM).
  - Marcar como leída: el contador baja a cero.
- **Narrador:**
  > "Observemos la campana de notificaciones. Inmediatamente después de que el profesor publica la entrega, el microservicio MS2 emite el mensaje a la cola, MS3 lo procesa y, mediante una conexión persistente de Azure Web PubSub, el contador se incrementa instantáneamente en pantalla sin necesidad de recargar.  
  > Si el estudiante refresca la ventana, la notificación persiste gracias al almacenamiento en base de datos, y puede marcarla como leída de inmediato."

---

### Escena 5: Flujo del Estudiante (3:30 – 4:15)
- **Visual:**
  - Cierre de sesión y login con Google (cuenta de prueba institucional `@estudiantec.cr`).
  - Redirección automática a la vista de estudiante (`/student`).
  - Panel en modo **Solo Lectura**:
    - Nota oficial obtenida de la rúbrica.
    - Observaciones publicadas por el profesor y base analítica de la IA.
    - Criterios de evaluación y evidencias detectadas en su repositorio GitHub.
    - Demostración de que no hay campos editables.
- **Narrador:**
  > "Iniciamos sesión ahora con Google como estudiante del grupo. El sistema detecta el rol y nos redirige al panel de estudiante.  
  > Aquí, en estricto modo de solo lectura, el equipo consulta la calificación oficial, las observaciones dictadas por el profesor, el análisis de la IA y el registro de evidencias de su repositorio. Si el profesor aún tuviese la entrega en borrador, la vista indicaría claramente que está pendiente de publicación, resguardando la privacidad de las evaluaciones preliminares."

---

### Escena 6: Evidencias de Infraestructura, CI/CD y Cierre (4:15 – 5:00)
- **Visual:**
  - Portal de Azure: Azure API Management con las APIs registradas (`ms2-analysis`, `ms3-notifications`, etc.).
  - Repositorio en GitHub: pestaña de GitHub Actions con el flujo verde de `build` y `deploy` a Azure Static Web Apps.
  - Pantalla final con créditos del equipo y logotipo del TEC.
- **Narrador:**
  > "En el Portal de Azure confirmamos la configuración productiva: las políticas de APIM enrutando hacia los microservicios, las colas de mensajería y el servicio Web PubSub.  
  > Todo cambio en el repositorio es verificado mediante GitHub Actions, ejecutando análisis estático con ESLint, empaquetado con Vite y despliegue automatizado a Azure Static Web Apps.  
  > Con esto, RevisaTEC integra con éxito una experiencia fluida, segura y reactiva para la revisión colaborativa de software en el TEC. ¡Muchas gracias!"

---

## 2. Datos de Demostración Necesarios (Pre-requisitos antes de grabar)

1. **Usuarios de prueba:**
   - Profesor: `profesor@itcr.ac.cr`.
   - Estudiante (Google OAuth): Correo agregado previamente a **"Audience → Test users"** en Google Cloud Console.
2. **Entidades en base de datos (vía APIM o Scripts):**
   - Al menos 1 curso activo asignado al profesor.
   - Grupo 2 (`Grupo 2`) con repositorio asignado (`revisatec/g2-web`) y estudiantes registrados.
   - Criterios de rúbrica configurados sumando 100%.
   - Al menos 1 evento próximo en el calendario.
   - Análisis previo disponible para Grupo 2 (`/groups/2/analysis`).
3. **Servicios de Azure encendidos:**
   - Azure API Management respondiendo.
   - MS3 corriendo y conectado al Azure Web PubSub real (o local verificado).
   - Cola de Azure Storage activa.

---

## 3. Lista de Capturas de Pantalla Recomendadas

| Nombre sugerido | Pantalla / Recurso | Tema / Detalle |
|---|---|---|
| `01-login-claro.png` | Login | Claro - Formulario y botón de Google |
| `02-dashboard-claro.png` | Dashboard | Claro - 4 métricas, tabla y widgets |
| `03-dashboard-oscuro.png` | Dashboard | Oscuro - Contraste y paleta San Marino |
| `04-rubrica-validacion-100.png` | Ajustes de curso | Validación verde (Total 100%) e IA |
| `05-rubrica-alerta-pesos.png` | Ajustes de curso | Badge ámbar (Suma != 100%) |
| `06-grupo-detalle-analisis.png` | Detalle de grupo | Calificación, criterios y evidencias |
| `07-grupo-sintesis-modal.png` | Detalle de grupo | Modal de síntesis de avance por criterio |
| `08-inconvenientes-lista.png` | Inconvenientes | Lista filtrada con badges de estado |
| `09-feedback-profesor-edicion.png` | Retroalimentación | Versión profesor editable y base IA |
| `10-feedback-modal-publicar.png` | Retroalimentación | Diálogo de confirmación para publicar |
| `11-feedback-publicada.png` | Retroalimentación | Badge verde "Publicada" |
| `12-campana-notificacion-vivo.png` | Navbar | Desplegable de campana con aviso nuevo |
| `13-estudiante-feedback-publicada.png` | Vista estudiante | Modo solo lectura con dictamen docente |
| `14-estudiante-feedback-pendiente.png` | Vista estudiante | Estado "Aún no hay retroalimentación" |
| `15-azure-apim-portal.png` | Azure Portal | Gateway APIM con APIs y políticas |
| `16-github-actions-cicd.png` | GitHub | Pipeline exitoso (lint, build y deploy) |

---

## 4. Consejos Técnicos de Grabación

1. **Resolución:** Grabar a 1920x1080 (1080p) a 60 fps o 30 fps estables. Escala de pantalla en Windows al 100%.
2. **Conexiones Web PubSub:** El plan Free de Azure Web PubSub soporta un máximo de 20 conexiones simultáneas. Cerrar pestañas viejas o instancias de prueba antes de la grabación para no saturar los sockets.
3. **Navegador en limpio:** Utilizar una ventana de Chrome/Edge limpia (perfil dedicado sin extensiones invasivas ni marcadores saturados).
4. **Tomas continuas:** Realizar la grabación por escenas (bloques de 30 a 60 segundos). Si hay un error, pausar y reiniciar únicamente esa escena para facilitar la edición final.
