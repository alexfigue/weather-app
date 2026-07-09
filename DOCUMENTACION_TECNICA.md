# 📋 Documentación Técnica — El Tiempo + Mar (Weather App)

> **Versión**: 1.0.0  
> **Fecha**: Julio 2026  
> **Clasificación**: Uso interno — Departamento TIC  
> **Autor**: Equipo de Desarrollo Balfegó

---

## 1. Resumen Ejecutivo

**Weather App (El Tiempo + Mar)** es una aplicación web progresiva (PWA) de uso interno desarrollada para proveer información meteorológica y oceanográfica detallada y localizada en **L'Ametlla de Mar** (específicamente en la zona de las jaulas de acuicultura de Balfegó). 

### Problema que resuelve
Las operaciones marítimas y de mantenimiento en las jaulas de atún requieren de precisión climatológica y oceánica. El equipo de operarios y gestión necesita previsiones atmosféricas y del estado del mar a múltiples profundidades (temperatura, salinidad, clorofila, oxígeno y corrientes) para planificar eficazmente las tareas.

### Valor de negocio y Visión Futura
Actualmente la aplicación proporciona visualización de datos en tiempo real y previsiones. **En el futuro cercano (Fase 2), esta aplicación cruzará los datos climatológicos con la Base de Datos interna** para analizar el impacto del clima y el mar en:
* **Stock de Atún** (crecimiento, mortandad según temperatura).
* **Extracciones** (planificación de jornadas de pesca según oleaje/corrientes).
* **Accidentes Laborales** (correlación entre condiciones climáticas adversas y siniestralidad).

---

## 2. Stack Tecnológico

### Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                    NAVEGADOR (Cliente - PWA)              │
│  ┌──────────────────────────────────────────────────┐   │
│  │     Vanilla JavaScript (ES6+) + CSS3 + HTML5      │   │
│  │     Chart.js para gráficos avanzados              │   │
│  │     Service Workers (sw.js) para Offline Mode     │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │ HTTP (fetch /api/marine)            │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────────┐
│            BACKEND (Python + Flask)                       │
│  ┌──────────────────┴───────────────────────────────┐   │
│  │  Servidor API — server.py                        │   │
│  │  ├── Servidor de Estáticos (index.html, JS, CSS) │   │
│  │  ├── Endpoint /api/marine                        │   │
│  │  ├── Endpoint /api/marine/refresh                │   │
│  │  + Módulo Fetcher (Copernicus Marine Service)      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Tecnologías Detalladas

| Capa | Tecnología | Propósito |
|---|---|---|
| **Frontend** | Vanilla JS, HTML, CSS | Rendimiento extremo, sin frameworks pesados |
| **Gráficos** | Chart.js | Representación de series temporales (temperatura, etc.) |
| **PWA** | Manifest, Service Worker | Instalable en móviles, carga offline de la UI |
| **Backend** | Python (Flask) | Servidor HTTP ligero y exposición de API JSON |
| **Procesamiento de Datos**| xarray, netcdf4, pandas, numpy | Manipulación de datos científicos multidimensionales |
| **Fuente de Datos Marinos** | copernicusmarine | SDK de Copernicus Marine Service |

---

## 3. Estructura del Proyecto

```
weather-app/
├── 📄 requirements.txt          # Dependencias de Python (Flask, xarray, pandas...)
├── 📄 server.py                 # Backend Flask: API y orquestación de descargas
├── 📄 copernicus_fetcher.py     # Script de extracción de datos de Copernicus (NC → JSON)
├── 📄 update_marine_data.py     # Script ejecutable para actualizar manualmente los datos
├── 📄 marine_data.json          # Archivo generado con el snapshot actual de los datos
├── 📄 marine_cache.json         # Cache interna manejada por el servidor Flask
│
├── 📄 index.html                # Interfaz de usuario y punto de entrada
├── 📄 style.css                 # Hojas de estilo y diseño (Responsive, Dark Theme)
├── 📄 app.js                    # Lógica de cliente, renderizado y conexión al API
├── 📄 manifest.json             # Manifiesto para PWA (Progressive Web App)
├── 📄 sw.js                     # Service Worker (Cache de recursos estáticos)
└── 📁 icons/                    # Iconografía de la PWA
```

---

## 4. Orígenes de Datos Oceanográficos

La aplicación consulta el servicio europeo **Copernicus Marine Service** para obtener modelos predictivos.

### Profundidades Monitoreadas
Las variables se extraen en 5 niveles de profundidad: **Superficie (0m), 10m, 20m, 30m y 40m**.

### Variables Físicas y Biogeoquímicas (Datasets)
| Variable | Descripción | Dataset de Copernicus |
|---|---|---|
| `temperature` | Temperatura del mar | `cmems_mod_med_phy-tem_anfc_4.2km_P1D-m` |
| `salinity` | Salinitat | `cmems_mod_med_phy-sal_anfc_4.2km_P1D-m` |
| `currents` | Corrientes (u, v) | `cmems_mod_med_phy-cur_anfc_4.2km_P1D-m` |
| `oxygen` | Oxígeno disuelto | `cmems_mod_med_bgc-bio_anfc_4.2km_P1D-m` |
| `chlorophyll` | Clorofila | `cmems_mod_med_bgc-pft_anfc_4.2km_P1D-m` |
| `nutrients` | Nitratos y Fosfatos | `cmems_mod_med_bgc-nut_anfc_4.2km_P1D-m` |
| `mixed_layer` | Termoclina (MLD) | `cmems_mod_med_phy-mld_anfc_4.2km-2D_PT1H-m` |

