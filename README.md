# RevisaTEC

Plataforma de revisión de código entre pares para proyectos grupales de cursos de programación del TEC.

**Aplicación desplegada:** https://green-ocean-067c41510.3.azurestaticapps.net

> **Estado:** Fase II (Semana 4). Frontend integrado mediante **Azure API Management** con microservicios reales: **MS1** (Administración y Cursos en Azure SQL), **MS2** (Rúbrica IA, Análisis y Reportes en Python/FastAPI con Azure Cosmos DB y Queue Storage) y **MS3** (Notificaciones en tiempo real con Azure Web PubSub y Node.js).

---

## 1. Descripción

RevisaTEC se conecta a los repositorios de GitHub/GitLab de cada equipo y promueve la revisión de código entre compañeros antes de fusionar a ramas principales, replicando los estándares de la industria. Analiza el aporte individual y del equipo mediante modelos de IA, evalúa rúbricas dinámicas y notifica en vivo a docentes y estudiantes.

---

## 2. Variables de Entorno

Configura en tu archivo local `.env.local` (este archivo está excluido del control de versiones por seguridad):

| Variable | Descripción |
|---|---|
| `VITE_API_BASE_URL` | URL base del gateway de Azure API Management (APIM) |
| `VITE_API_KEY` | Llave de suscripción de Azure APIM (`Ocp-Apim-Subscription-Key`) |
| `VITE_GOOGLE_CLIENT_ID` | Identificador de cliente OAuth2 para inicio de sesión con Google |
| `VITE_NOTIFICATIONS_SOURCE` | Fuente de notificaciones en vivo: `api` (por defecto, MS3 vía APIM) o `mock` (simulación local) |
| `VITE_NOTIFICATIONS_BASE_URL` | URL de backend directo de MS3 (opcional para desarrollo local desacoplado de APIM) |

*Nota: En producción, estas variables se inyectan de manera segura como secretos de GitHub Actions en el flujo de CI/CD.*

---

## 3. Instalación y Ejecución en Local

### Requisitos previos
- Node.js 18+ (recomendado Node 20 LTS)
- npm 9+

### Pasos
```bash
# 1. Clonar el repositorio
git clone https://github.com/Crisaraya21/revisatec.git
cd revisatec

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev

# 4. Validar linter y empaquetado de producción
npm run lint
npm run build
```

---

## 4. Pantallas y Endpoints Consumidos

Todas las solicitudes ingresan a través del gateway unificado de Azure API Management con fechas en milisegundos Epoch (UTC):

| Ruta de la Vista | Pantalla / Funcionalidad | Endpoints Consumidos en Azure APIM |
|---|---|---|
| `/` | **Dashboard principal** | `GET /groups`, `GET /courses/{id}/events`, `GET /groups/{id}/issues` |
| `/groups` | **Gestión de grupos** | `GET /groups`, `POST /groups`, `PUT /groups/{id}`, `DELETE /groups/{id}` |
| `/groups/:id` | **Detalle de grupo** | `GET /groups/{id}`, `GET /groups/{id}/analysis`, `GET /groups/{id}/progress-summary`, `GET /groups/{id}/issues` |
| `/rubric` | **Ajustes de curso y Rúbrica IA** | `GET/PUT /courses/{id}/rubric`, `GET/PUT /courses/{id}/instructions`, `GET/PUT /courses/{id}/scraping` |
| `/calendar` | **Calendario de hitos** | `GET/POST /courses/{id}/events`, `PUT/DELETE /events/{id}` |
| `/issues` | **Inconvenientes de grupos** | `GET /groups`, `GET /groups/{id}/issues` |
| `/feedback` | **Retroalimentación (Docente)** | `GET/PUT /groups/{id}/feedback`, `POST /groups/{id}/feedback/publish`, `GET /groups/{id}/analysis` |
| `/student` | **Panel del estudiante** | `GET /groups/{id}/feedback` (solo lectura si está publicada), `GET /groups/{id}/analysis` |
| Barra superior | **Campana en vivo (`NotificationBell`)** | `GET /notifications/negotiate` (WebSocket en Azure Web PubSub), `GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all` |

---

## 5. Arquitectura y Tiempo Real

```
┌────────────────────────────────────────────────────────┐
│             Frontend (Azure Static Web Apps)           │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / WSS
                            ▼
┌────────────────────────────────────────────────────────┐
│             Azure API Management (Gateway)             │
└───────┬───────────────────┬────────────────────┬───────┘
        │                   │                    │
        ▼                   ▼                    ▼
┌──────────────┐    ┌──────────────┐     ┌──────────────┐
│     MS1      │    │     MS2      │     │     MS3      │
│  (Admin/SQL) │    │ (IA/FastAPI) │     │ (Node.js/Pub)│
└───────┬──────┘    └───────┬──────┘     └───────┬──────┘
        │                   │                    │
        ▼                   ▼                    ▼
  Azure SQL DB       Azure Cosmos DB       Azure Web PubSub
                           │                     ▲
                           ▼                     │
                     Azure Queue Storage ────────┘
```

- **Notificaciones en tiempo real:** Controladas mediante la variable `VITE_NOTIFICATIONS_SOURCE`. En modo `api`, la aplicación negocia un token seguro contra MS3 vía APIM y establece un WebSocket bidireccional contra **Azure Web PubSub**. Si la conexión se interrumpe, el cliente reintenta automáticamente con retroceso exponencial (`fibonacciBackoff`) y sondeo periódico de respaldo.

---

## 6. Accesibilidad y Estándares de Diseño

- **WCAG 2.1 AA:** Ratios de contraste superior a 4.5:1 en temas claro y oscuro, navegación completa por teclado, indicadores de foco accesibles y atributos ARIA (`role="status"`, `role="alert"`, `aria-live`).
- **Estados controlados:** Toda pantalla implementa estados explícitos de Carga, Éxito, Vacío y Error con alertas descriptivas para códigos HTTP 400 y 404, sin secciones en blanco ni datos estáticos inventados.

---

## 7. Documentación y Guion de Demostración

- [Borrador del guion para video demostrativo](docs/guion-video-borrador.md)
- Diagramas y contratos de API disponibles en el directorio `docs/`.

---

## 8. Equipo de Desarrollo

- **Marlon Fabian Aragón Arce** — UX/UI, diseño de interfaces, integración de frontend con MS2/MS3 y accesibilidad.
- **Cristopher Daniel Araya Vega** — Infraestructura en la nube, Azure API Management, microservicio MS3 (Notificaciones) y CI/CD.
- **Leiner Josué Aguilar González** — Microservicio MS2 (Rúbrica IA y Análisis), contratos OpenAPI y documentación técnica.

---

## 9. Licencia

Proyecto académico — Instituto Tecnológico de Costa Rica (TEC San Carlos), curso IC-6821 Diseño de Software, profesor Marcos Rodríguez, II semestre 2026.
