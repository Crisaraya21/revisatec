# RevisaTEC

Plataforma de revisión de código entre pares para proyectos grupales de cursos de programación del TEC.

## Descripción

RevisaTEC se conecta al repositorio de GitHub/GitLab de cada equipo y exige que todo cambio pase por revisión de un compañero antes de fusionarse a la rama principal, replicando el flujo de trabajo estándar de la industria. Calcula un índice de contribución individual objetivo y se lo muestra al profesor en un dashboard.

## Problema que resuelve

Hoy el profesor solo ve el resultado final de un repositorio, sin visibilidad de si hubo control de calidad entre compañeros ni de cuánto aportó cada estudiante. Esto genera notas grupales injustas y priva a los estudiantes de practicar el code review.

## Funcionalidades principales

- Configuración de rúbrica e indicaciones del curso con apoyo de IA (interpretación automática de PDF/DOCX/XLSX).
- Dashboard del profesor con métricas por grupo, próximas entregas e inconvenientes.
- Detalle de grupo con nota estimada, evidencia de PRs/commits y contribución por estudiante.
- Síntesis del avance y retroalimentación (propuesta de la IA + versión editable del profesor).
- Calendario de entregas con avisos automáticos.
- Detección de inconvenientes (commits de prueba, errores de entrega).
- Panel del estudiante con su propio aporte, retroalimentación publicada, edición de datos del grupo (integrantes, repositorio) y calendario filtrado a su propio grupo.

> **Nota:** la integración con Google (autenticación OAuth2) se documentará en detalle una vez esté lista su implementación.

## Arquitectura

Microservicios comunicados por cola de mensajes: **Repo-Integration**, **Review-Workflow**, **Contribution-Metrics**, **Reports**, **Notifications**, **Rubric-AI** y **Calendar**. Backend en Azure App Service, expuesto vía Azure API Management. Autenticación OAuth2 (Google/GitHub). Ver el documento formal (`RevisaTEC_Documento_Formal.docx`) para el detalle completo.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite |
| Backend | Azure App Service + Azure API Management |
| CI/CD | GitHub Actions (lint, build; versionado automático por git tag) |
| Autenticación | OAuth2 (Google, GitHub) |
| Base de datos | Por definir en Fase 2 |

## Instalación y uso

```bash
git clone https://github.com/Crisaraya21/revisatec.git
cd revisatec
npm install
npm run dev
```

Variables de entorno (`.env.local`):

```
VITE_API_BASE_URL=<url del gateway de Azure API Management>
```

## Equipo

- **Marlon Fabian Aragón Arce** — UX/UI: heurísticas, accesibilidad, wireframes, sistema de diseño y mockups de alta fidelidad.
- **Cristopher Daniel Araya Vega** — Infraestructura: repositorio, diagrama de arquitectura, Azure, Mock Services y pipeline CI/CD.
- **Leiner Josué Aguilar González** — Documentación formal, informe UX/UI y desarrollo frontend.

## Estructura del repositorio

```
revisatec/
├── docs/                  # Diagrama de arquitectura y endpoints de Mock Services
├── public/                # Assets estáticos
├── src/
│   ├── api/               # Cliente de la API (Mock Services)
│   ├── components/        # Componentes reutilizables (Icons, formularios, banners)
│   ├── context/            # AuthContext, ThemeContext
│   ├── hooks/              # usePaginatedList
│   └── pages/              # Login, Groups, GroupDetail, Rubric, Calendar, Feedback,
│                           #   Issues, StudentDashboard, StudentFeedback, StudentGroup
├── .github/workflows/      # CI (lint/build) y despliegue a Azure Static Web Apps
└── README.md
```

## Créditos

- [React](https://react.dev/) — biblioteca de UI
- [Vite](https://vitejs.dev/) — bundler y entorno de desarrollo
- [React Router](https://reactrouter.com/) — enrutamiento
- [Azure Static Web Apps](https://azure.microsoft.com/products/app-service/static/) — hosting
- [Azure API Management](https://azure.microsoft.com/products/api-management/) — gateway y Mock Services
- [GitHub Actions](https://github.com/features/actions) — CI/CD
- [Figma](https://www.figma.com/) — diseño UI/UX

## Licencia

Proyecto académico — Instituto Tecnológico de Costa Rica (TEC San Carlos), curso IC-5821.
