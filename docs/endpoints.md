# Endpoints - RevisaTEC (Fase I - Mock Services)

## Cursos
- GET /courses
- POST /courses
- GET /courses/{id}
- PUT /courses/{id}
- DELETE /courses/{id}

## Rúbrica e indicaciones
- GET /courses/{id}/rubric
- PUT /courses/{id}/rubric
- GET /courses/{id}/instructions
- PUT /courses/{id}/instructions

## Configuración de scraping
- GET /courses/{id}/scraping-config
- PUT /courses/{id}/scraping-config

## Grupos
- GET /groups
- POST /groups
- GET /groups/{id}
- PUT /groups/{id}
- DELETE /groups/{id}

## Análisis
- GET /groups/{id}/analysis
- GET /groups/{id}/progress-summary

## Criterios y feedback
- GET /groups/{id}/criteria
- GET /groups/{id}/feedback
- PUT /groups/{id}/feedback
- POST /groups/{id}/feedback/publish

## Entregas directas con el profesor
- GET /groups/{id}/direct-reviews
- POST /groups/{id}/direct-reviews

## Calendario
- GET /calendar/events
- POST /calendar/events
- PUT /calendar/events/{id}
- DELETE /calendar/events/{id}

## Inconvenientes
- GET /groups/{id}/issues

## Reporte
- GET /groups/{id}/report