> **Nota de Procesamiento:** Los archivos crudos (`.nc` NetCDF) se descargan temporalmente, se procesan usando `xarray` para hacer una media espacial en la caja delimitada (lat: 40.80 - 40.90, lon: 0.80 - 0.90) y se estructuran en JSON. Se guardan previsiones de **3 días hacia el pasado y 5 días hacia el futuro**.

---

## 5. Arquitectura Backend

El servidor es una aplicación Python usando `Flask`. 

### `GET /api/marine`
Endpoint principal del frontend.
* **Mecanismo de Caché**: Las peticiones primero verifican si existe un archivo en caché (`marine_cache.json`) que tenga menos de 6 horas de antigüedad.
* **Fondo (Background Thread)**: Si la caché no existe o está caducada, el servidor responde inmediatamente con los datos viejos o un código HTTP `202 Accepted` indicando que está cargando, y arranca un hilo en background para descargar los gigabytes de datos NetCDF usando `copernicus_fetcher.py`.
* **Auto-refresh**: Un hilo separado se despierta cada 6 horas para re-descargar datos sin intervención del usuario.

### `POST /api/marine/refresh`
Endpoint de forzado. Activa el mecanismo de refresco inmediatamente, retornando que la operación está en curso.

---

## 6. Arquitectura Frontend (PWA)

La aplicación cliente se apoya en tres pilares:

1. **Diseño Móvil y Responsive**: La UI está optimizada al máximo para operarios usando teléfonos móviles bajo el sol (alto contraste, iconos SVG adaptables, estilo oscuro predominante).
2. **Service Worker (`sw.js`)**: Gestiona la retención en caché de archivos locales (`index.html`, `style.css`, fuentes, etc.). Esto permite que la aplicación cargue la carcasa UI instantáneamente, independientemente de la conexión.
3. **Visualización Gráfica (`app.js`)**: Usando `Chart.js`, los datos de la previsión de hasta 5 días para las variables meteorológicas o marinas se transforman de JSON a series temporales amigables.

---

## 7. 🚀 FUTURO: Integración y Cruce de Datos (BBDD Balfegó)

Esta sección define el plan técnico acordado con la **Dirección TIC** para evolucionar esta herramienta de un simple "visor" a una **herramienta de Business Intelligence operativa**.

Para el próximo ciclo de desarrollo, la aplicación se conectará a la Base de Datos centralizada (SQL Server/PostgreSQL) para cruzar variables meteorológicas y del estado del mar con las operativas:

### A. Cruce con Módulo de Stock (Crecimiento y Mortalidad)
* **Objetivo**: Determinar qué rangos de **Temperatura a 20m-30m** y **Oxígeno disuelto** favorecen o penalizan la alimentación y supervivencia del atún.
* **Acción Técnica**: Incorporar endpoint `GET /api/stock_correlation` que muestre una gráfica combinando la evolución del parámetro marino vs Índice de Engorde.

### B. Cruce con Módulo de Extracciones (Planificación)
* **Objetivo**: Calcular la ventana óptima de pesca basándose en el estado del mar para asegurar el bienestar animal y la seguridad de las embarcaciones.
* **Acción Técnica**: Uso de la previsión de corrientes (`current_speed`) a 5 días y alertas de termoclina (`mixed_layer_depth`) para recomendar automáticamente al equipo de operaciones los mejores días para extraer.

### C. Cruce con Accidentes Laborales (Riesgos Laborales)
* **Objetivo**: Identificar patrones de siniestralidad a bordo de las embarcaciones en condiciones marítimas concretas.
* **Acción Técnica**: Crear un modelo estadístico cruzando la base de datos de partes de accidentes con el histórico guardado de viento, altura de ola (si se integra) y corrientes. Se diseñará un sistema de "Semáforo de Riesgo Operativo" en el frontend.

---

## 8. Guía de Ejecución y Despliegue

### Requisitos Previos
* **Python 3.10 o superior**.
* Credenciales de **Copernicus Marine Service** (previamente habiendo ejecutado `copernicusmarine login`).

### Instalación Local
```bash
# 1. Crear entorno virtual
python -m venv venv

# 2. Activar entorno virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Iniciar el servidor
python server.py
```
> La aplicación estará disponible en `http://localhost:5000`

### Actualización Manual de Datos
Si se requiere refrescar o generar el archivo estático (`marine_data.json`) sin levantar el servidor:
```bash
python update_marine_data.py
```

### Despliegue en Producción
El despliegue está pensado para ser empaquetado en un contenedor **Docker** (recomendado Gunicorn sobre Flask para el manejo de hilos, o servir la aplicación estática mediante Nginx y tener un servicio Cron para la recolección de datos de Copernicus).

---

> **Documento preparado para revisión y planificación futura.**  
> Equipo TIC Balfegó.
