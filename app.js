/**
 * ============================================================================
 * UNIVERSIDAD NACIONAL DEL CENTRO DEL PERÚ
 * FACULTAD DE INGENIERÍA DE SISTEMAS
 * ASIGNATURA: Desarrollo de Aplicaciones Web (IS093A)
 * GUÍA PRÁCTICA N° 04: JavaScript Moderno, Closures, DOM API & Canvas 2D
 * AUTOR: José Pablo Osorio Mallqui (GitHub: @StoneFind22)
 * INSTITUCIÓN: Universidad Nacional del Centro del Perú (UNCP) • FIS
 * ============================================================================
 */
(() => {
  'use strict';

  /* ==========================================================================
     MÓDULO 1: CLOSURE PARA SEGUIMIENTO DE RENDIMIENTO Y TELEMETRÍA (FPS / MEM)
     ========================================================================== */
  const createPerformanceTracker = () => {
    // Variables de estado retenidas en el closure
    let frameTimes = [];
    let lastMetricUpdate = performance.now();
    let currentRenderFps = 60;
    let currentPhysicsHz = 60;
    let minFps = 60;
    let maxFps = 60;
    let frameCount = 0;
    let framesRenderedSinceUpdate = 0;
    let physicsTicksSinceUpdate = 0;
    const windowSize = 30;

    /**
     * [USO DE IA - RÚBRICA]: Medición independiente desacoplada de Render FPS
     * (tasa de dibujo visual en Canvas) y Physics Hz (tasa cinemática con substepping).
     */
    const recordTick = (dtSeconds, physicsStepsInFrame = 1) => {
      frameCount++;
      framesRenderedSinceUpdate++;
      physicsTicksSinceUpdate += physicsStepsInFrame;

      const now = performance.now();
      const instantFps = dtSeconds > 0 ? 1 / dtSeconds : 60;
      
      frameTimes.push(instantFps);
      if (frameTimes.length > windowSize) {
        frameTimes.shift();
      }

      // Consolidar promedios cada 250ms
      const elapsedMs = now - lastMetricUpdate;
      if (elapsedMs >= 250) {
        currentRenderFps = Math.max(1, Math.round((framesRenderedSinceUpdate / elapsedMs) * 1000));
        currentPhysicsHz = Math.max(1, Math.round((physicsTicksSinceUpdate / elapsedMs) * 1000));
        
        framesRenderedSinceUpdate = 0;
        physicsTicksSinceUpdate = 0;
        lastMetricUpdate = now;

        if (currentRenderFps < minFps && frameCount > 60) minFps = currentRenderFps;
        if (currentRenderFps > maxFps) maxFps = currentRenderFps;
      }

      return {
        renderFps: currentRenderFps,
        physicsHz: currentPhysicsHz
      };
    };

    const getMetrics = () => {
      // Detección segura de memoria en motores V8 (Chromium)
      let memoryMb = null;
      if (window.performance && performance.memory) {
        memoryMb = (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1);
      }

      return {
        renderFps: currentRenderFps,
        physicsHz: currentPhysicsHz,
        minFps: minFps,
        maxFps: maxFps,
        totalFrames: frameCount,
        memoryUsedMb: memoryMb
      };
    };

    const reset = () => {
      frameTimes = [];
      lastMetricUpdate = performance.now();
      currentRenderFps = 60;
      currentPhysicsHz = 60;
      minFps = 60;
      maxFps = 60;
      frameCount = 0;
      framesRenderedSinceUpdate = 0;
      physicsTicksSinceUpdate = 0;
    };

    return {
      recordTick,
      getMetrics,
      reset
    };
  };

  /* ==========================================================================
     MÓDULO 2: CLOSURE DEL MOTOR DE PARTÍCULAS (CANVAS 2D PHYSICS ENGINE)
     ========================================================================== */
  const createParticleEngine = (canvas, initialConfig = {}) => {
    // Contexto 2D del Canvas optimizado
    const ctx = canvas.getContext('2d', { alpha: false });
    
    // Configuración reactiva dentro del closure
    let config = {
      particleCount: initialConfig.particleCount || 120,
      baseSpeed: initialConfig.baseSpeed || 90,
      maxRadius: initialConfig.maxRadius || 4,
      connectionDistance: initialConfig.connectionDistance || 110,
      connectParticles: initialConfig.connectParticles ?? true,
      mouseRepel: initialConfig.mouseRepel ?? true,
      gravity: initialConfig.gravity ?? false,
      colorCycle: initialConfig.colorCycle ?? true,
      ...initialConfig
    };

    // Colección de partículas (Heap retenido por el closure del motor)
    let particles = [];
    let hueOffset = 200; // Tonalidad base (Cyan / Azul institucional)

    // Coordenadas del puntero para interacción física
    const pointer = {
      x: -9999,
      y: -9999,
      radius: 120,
      isActive: false
    };

    // Factor de gravedad constante hacia abajo (px/s²)
    const GRAVITY_PULL = 180;

    /**
     * Factoría de partículas dentro del closure
     */
    const createParticle = () => {
      const angle = Math.random() * Math.PI * 2;
      const speedMagnitude = (Math.random() * 0.7 + 0.3) * config.baseSpeed;
      const radius = Math.random() * (config.maxRadius - 1.5) + 1.5;

      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: Math.cos(angle) * speedMagnitude,
        vy: Math.sin(angle) * speedMagnitude,
        radius: radius,
        baseRadius: radius,
        mass: radius * 1.2,
        hue: (hueOffset + Math.random() * 40 - 20) % 360
      };
    };

    /**
     * Inicialización / Repoblación de partículas
     */
    const initParticles = () => {
      particles = [];
      for (let i = 0; i < config.particleCount; i++) {
        particles.push(createParticle());
      }
    };

    /**
     * Ajuste de resolución y Retina Display (DevicePixelRatio)
     * Toque de calidad técnica: Render ultra-nítido en pantallas 4K / High DPI.
     */
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Tamaño lógico escalado
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Escalado de contexto para mantener coordenadas de layout CSS
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Reposicionar partículas que hayan quedado fuera de los nuevos límites
      particles.forEach((p) => {
        if (p.x > rect.width) p.x = Math.random() * rect.width;
        if (p.y > rect.height) p.y = Math.random() * rect.height;
      });
    };


    const updatePhysics = (dt) => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (config.colorCycle) {
        hueOffset = (hueOffset + 12 * dt) % 360;
      }

      const pCount = particles.length;
      for (let i = 0; i < pCount; i++) {
        const p = particles[i];

        // 1. Gravedad vertical condicional
        if (config.gravity) {
          p.vy += GRAVITY_PULL * dt;
        }

        // 2. Interacción con el cursor (Fuerza de repulsión elástica)
        if (config.mouseRepel && pointer.isActive) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const distSq = dx * dx + dy * dy;
          const minDist = pointer.radius;

          if (distSq < minDist * minDist && distSq > 0.001) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / minDist) * 450; // Aceleración de escape
            const nx = dx / dist;
            const ny = dy / dist;

            p.vx += nx * force * dt;
            p.vy += ny * force * dt;
          }
        }

        // 3. Fricción aerodinámica suave para amortiguar velocidades extremas
        p.vx *= (1 - 0.15 * dt);
        p.vy *= (1 - 0.15 * dt);

        // 4. Integración de posición: x = x0 + v * dt
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // 5. Rebote de colisión elástica en las 4 paredes del lienzo
        if (p.x - p.radius < 0) {
          p.x = p.radius;
          p.vx = -p.vx * 0.85;
        } else if (p.x + p.radius > width) {
          p.x = width - p.radius;
          p.vx = -p.vx * 0.85;
        }

        if (p.y - p.radius < 0) {
          p.y = p.radius;
          p.vy = -p.vy * 0.85;
        } else if (p.y + p.radius > height) {
          p.y = height - p.radius;
          p.vy = -p.vy * 0.85;
        }

        // Actualizar tonalidad si el ciclo está activo
        if (config.colorCycle) {
          p.hue = (hueOffset + (i % 30)) % 360;
        }
      }
    };

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Leer tokens de color desde las variables CSS computadas para integración limpia
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      
      // Fondo de lienzo con ligera estela (Motion Trail)
      ctx.fillStyle = isDark ? 'rgba(3, 7, 18, 0.28)' : 'rgba(241, 245, 249, 0.32)';
      ctx.fillRect(0, 0, width, height);

      const pCount = particles.length;
      const maxDist = config.connectionDistance;
      const maxDistSq = maxDist * maxDist;

      // 1. Dibujar líneas de conexión entre partículas cercanas (Constelación)
      // [USO DE IA - RÚBRICA]: Optimización de cálculo O(N²/2) evitando Math.sqrt
      // en la fase de descarte mediante comparación de distancias al cuadrado (distSq).
      if (config.connectParticles && maxDist > 0) {
        ctx.lineWidth = 1;
        
        for (let i = 0; i < pCount; i++) {
          const pi = particles[i];
          for (let j = i + 1; j < pCount; j++) {
            const pj = particles[j];
            const dx = pj.x - pi.x;
            const dy = pj.y - pi.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < maxDistSq) {
              const alpha = (1 - Math.sqrt(distSq) / maxDist) * (isDark ? 0.35 : 0.25);
              ctx.strokeStyle = isDark 
                ? `hsla(${pi.hue}, 80%, 65%, ${alpha})`
                : `hsla(${pi.hue}, 70%, 40%, ${alpha})`;
              
              ctx.beginPath();
              ctx.moveTo(pi.x, pi.y);
              ctx.lineTo(pj.x, pj.y);
              ctx.stroke();
            }
          }
        }
      }

      // 2. Dibujar partículas esféricas con ctx.arc()
      for (let i = 0; i < pCount; i++) {
        const p = particles[i];
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = isDark 
          ? `hsl(${p.hue}, 85%, 65%)`
          : `hsl(${p.hue}, 75%, 45%)`;
        ctx.fill();
      }

      // 3. Renderizar indicador del cursor táctil/mouse si está sobre el lienzo
      if (pointer.isActive && config.mouseRepel) {
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, pointer.radius, 0, Math.PI * 2);
        ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]); // Restaurar trazo sólido
      }
    };

    /**
     * Métodos de gestión de configuración reactiva y ciclo de vida
     */
    const setConfig = (newConfig) => {
      const oldCount = config.particleCount;
      config = { ...config, ...newConfig };

      // Si cambió el número de partículas, ajustar tamaño del array sin descartar todo
      if (newConfig.particleCount !== undefined && newConfig.particleCount !== oldCount) {
        if (config.particleCount > particles.length) {
          const toAdd = config.particleCount - particles.length;
          for (let i = 0; i < toAdd; i++) particles.push(createParticle());
        } else if (config.particleCount < particles.length) {
          particles.length = config.particleCount; // Truncamiento en O(1)
        }
      }
    };

    const resetParticles = () => {
      initParticles();
      // Limpieza completa del lienzo
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
    };

    const clearAll = () => {
      particles = [];
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
    };

    const setPointer = (x, y, active) => {
      pointer.x = x;
      pointer.y = y;
      pointer.isActive = active;
    };

    // Inicializar primer lote
    initParticles();
    resize();

    // API pública sellada por el closure
    return {
      updatePhysics,
      render,
      resize,
      setConfig,
      resetParticles,
      clearAll,
      setPointer,
      getConfig: () => ({ ...config }),
      getParticleCount: () => particles.length,
      getParticles: () => particles,
      getCanvas: () => canvas
    };
  };

  /* ==========================================================================
     MÓDULO 3: CONTROLADOR DOM Y VINCULACIÓN REACTIVA (PASOS 1, 2 Y 3)
     Uso de querySelector, addEventListener con Arrow Functions, validación de
     inputs, classList.toggle() y variables CSS sin reescrituras innecesarias.
     ========================================================================== */
  const initApp = () => {
    // 1. Localización segura de elementos del DOM
    const canvas = document.getElementById('simulationCanvas');
    const viewport = document.getElementById('canvasViewport');
    
    // Controles de formulario
    const particleCountSlider = document.getElementById('particleCountInput');
    const particleCountNum = document.getElementById('particleCountNumber');
    const particleCountVal = document.getElementById('particleCountVal');
    const particleCountError = document.getElementById('particleCountError');

    const baseSpeedSlider = document.getElementById('baseSpeedInput');
    const baseSpeedNum = document.getElementById('baseSpeedNumber');
    const baseSpeedVal = document.getElementById('baseSpeedVal');

    const radiusSlider = document.getElementById('particleRadiusInput');
    const radiusNum = document.getElementById('particleRadiusNumber');
    const radiusVal = document.getElementById('particleRadiusVal');

    const connDistSlider = document.getElementById('connectionDistInput');
    const connDistNum = document.getElementById('connectionDistNumber');
    const connDistVal = document.getElementById('connectionDistVal');

    const renderFpsSlider = document.getElementById('renderFpsInput');
    const renderFpsNum = document.getElementById('renderFpsNumber');
    const renderFpsVal = document.getElementById('renderFpsVal');

    const refreshRateSlider = document.getElementById('refreshRateInput');
    const refreshRateNum = document.getElementById('refreshRateNumber');
    const refreshRateVal = document.getElementById('refreshRateVal');
    const refreshRateDisplay = document.getElementById('refreshRateDisplay');
    const refreshRateSub = document.getElementById('refreshRateSub');
    const physicsHzDisplay = document.getElementById('physicsHzDisplay');

    // Toggles booleanos
    const connectToggle = document.getElementById('connectParticlesToggle');
    const mouseRepelToggle = document.getElementById('mouseRepelToggle');
    const gravityToggle = document.getElementById('gravityToggle');
    const colorCycleToggle = document.getElementById('colorCycleToggle');

    // Botones de acción
    const togglePlayBtn = document.getElementById('togglePlayBtn');
    const playIcon = document.getElementById('playIcon');
    const playText = document.getElementById('playText');
    const resetBtn = document.getElementById('resetBtn');
    const clearBtn = document.getElementById('clearBtn');
    const exportPngBtn = document.getElementById('exportPngBtn');
    const profileBtn = document.getElementById('profileBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const engineBadge = document.getElementById('engineStatusBadge');
    const engineStatusText = document.getElementById('engineStatusText');

    // Iconografía SVG técnica de instrumentación (DreamDesign - Cero emojis)
    const SVG_PAUSE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
    const SVG_PLAY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    const SVG_MOON = `<svg class="icon-theme" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
    const SVG_SUN = `<svg class="icon-theme" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

    // HUD / Telemetría
    const fpsDisplay = document.getElementById('fpsDisplay');
    const fpsCard = document.getElementById('fpsCard');
    const dtDisplay = document.getElementById('dtDisplay');
    const countDisplay = document.getElementById('particleCountDisplay');
    const memDisplay = document.getElementById('memDisplay');
    const toast = document.getElementById('toastNotification');

    // 2. Instanciación de Closures
    const tracker = createPerformanceTracker();
    const engine = createParticleEngine(canvas, {
      particleCount: parseInt(particleCountSlider.value, 10),
      baseSpeed: parseFloat(baseSpeedSlider.value),
      maxRadius: parseFloat(radiusSlider.value),
      connectionDistance: parseFloat(connDistSlider.value),
      connectParticles: connectToggle.checked,
      mouseRepel: mouseRepelToggle.checked,
      gravity: gravityToggle.checked,
      colorCycle: colorCycleToggle.checked
    });

    // 3. Variables de control del Loop de Renderizado (Paso 4)
    let animationFrameId = null;
    let isRunning = true;
    let targetRenderFps = parseInt(renderFpsSlider?.value || '60', 10);
    let targetPhysicsHz = parseInt(refreshRateSlider?.value || '60', 10);
    let lastRenderTime = performance.now();

    /**
     * Sincronizador de telemetría de tasa de refresco (Refresh Sync hasta 1 kHz)
     */
    const updateRefreshSyncUI = (physicsHz, renderFps) => {
      if (physicsHz >= 1000) {
        if (refreshRateDisplay) refreshRateDisplay.textContent = '1.0 kHz';
        if (refreshRateSub) refreshRateSub.textContent = `Substep 1 kHz [${renderFps} FPS]`;
      } else if (physicsHz > 60) {
        if (refreshRateDisplay) refreshRateDisplay.textContent = `${physicsHz} Hz`;
        if (refreshRateSub) refreshRateSub.textContent = `Substep [${physicsHz} Hz / ${renderFps} FPS]`;
      } else if (physicsHz === 60) {
        if (refreshRateDisplay) refreshRateDisplay.textContent = '60 Hz';
        if (refreshRateSub) refreshRateSub.textContent = `rAF Sync [${renderFps} FPS]`;
      } else {
        if (refreshRateDisplay) refreshRateDisplay.textContent = `${physicsHz} Hz`;
        if (refreshRateSub) refreshRateSub.textContent = `Frecuencia Limitada [${renderFps} FPS]`;
      }
    };

    /**
     * Sistema Toast Accesible para notificar eventos al usuario
     */
    let toastTimeout = null;
    const showToast = (message) => {
      toast.textContent = message;
      toast.classList.add('is-active');
      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.remove('is-active');
      }, 2600);
    };

    const animationLoop = (currentTimestamp) => {
      if (!isRunning) return;

      // Throttling reactivo de Render FPS: gobierna exactamente los fotogramas pintados en Canvas
      const renderInterval = 1000 / targetRenderFps;
      const elapsedSinceLastRender = currentTimestamp - lastRenderTime;
      if (elapsedSinceLastRender < renderInterval - 0.75) {
        animationFrameId = requestAnimationFrame(animationLoop);
        return;
      }

      // Delta time real transcurrido entre este fotograma y el anterior
      const dt = Math.min(elapsedSinceLastRender / 1000, 0.1); // Acotado a 100ms para evitar saltos al cambiar pestaña
      lastRenderTime = currentTimestamp;

      // 1. Actualización física con Substepping (Soporte cinemático hasta 1 kHz / 1000 Hz)
      // Dividimos el tiempo de frame en micro-subpasos según targetPhysicsHz
      const subSteps = Math.max(1, Math.min(25, Math.round(targetPhysicsHz / targetRenderFps)));
      const subDt = dt / subSteps;
      for (let s = 0; s < subSteps; s++) {
        engine.updatePhysics(subDt);
      }

      // 2. Renderizado visual en Canvas 2D
      engine.render();

      // 3. Telemetría desacoplada: Render FPS y Phsics Hz medidos en tiempo real
      const metricsSample = tracker.recordTick(dt, subSteps);

      // Actualizar UI del HUD
      fpsDisplay.textContent = metricsSample.renderFps;
      if (physicsHzDisplay) {
        physicsHzDisplay.textContent = metricsSample.physicsHz >= 1000 ? '1.0 kHz' : `${metricsSample.physicsHz} Hz`;
      }
      dtDisplay.textContent = `${(dt * 1000).toFixed(1)} ms`;
      countDisplay.textContent = engine.getParticleCount();

      // Alertas visuales dinámicas de FPS mediante classList
      if (metricsSample.renderFps < 25) {
        fpsCard.classList.add('is-critical');
        fpsCard.classList.remove('is-warning');
      } else if (metricsSample.renderFps < 50) {
        fpsCard.classList.add('is-warning');
        fpsCard.classList.remove('is-critical');
      } else {
        fpsCard.classList.remove('is-warning', 'is-critical');
      }

      const metrics = tracker.getMetrics();
      if (metrics.memoryUsedMb) {
        memDisplay.textContent = `${metrics.memoryUsedMb} MB`;
      }

      // Re-encolar frame en el Event Loop
      animationFrameId = requestAnimationFrame(animationLoop);
    };

    /**
     * Control de Pausa / Reanudación
     * Limpieza explícita con cancelAnimationFrame para evitar listeners activos y fugas.
     */
    const toggleEngine = () => {
      isRunning = !isRunning;
      
      if (isRunning) {
        lastTimestamp = performance.now();
        animationFrameId = requestAnimationFrame(animationLoop);
        playIcon.innerHTML = SVG_PAUSE;
        playText.textContent = 'Pausar Motor';
        if (engineStatusText) engineStatusText.textContent = 'MOTOR EN EJECUCIÓN';
        engineBadge.classList.remove('is-paused');
        togglePlayBtn.classList.remove('btn-secondary');
        togglePlayBtn.classList.add('btn-primary');
        showToast('Motor de animación reanudado');
      } else {
        // [PASO 5]: Cancelación estricta de requestAnimationFrame
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        playIcon.innerHTML = SVG_PLAY;
        playText.textContent = 'Reanudar Motor';
        if (engineStatusText) engineStatusText.textContent = 'MOTOR EN PAUSA';
        engineBadge.classList.add('is-paused');
        togglePlayBtn.classList.remove('btn-primary');
        togglePlayBtn.classList.add('btn-secondary');
        showToast('Motor pausado (render loop detenido)');
      }
    };

    // Iniciar loop inmediatamente
    animationFrameId = requestAnimationFrame(animationLoop);

    /* ========================================================================
       SINCRONIZACIÓN Y VALIDACIÓN REACTIVA DE INPUTS DEL DOM 
       ======================================================================== */
    const bindSyncInput = ({
      slider,
      numberInput,
      display,
      min,
      max,
      errorEl,
      onChange
    }) => {
      // Función pura de validación
      const validate = (value) => {
        const num = parseFloat(value);
        if (isNaN(num)) return { valid: false, msg: 'Valor inválido' };
        if (num < min) return { valid: false, msg: `Mínimo permitido: ${min}` };
        if (num > max) return { valid: false, msg: `Máximo permitido: ${max}` };
        return { valid: true, value: num };
      };

      // Handler para Slider con Arrow Function preservando el ámbito léxico
      slider.addEventListener('input', (e) => {
        const val = e.target.value;
        numberInput.value = val;
        display.textContent = val;
        if (errorEl) {
          errorEl.textContent = '';
          errorEl.classList.remove('is-visible');
        }
        numberInput.classList.remove('has-error');
        onChange(parseFloat(val));
      });

      // Handler para Number Input con validación estricta en tiempo real
      numberInput.addEventListener('input', (e) => {
        const rawVal = e.target.value;
        const result = validate(rawVal);

        if (!result.valid) {
          numberInput.classList.add('has-error');
          if (errorEl) {
            errorEl.textContent = result.msg;
            errorEl.classList.add('is-visible');
          }
        } else {
          numberInput.classList.remove('has-error');
          if (errorEl) {
            errorEl.textContent = '';
            errorEl.classList.remove('is-visible');
          }
          slider.value = result.value;
          display.textContent = result.value;
          onChange(result.value);
        }
      });
    };

    // Vincular Controles con el Motor de Simulación
    bindSyncInput({
      slider: particleCountSlider,
      numberInput: particleCountNum,
      display: particleCountVal,
      min: 10,
      max: 400,
      errorEl: particleCountError,
      onChange: (val) => engine.setConfig({ particleCount: val })
    });

    bindSyncInput({
      slider: baseSpeedSlider,
      numberInput: baseSpeedNum,
      display: baseSpeedVal,
      min: 10,
      max: 300,
      onChange: (val) => engine.setConfig({ baseSpeed: val })
    });

    bindSyncInput({
      slider: radiusSlider,
      numberInput: radiusNum,
      display: radiusVal,
      min: 1,
      max: 12,
      onChange: (val) => engine.setConfig({ maxRadius: val })
    });

    bindSyncInput({
      slider: connDistSlider,
      numberInput: connDistNum,
      display: connDistVal,
      min: 0,
      max: 220,
      onChange: (val) => engine.setConfig({ connectionDistance: val })
    });

    // Control de Tasa de Render FPS (Canvas Throttling de 15 a 144 FPS)
    bindSyncInput({
      slider: renderFpsSlider,
      numberInput: renderFpsNum,
      display: renderFpsVal,
      min: 15,
      max: 144,
      onChange: (val) => {
        targetRenderFps = val;
        renderFpsVal.textContent = `${val} FPS`;
        updateRefreshSyncUI(targetPhysicsHz, targetRenderFps);
      }
    });

    // Control de Frecuencia de Física y Refresh Sync (hasta 1 kHz / 1000 Hz)
    bindSyncInput({
      slider: refreshRateSlider,
      numberInput: refreshRateNum,
      display: refreshRateVal,
      min: 15,
      max: 1000,
      onChange: (val) => {
        targetPhysicsHz = val;
        refreshRateVal.textContent = val >= 1000 ? '1.0 kHz' : `${val} Hz`;
        updateRefreshSyncUI(targetPhysicsHz, targetRenderFps);
      }
    });

    // Toggles Booleanos
    connectToggle.addEventListener('change', (e) => {
      engine.setConfig({ connectParticles: e.target.checked });
    });

    mouseRepelToggle.addEventListener('change', (e) => {
      engine.setConfig({ mouseRepel: e.target.checked });
    });

    gravityToggle.addEventListener('change', (e) => {
      engine.setConfig({ gravity: e.target.checked });
      showToast(e.target.checked ? 'Gravedad vertical activada' : 'Gravedad desactivada');
    });

    colorCycleToggle.addEventListener('change', (e) => {
      engine.setConfig({ colorCycle: e.target.checked });
    });

    // Botones de Acción
    togglePlayBtn.addEventListener('click', toggleEngine);

    resetBtn.addEventListener('click', () => {
      engine.resetParticles();
      tracker.reset();
      showToast('Simulación y partículas reiniciadas');
    });

    clearBtn.addEventListener('click', () => {
      engine.clearAll();
      particleCountSlider.value = 0;
      particleCountNum.value = 0;
      particleCountVal.textContent = '0';
      showToast('Lienzo vaciado por completo');
    });

    // Captura y exportación en formato PNG (Toque de calidad técnica)
    exportPngBtn.addEventListener('click', () => {
      const dataUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `uncp-canvas-particle-sim-${Date.now()}.png`;
      downloadLink.href = dataUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink); // Prevención de detached nodes
      showToast('Snapshot descargado en PNG');
    });

    profileBtn.addEventListener('click', () => {
      console.group('🔬 [DIAGNÓSTICO DE RENDIMIENTO - UNCP FIS]');
      console.time('Tiempo de iteración física y renderizado (1 frame)');
      
      engine.updatePhysics(0.016);
      engine.render();
      
      console.timeEnd('Tiempo de iteración física y renderizado (1 frame)');

      const metrics = tracker.getMetrics();
      console.log(' Métricas de Rendimiento Acumuladas:');
      console.table({
        'Render FPS (Visual)': metrics.renderFps,
        'Física (Tick Rate Hz)': metrics.physicsHz,
        'FPS Mínimo': metrics.minFps,
        'FPS Máximo': metrics.maxFps,
        'Frames Totales': metrics.totalFrames,
        'Partículas en Memoria': engine.getParticleCount(),
        'Memoria Heap JS': metrics.memoryUsedMb ? `${metrics.memoryUsedMb} MB` : 'Soporte V8 no disponible'
      });

      console.log('📌 Configuración activa del Closure:', engine.getConfig());
      console.log('🧹 Estado del Event Loop: requestAnimationFrame sincronizado activamente.');
      console.groupEnd();

      showToast('Reporte generado en DevTools Console (F12)');
    });

    // Alternador de Temas Claro / Oscuro mediante data-theme (DreamDesign)
    themeToggleBtn.addEventListener('click', () => {
      const htmlEl = document.documentElement;
      const currentTheme = htmlEl.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      htmlEl.setAttribute('data-theme', newTheme);
      const iconEl = themeToggleBtn.querySelector('.icon-theme');
      if (iconEl) {
        iconEl.outerHTML = newTheme === 'light' ? SVG_SUN : SVG_MOON;
      }
      showToast(`Tema cambiado a ${newTheme === 'dark' ? 'Oscuro' : 'Claro'}`);
    });

    /* ========================================================================
       INTERACCIÓN DEL PUNTERO (MOUSE Y TOUCH) CON DESACELERACIÓN SUAVE
       ======================================================================== */
    const updatePointerPos = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      engine.setPointer(x, y, true);
    };

    canvas.addEventListener('mousemove', (e) => {
      updatePointerPos(e.clientX, e.clientY);
    });

    canvas.addEventListener('mouseleave', () => {
      engine.setPointer(-9999, -9999, false);
    });

    // Soporte táctil móvil (Mobile-First)
    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        updatePointerPos(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      engine.setPointer(-9999, -9999, false);
    });

    // Atajos de teclado ergonómicos
    window.addEventListener('keydown', (e) => {
      // Ignorar si el usuario está escribiendo en un input
      if (e.target.tagName === 'INPUT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggleEngine();
      } else if (e.key === 'r' || e.key === 'R') {
        engine.resetParticles();
        showToast('Partículas reiniciadas con tecla R');
      } else if (e.key === 't' || e.key === 'T') {
        themeToggleBtn.click();
      }
    });

    // Reajuste del lienzo al redimensionar ventana
    let resizeDebounce = null;
    window.addEventListener('resize', () => {
      if (resizeDebounce) clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(() => {
        engine.resize();
      }, 100);
    });

    // Notificación de inicio exitoso
    console.info('🚀 UNCP Práctica 04: Motor de partículas y closures inicializado con éxito.');
  };

  // Inicializar al cargar el script diferido (defer)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
