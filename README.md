# UNCP • FIS | Canvas 2D Physics Workbench

> **Universidad Nacional del Centro del Perú**  
> **Facultad de Ingeniería de Sistemas** — Escuela Profesional de Ingeniería de Sistemas  
> **Asignatura:** Desarrollo de Aplicaciones Web (IS093A) — Semestre 2026-II  
> **Guía Práctica N° 04:** JavaScript Moderno, Closures, DOM API & Canvas 2D  

---

## 👤 Autor

* **Estudiante:** José Pablo Osorio Mallqui
* **GitHub:** [@StoneFind22](https://github.com/StoneFind22)
* **Carrera:** Ingeniería de Sistemas
* **Tecnologías:** HTML5 Semántico, CSS3 Nativo (Variables CSS), Vanilla JS ES6+ (**Estricto: Sin librerías ni dependencias externas**)

---

## 🚀 Descripción del Proyecto

**Canvas 2D Physics Workbench** es un banco de pruebas cinemático interactivo diseñado para experimentar con partículas vectoriales, fuerzas elásticas y enlaces de constelación. El proyecto implementa los estándares clave del desarrollo frontend avanzado:

1. **Aislamiento de Ámbito (IIFE):** Encapsulación total del código para prevenir la contaminación del objeto global `window`.
2. **Gestión de Estado por Closures:** Entornos léxicos retenidos en memoria Heap (`createParticleEngine`, `createPerformanceTracker`) que preservan el estado cinemático entre fotogramas sin variables globales.
3. **Loop Cinemático con Delta Time ($\Delta t$):** Renderizado sincronizado con `requestAnimationFrame` (prohibido `setInterval`), garantizando velocidad física uniforme e independiente del refresco del monitor.
4. **Desacoplamiento de Render FPS y Física (hasta 1 kHz):** Permite calibrar la tasa de dibujo visual en Canvas (15 — 144 FPS) de forma independiente a la frecuencia de cálculo cinemático, la cual opera con **substepping temporal** hasta 1000 Hz (1 kHz).
5. **Anti-Reflow en el DOM:** Manipulación mediante `classList.toggle()` y variables CSS en `:root`, erradicando el *layout thrashing*.
6. **Telemetría de Laboratorio en Vivo:** Monitoreo en tiempo real de Render FPS, Physics Tick Rate, Delta Time, Heap JS de V8 y sincronización de refresco.

---

## 🏛️ Estructura de Archivos

```text
aguilar-4/
├── index.html                  # Interfaz semántica del Workbench, controles y viewport Canvas
├── style.css                   # Sistema de tokens CSS, layout responsivo y temas claro/oscuro
├── app.js                      # IIFE, Closures de estado, Canvas 2D render loop y telemetría
├── Guia_Practica_Semana_4.pdf  # Especificación oficial de la práctica de laboratorio
└── README.md                   # Documentación técnica esencial del proyecto
```

---

## 📊 Telemetría y Controles del Sistema

| Parámetro / Métrica | Rango / Unidad | Descripción Técnica |
| :--- | :---: | :--- |
| **Densidad de Muestra (N)** | 10 — 400 | Cantidad de partículas simuladas simultáneamente en memoria. |
| **Velocidad Escalar Base** | 10 — 300 px/s | Magnitud de velocidad integrada vectorialmente con $\Delta t$. |
| **Radio Máximo (r)** | 1 — 12 px | Tamaño de partículas dibujadas mediante `ctx.arc()`. |
| **Umbral de Proximidad (d)** | 0 — 220 px | Distancia máxima para trazar constelaciones con `ctx.stroke()`. |
| **Tasa de Render FPS** | 15 — 144 FPS | Control de fotogramas visuales por segundo mediante *throttling* de rAF. |
| **Frecuencia Física (Tick Rate)** | 15 — 1000 Hz | Resolución temporal de física con substepping hasta 1 kHz. |
| **Telemetría en Vivo** | HUD en tiempo real | Lectura de `RENDER_FPS`, `PHYSICS_TICK`, `DELTA_TIME`, `HEAP_V8` y `REFRESH_SYNC`. |

---

## ⌨️ Atajos de Teclado

| Tecla | Acción |
| :---: | :--- |
| <kbd>SPACE</kbd> | Pausar / Reanudar el motor de animación |
| <kbd>R</kbd> | Reiniciar posiciones y velocidades de las partículas |
| <kbd>T</kbd> | Alternar entre Tema Oscuro y Tema Claro |

---

## 🤖 Declaración de Asistencia de IA (Rúbrica de Laboratorio)

* **Asistencia de IA (Documentada en código):** Optimización matemática en `app.js` para el descarte de distancias de constelación ($d^2 < r^2$) y algoritmo de media móvil en ventana deslizante para cálculo de FPS.

---
