const canvas = document.getElementById('scorpionCanvas');
const ctx = canvas.getContext('2d');

// --- Configuración ---
const config = {
    numSpinePoints: 80,
    segmentLength: 4.0,
    maxSpeed: 5.5,
    physicsIterations: 5,
    // --- Nuevas configuraciones centralizadas ---
    head: {
        size: 5.5,
        widthFactor: 6.0,
        lengthFactor: 3.0,
        // --- Configuración de los ojos ---
        eyes: {
            offsetY: 1.2,       // Distancia del centro a los lados
            offsetX: 1.8,       // Distancia del centro hacia adelante
            size: 1.5,          // Tamaño de los ojos
            glowDistance: 120,  // Distancia a la que el cursor activa el brillo
            glowLerpFactor: 0.08 // Velocidad con la que aparece/desaparece el brillo
        }
    },
    legs: {
        indices: [2, 5, 8, 11],
        naturalLength: 50,
        angle: 1.3,
        segment1: 25, 
        segment2: 25, 
        segment3: 20, 
        stepThreshold: 35, // Pasos más largos y deliberados
        stepDuration: 18,  // Pasos más rápidos y firmes
        stepLift: 15,
        stepPredictionFrames: 12,      // Cuántos frames hacia el futuro predecir el paso.
        maxPredictionDistance: 50, // Límite a la distancia de predicción para evitar pasos erráticos.
    },
    movement: {
        walkSpeed: 1.2, // Ligeramente más lento para que coincida con los pasos
        grabRadius: 20, 
        spineDrag: 0.9, 
        slowdownRadius: 60, 
        turnSway: 0.2, 
    },
    strike: {
        duration: 25,
        angleOffset: -1.5,
    },
    tail: {
        stingerLength: 22,
        idleWiggleSpeed: 0.05,
        idleWiggleAmount: 0.15,
        curl: 5.0, // Factor de altura de la curva de la cola (AUMENTADO)
        curlStartSegment: 15, // Segmento donde empieza a curvarse (REDUCIDO)
        // --- Nuevos parámetros para movimiento orgánico ---
        speedCurlFactor: 1.5, // Cuánto se estira la cola al moverse rápido
        wagAmount: 1.2,       // Amplitud del balanceo lateral de la cola al moverse
        wagSpeed: 0.2,        // Velocidad del balanceo lateral
        undulationAmount: 2.0, // Amplitud de la ondulación del cuerpo
        undulationSpeed: 0.2,  // Velocidad de la ondulación del cuerpo
        whipAmount: 2.0,       // Amplitud del "latigazo" vertical de la cola al moverse
    },
    // --- NUEVA CONFIGURACIÓN PARA SEGMENTACIÓN DEL CUERPO ---
    body: {
        thoraxEndIndex: 14, // Índice del segmento de la espina dorsal donde termina el tórax
    },
    pincers: {
        openAngle: 0.6,     // Ángulo de apertura de la pinza
        closedAngle: 0.05,  // Ángulo de cierre
        lengthA: 25,        // Longitud del primer segmento del brazo (hombro a codo)
        lengthB: 25,        // Longitud del segundo segmento del brazo (codo a mano)
        lengthFinger: 34,   // Longitud de los dedos
        armWidth: 12,       // Grosor del brazo
        handWidth: 20,      // "Mano" mucho más ancha y bulbosa
        snapDistance: 80,   // Distancia a la que reaccionan al cursor
        snapLerpFactor: 0.1, // Velocidad con la que se cierran/abren
    },
    // --- Configuración de partículas ---
    particles: {
        count: 40,          // Más partículas para un rocío más denso
        minLife: 25,
        maxLife: 50,
        minSpeed: 3,
        maxSpeed: 7,
        sprayAngle: 0.8,    // Ángulo del cono del rocío (en radianes)
        drag: 0.96,         // Resistencia del aire para que se frene
    },
    // --- Configuración de color dinámico ---
    color: {
        initialHue: 200,    
        saturation: 90,     
        lightness: 80,      
        glowLightness: 50,  
        hueChangeSpeed: 0.1, 
        glowBlur: 12,       // Brillo base
        glowPulseSpeed: 0.08, // Velocidad del pulso de brillo
        glowPulseAmount: 4,   // Amplitud del pulso (en píxeles de blur)
        postStrikeGlowBoost: 15, // Aumento de brillo extra tras atacar
        postStrikeGlowDecay: 0.95 // Velocidad a la que se desvanece el brillo extra
    }
    ,
    // --- Nueva configuración para el destello de las pinzas ---
    pincerFlash: {
        count: 5,
        minLife: 10, maxLife: 20, minSpeed: 1, maxSpeed: 2.5,
        sprayAngle: Math.PI * 2, drag: 0.94
    }
    ,
    // --- Nueva configuración para el polvo de las patas ---
    dust: {
        count: 4,           // Pocas partículas para un efecto sutil
        minLife: 15,
        maxLife: 30,
        minSpeed: 0.5,
        maxSpeed: 1.2,
        sprayAngle: Math.PI, // Amplio ángulo de dispersión hacia arriba
        drag: 0.92,          // Se frenan rápidamente
    }
};

// --- Estado de la Animación (agrupado) ---
const dpr = window.devicePixelRatio || 1;
let animationFrame = 0;

const state = {
    mouse: { x: 0, y: 0 },
    targetPos: { x: 0, y: 0 },
    spinePoints: [],
    headSpeed: 0,
    legs: [],
    isStriking: false,
    strikeProgress: 0,
    strikeTarget: { x: 0, y: 0 },
    headVelocity: { x: 0, y: 0 }, // Guardar la velocidad de la cabeza para la predicción de las patas
    headAngularVelocity: 0, // Guardar la velocidad de giro para la predicción
    headAngle: 0, // Ángulo de la cabeza, actualizado cada frame
    lastHeadAngle: 0, 
    currentHue: 0, 
    particles: [],
    isGrabbed: false,
    grabbedPointIndex: -1,
    postStrikeGlow: 0, // Intensidad actual del brillo post-ataque
    eyeGlow: 0, // Intensidad del brillo de los ojos (0 a 1)
};
state.lastPincerAngle = config.pincers.openAngle;
state.pincerAngle = config.pincers.openAngle; // Estado inicial de las pinzas

function initAnimationState() {
    // Esta función será reemplazada por el constructor de la clase Scorpion
}

// =====================================================================
// ===               REFACTORIZACIÓN A CLASES (NUEVO)                ===
// =====================================================================

class Particle {
    constructor(x, y, angle, config, hue) {
        const speed = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
        const sprayAngle = angle + (Math.random() - 0.5) * config.sprayAngle;
        
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;
        this.vx = Math.cos(sprayAngle) * speed;
        this.vy = Math.sin(sprayAngle) * speed;
        this.life = config.minLife + Math.random() * (config.maxLife - config.minLife);
        this.maxLife = config.maxLife;
        this.size = 1 + Math.random() * 2.5;
        this.drag = config.drag;
        this.hue = (hue + 180) % 360;
        this.saturation = config.saturation;
        this.lightness = config.glowLightness;
    }

    update() {
        this.prevX = this.x;
        this.prevY = this.y;
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.08; // Gravedad
        this.vx *= this.drag;
        this.vy *= this.drag;
        this.life--;
        return this.life > 0;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.beginPath();
        ctx.moveTo(this.prevX, this.prevY);
        ctx.lineTo(this.x, this.y);
        ctx.lineWidth = this.size * alpha;
        ctx.strokeStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${alpha * 0.9})`;
        ctx.stroke();
    }
}

class Leg {
    constructor(spineIndex, side, gaitGroup, initialBodyPoint, initialBodyAngle, config) {
        this.spineIndex = spineIndex;
        this.side = side;
        this.gaitGroup = gaitGroup;
        this.config = config;

        const naturalPos = this._getNaturalRestingPos(initialBodyPoint, initialBodyAngle, 1.0);
        this.footPos = { x: naturalPos.x, y: naturalPos.y };
        
        this.isStepping = false;
        this.stepProgress = 0;
        this.stepStartPos = { x: 0, y: 0 };
        this.stepTargetPos = { x: 0, y: 0 };
        this.currentStepDuration = this.config.stepDuration;
    }

    _getNaturalRestingPos(bodyPoint, bodyAngle, scale) {
        const angle = bodyAngle + this.side * this.config.angle;
        const len = this.config.naturalLength * scale;
        return {
            x: bodyPoint.x + len * Math.cos(angle),
            y: bodyPoint.y + len * Math.sin(angle),
        };
    }

    update(bodyPoint, bodyAngle, headVelocity, headAngularVelocity, headSpeed, canStep, isGrabbed, onStepCallback) {
        const naturalPos = this._getNaturalRestingPos(bodyPoint, bodyAngle, 1.0);
        const distFromNatural = Math.hypot(this.footPos.x - naturalPos.x, this.footPos.y - naturalPos.y);

        if (this.isStepping) {
            this.stepProgress++;
            let t = this.stepProgress / this.currentStepDuration;

            // Justo antes de que la pata aterrice (t > 0.9), crea el polvo
            if (t > 0.9 && !this.dustCreated) {
                onStepCallback(this.stepTargetPos.x, this.stepTargetPos.y);
                this.dustCreated = true;
            }

            t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // Ease in-out

            this.footPos.x = this.stepStartPos.x + (this.stepTargetPos.x - this.stepStartPos.x) * t;
            this.footPos.y = this.stepStartPos.y + (this.stepTargetPos.y - this.stepStartPos.y) * t;

            if (this.stepProgress >= this.currentStepDuration) {                        
                this.isStepping = false;
            }
        } else {
            if (distFromNatural > this.config.stepThreshold && canStep && !isGrabbed && headSpeed > 0.2) {
                this.isStepping = true;
                this.stepProgress = 0;
                Object.assign(this.stepStartPos, this.footPos);
                this.currentStepDuration = this.config.stepDuration;
                this.dustCreated = false; // Resetea para el próximo paso

                // --- LÓGICA DE PREDICCIÓN DE PASO ---
                const predictionFrames = this.config.stepPredictionFrames;
                let predictedBodyX = bodyPoint.x + headVelocity.x * predictionFrames;
                let predictedBodyY = bodyPoint.y + headVelocity.y * predictionFrames;

                const predictionDist = Math.hypot(predictedBodyX - bodyPoint.x, predictedBodyY - bodyPoint.y);
                if (predictionDist > this.config.maxPredictionDistance) {
                    const ratio = this.config.maxPredictionDistance / predictionDist;
                    predictedBodyX = bodyPoint.x + (predictedBodyX - bodyPoint.x) * ratio;
                    predictedBodyY = bodyPoint.y + (predictedBodyY - bodyPoint.y) * ratio;
                }

                const predictedBodyAngle = bodyAngle + headAngularVelocity * predictionFrames;
                this.stepTargetPos = this._getNaturalRestingPos({ x: predictedBodyX, y: predictedBodyY }, predictedBodyAngle, 1.0);
            }
        }
    }

    draw(ctx, bodyPoint, hue, colorConfig) {
        ctx.save();
        ctx.lineWidth = 0.9;
        
        const startX = bodyPoint.x;
        const startY = bodyPoint.y;
        let footX = this.footPos.x;
        let footY = this.footPos.y;

        let lift = 0;
        if (this.isStepping) {
            lift = Math.sin(this.stepProgress / this.currentStepDuration * Math.PI) * this.config.stepLift;
        }

        if (lift > 0.1) {
            ctx.beginPath();
            ctx.arc(footX, footY, 1.5, 0, Math.PI * 2); 
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fill();
        }
        footY -= lift;

        const seg1_len = this.config.segment1; 
        const seg2_len = this.config.segment2 + this.config.segment3;
        const dist = Math.hypot(startX - footX, startY - footY);
        const maxReach = seg1_len + seg2_len - 1;
        let jointX, jointY;

        if (dist >= maxReach) {
            const angle = Math.atan2(footY - startY, footX - startX);
            jointX = startX + seg1_len * Math.cos(angle);
            jointY = startY + seg1_len * Math.sin(angle);
        } else {
            const angle_at_body = Math.acos((seg1_len**2 + dist**2 - seg2_len**2) / (2 * seg1_len * dist));
            const angle_body_to_foot = Math.atan2(footY - startY, footX - startX);
            const jointAngle = angle_body_to_foot + (angle_at_body * this.side);
            jointX = startX + seg1_len * Math.cos(jointAngle);
            jointY = startY + seg1_len * Math.sin(jointAngle);
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(jointX, jointY); 

        const leg_seg2_angle = Math.atan2(footY - jointY, footX - jointX);
        const leg_seg2_len = this.config.segment2;
        const joint2X = jointX + leg_seg2_len * Math.cos(leg_seg2_angle);
        const joint2Y = jointY + leg_seg2_len * Math.sin(leg_seg2_angle);
        
        ctx.lineTo(joint2X, joint2Y); 
        ctx.lineTo(footX, footY); 
        ctx.stroke();
        
        // Dibujar los nodos iluminados en las articulaciones
        ctx.save();
        const glowColor = `hsl(${hue}, ${colorConfig.saturation}%, ${colorConfig.glowLightness}%)`;
        ctx.fillStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 5;

        // Articulación del cuerpo
        ctx.beginPath();
        ctx.arc(startX, startY, 1.8, 0, Math.PI * 2);
        ctx.fill();
        // Articulación de la "rodilla"
        ctx.beginPath();
        ctx.arc(jointX, jointY, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Articulación del "tobillo"
        ctx.beginPath();
        ctx.arc(joint2X, joint2Y, 1.0, 0, Math.PI * 2); 
        ctx.fill();
        ctx.restore();
    }
}

class Scorpion {
    constructor(canvas, ctx, config) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.config = config;
        this.dpr = window.devicePixelRatio || 1;
        this.animationFrame = 0;
        this.init();
    }

    init() {
        const width = this.canvas.width / this.dpr;
        const height = this.canvas.height / this.dpr;

        this.mouse = { x: width / 2, y: height / 2 };
        this.targetPos = { x: width / 2, y: height / 2 };
        
        this.spinePoints = [];
        const headPos = { x: width / 2, y: height / 2 };
        for (let i = 0; i < this.config.numSpinePoints; i++) {
            this.spinePoints.push({ x: headPos.x - i * this.config.segmentLength, y: headPos.y });
        }

        this.headSpeed = 0;
        this.headVelocity = { x: 0, y: 0 };
        this.headAngularVelocity = 0;
        this.headAngle = 0;
        this.lastHeadAngle = 0;

        this.isStriking = false;
        this.strikeProgress = 0;
        this.strikeTarget = { x: 0, y: 0 };

        this.isGrabbed = false;
        this.grabbedPointIndex = -1;

        this.currentHue = this.config.color.initialHue;
        this.postStrikeGlow = 0;
        this.eyeGlow = 0;
        this.pincerAngle = this.config.pincers.openAngle;
        this.lastPincerAngle = this.config.pincers.openAngle;
        this.pincerJoints = {}; // Para la nueva física de pinzas

        // --- Estados para la descomposición ---
        this.isDeconstructed = false;
        this.isDeconstructing = false;
        this.isReconstructing = false;
        this.deconstructionProgress = 0;
        this.deconstructedParts = [];

        this.particles = [];
        this._initLegs();
        this._updatePincerPhysics(); // Asegura que las pinzas tengan una posición inicial
    }

    _initLegs() {
        this.legs = [];
        let legCounter = 0;
        this.config.legs.indices.forEach((spineIndex) => {
            for (let side = -1; side <= 1; side += 2) {
                const bodyPoint = this.spinePoints[spineIndex];
                let bodyAngle = 0;
                if (this.spinePoints.length > spineIndex + 1) {
                    bodyAngle = Math.atan2(this.spinePoints[spineIndex+1].y - bodyPoint.y, this.spinePoints[spineIndex+1].x - bodyPoint.x);
                }
                
                this.legs.push(new Leg(spineIndex, side, legCounter % 2, bodyPoint, bodyAngle, this.config.legs));
                legCounter++;
            }
        });
    }

    // --- Métodos de control de eventos ---
    updateMouse(x, y) {
        this.mouse.x = x;
        this.mouse.y = y;
    }

    startStrike() {
        if (!this.isStriking && !this.isGrabbed) {
            this.isStriking = true;
            this.strikeProgress = 0;
            this.strikeTarget.x = this.mouse.x;
            this.strikeTarget.y = this.mouse.y;
        }
    }

    startGrab() {
        if (this.isGrabbed) return;
        for (let i = 0; i < this.spinePoints.length; i++) {
            const p = this.spinePoints[i];
            const dist = Math.hypot(this.mouse.x - p.x, this.mouse.y - p.y);
            if (dist < this.config.movement.grabRadius) {
                this.isGrabbed = true;
                this.grabbedPointIndex = i;
                this.canvas.style.cursor = 'grabbing';
                break;
            }
        }
    }

    endGrab() {
        if (this.isGrabbed) {
            this.isGrabbed = false;
            this.grabbedPointIndex = -1;
            this.canvas.style.cursor = 'pointer';
        }
    }

    toggleDeconstruction() {
        if (this.isDeconstructing || this.isReconstructing) return;

        if (this.isDeconstructed) {
            this.isReconstructing = true;
            this.deconstructionProgress = 0;
        } else {
            this.isDeconstructing = true;
            this.deconstructionProgress = 0;
            this._captureDeconstructionState();
        }
    }

    _captureDeconstructionState() {
        this.deconstructedParts = [];
        const center = { x: this.canvas.width / (2 * this.dpr), y: this.canvas.height / (2 * this.dpr) };

        // Capturar segmentos del cuerpo
        this.spinePoints.forEach((p, i) => {
            const angle = Math.random() * Math.PI * 2;
            const dist = 150 + Math.random() * 150;
            this.deconstructedParts.push({
                type: 'spine',
                index: i,
                homePos: { ...p },
                targetPos: { x: center.x + dist * Math.cos(angle), y: center.y + dist * Math.sin(angle) }
            });
        });

        // Capturar patas
        this.legs.forEach((leg, i) => {
            const angle = Math.random() * Math.PI * 2;
            const dist = 200 + Math.random() * 200;
            this.deconstructedParts.push({
                type: 'leg',
                index: i,
                homeBodyPoint: { ...this.spinePoints[leg.spineIndex] },
                homeFootPos: { ...leg.footPos },
                targetPos: { x: center.x + dist * Math.cos(angle), y: center.y + dist * Math.sin(angle) }
            });
        });

        // Capturar pinzas
        Object.keys(this.pincerJoints).forEach(sideKey => {
            const joints = this.pincerJoints[sideKey];
            const angle = Math.random() * Math.PI * 2;
            const dist = 180 + Math.random() * 180;
            this.deconstructedParts.push({
                type: 'pincer',
                sideKey: sideKey,
                homeAnchor: { ...this.spinePoints[1] },
                homeJoints: JSON.parse(JSON.stringify(joints)), // CORRECCIÓN: Asegurar una copia profunda correcta
                targetPos: { x: center.x + dist * Math.cos(angle), y: center.y + dist * Math.sin(angle) }
            });
        });
    }

    // --- Lógica de actualización principal ---
    update() {
        this.animationFrame++;
        this.currentHue = (this.currentHue + this.config.color.hueChangeSpeed) % 360;

        if (this.postStrikeGlow > 0.1) {
            this.postStrikeGlow *= this.config.color.postStrikeGlowDecay;
        }

        if (this.isDeconstructing || this.isReconstructing) {
            this._updateDeconstruction();
            return; // Pausar la física normal durante la animación
        }

        this._updateMovement();
        this._updateSpinePhysics();
        this._updateStrike();
        this._updateParticles();
        this._updateLegs();
        this._updatePincerPhysics(); // Nueva llamada
        this._updatePincers();
        this._updateEyes();
    }

    _updateDeconstruction() {
        const duration = 120; // frames
        this.deconstructionProgress += 1 / duration;

        if (this.deconstructionProgress >= 1) {
            this.deconstructionProgress = 1;
            if (this.isDeconstructing) {
                this.isDeconstructing = false;
                this.isDeconstructed = true;
            }
            if (this.isReconstructing) {
                this.isReconstructing = false;
                this.isDeconstructed = false;
                this.deconstructedParts = []; // Limpiar estado
            }
        }
    }

    _updateMovement() {
        const head = this.spinePoints[0];
        const oldHeadX = head.x;
        const oldHeadY = head.y;

        if (this.isGrabbed && this.grabbedPointIndex !== -1) {
            const grabbedPoint = this.spinePoints[this.grabbedPointIndex];
            grabbedPoint.x = this.mouse.x;
            grabbedPoint.y = this.mouse.y; 
        } else {
            this.targetPos.x = this.mouse.x;
            this.targetPos.y = this.mouse.y;

            const distToTarget = Math.hypot(this.targetPos.x - head.x, this.targetPos.y - head.y);

            if (distToTarget > 2) {
                let currentSpeed = this.config.movement.walkSpeed;
                const angleToTarget = Math.atan2(this.targetPos.y - head.y, this.targetPos.x - head.x);
                let moveX = currentSpeed * Math.cos(angleToTarget);
                let moveY = currentSpeed * Math.sin(angleToTarget);

                if (distToTarget < this.config.movement.slowdownRadius) {
                    moveX *= (distToTarget / this.config.movement.slowdownRadius);
                    moveY *= (distToTarget / this.config.movement.slowdownRadius);
                }

                const moveDist = Math.hypot(moveX, moveY);
                if (moveDist > this.config.maxSpeed) {
                    const ratio = this.config.maxSpeed / moveDist;
                    moveX *= ratio;
                    moveY *= ratio;
                }

                head.x += moveX;
                head.y += moveY;
            }
        }

        this.headVelocity = { x: head.x - oldHeadX, y: head.y - oldHeadY };
        this.headSpeed = Math.hypot(this.headVelocity.x, this.headVelocity.y);

        if (this.headSpeed > 0.1) {
            this.headAngle = Math.atan2(this.headVelocity.y, this.headVelocity.x);
        }

        const angleDifference = (this.headAngle - this.lastHeadAngle + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        this.headAngularVelocity = angleDifference;
        this.lastHeadAngle = this.headAngle;
    }

    _updateSpinePhysics() {
        // Primero, aplicamos el movimiento secundario (balanceo, ondulación)
        for (let i = 1; i < this.spinePoints.length; i++) {
            const currentPoint = this.spinePoints[i];
            const t = i / this.spinePoints.length;
            
            const sway = Math.sin(t * Math.PI) * this.headAngularVelocity * this.config.movement.turnSway * i;
            const idleWiggle = this.headSpeed < 0.2 ? Math.sin(this.animationFrame * this.config.tail.idleWiggleSpeed + i * 0.3) * this.config.tail.idleWiggleAmount * (1 - t) : 0;
            const wiggleAngle = this.headAngle + Math.PI / 2;

            currentPoint.x += Math.cos(wiggleAngle) * (sway + idleWiggle);
            currentPoint.y += Math.sin(wiggleAngle) * (sway + idleWiggle);

            const wagPhase = this.animationFrame * this.config.tail.wagSpeed + i * 0.1;
            const wagAmplitude = Math.min(this.headSpeed, 1.5) * this.config.tail.wagAmount * Math.sin(t * Math.PI);
            currentPoint.x += Math.cos(wiggleAngle) * Math.sin(wagPhase) * wagAmplitude;
            currentPoint.y += Math.sin(wiggleAngle) * Math.sin(wagPhase) * wagAmplitude;

            const undulationPhase = this.animationFrame * this.config.tail.undulationSpeed - i * 0.1;
            const undulationAmplitude = Math.min(this.headSpeed, 1.5) * this.config.tail.undulationAmount * Math.sin(t * Math.PI);
            currentPoint.y += Math.sin(undulationPhase) * undulationAmplitude;
        }

        // Luego, ejecutamos el bucle de física para mantener la estructura
        for (let j = 0; j < this.config.physicsIterations; j++) {
            if (this.isGrabbed && this.grabbedPointIndex !== -1) {
                this.spinePoints[this.grabbedPointIndex].x = this.mouse.x;
                this.spinePoints[this.grabbedPointIndex].y = this.mouse.y;
            }

            // 1. Forzamos a la cola a curvarse sobre el cuerpo hacia un objetivo
            const head = this.spinePoints[0];
            // El objetivo está por encima y ligeramente por delante de la cabeza
            const targetX = head.x + Math.cos(this.headAngle) * 25; // Un poco menos hacia adelante
            const targetY = head.y + Math.sin(this.headAngle) * 25 - 80; // Más elevado para dar margen

            for (let i = this.config.tail.curlStartSegment; i < this.spinePoints.length; i++) {
                const point = this.spinePoints[i];
                const progress = (i - this.config.tail.curlStartSegment) / (this.spinePoints.length - this.config.tail.curlStartSegment);
                const pullFactor = 0.05 * Math.pow(progress, 2); // La fuerza es mayor al final de la cola
                
                point.x += (targetX - point.x) * pullFactor;
                point.y += (targetY - point.y) * pullFactor;
            }

            // 2. Propagamos la posición desde la cabeza hacia la cola para mantener la distancia (restricción de cuerda)
            for (let i = 1; i < this.spinePoints.length; i++) {
                const currentPoint = this.spinePoints[i];
                const prevPoint = this.spinePoints[i-1];
                
                const dx = currentPoint.x - prevPoint.x;
                const dy = currentPoint.y - prevPoint.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    const diff = (dist - this.config.segmentLength) / dist;
                    // Solo movemos el punto actual, no el anterior (prevPoint).
                    // Esto evita que la cola "tire" de la cabeza hacia atrás.
                    currentPoint.x -= dx * diff;
                    currentPoint.y -= dy * diff;
                }
            }
        }
    }

    _updateLegs() {
        let steppingLegsInGroup = { 0: 0, 1: 0 };
        this.legs.forEach(leg => {
            if (leg.isStepping) steppingLegsInGroup[leg.gaitGroup]++;
        });

        this.legs.forEach((leg) => {
            const bodyPoint = this.spinePoints[leg.spineIndex];
            const bodyAngle = Math.atan2(this.spinePoints[leg.spineIndex + 1].y - bodyPoint.y, this.spinePoints[leg.spineIndex + 1].x - bodyPoint.x);
            const canStep = steppingLegsInGroup[leg.gaitGroup] === 0;                    
            leg.update(bodyPoint, bodyAngle, this.headVelocity, this.headAngularVelocity, this.headSpeed, canStep, this.isGrabbed, this._createDustPuff.bind(this));
        });
    }

    _updateStrike() {
        if (this.isStriking) {
            if (this.strikeProgress === Math.floor(this.config.strike.duration / 2)) {
                const tailSegmentIndex = this.spinePoints.length - 2;
                const p1 = this.spinePoints[tailSegmentIndex];
                const p2 = this.spinePoints[tailSegmentIndex + 1];
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                
                const strikePhase = this.strikeProgress / this.config.strike.duration;
                const strikeAngleOffset = Math.sin(strikePhase * Math.PI) * this.config.strike.angleOffset;
                const finalStrikeAngle = angle + strikeAngleOffset;
                const endX = p2.x + this.config.tail.stingerLength * Math.cos(finalStrikeAngle);
                const endY = p2.y + this.config.tail.stingerLength * Math.sin(finalStrikeAngle);
                
                this._createParticleExplosion(endX, endY, finalStrikeAngle);
            }

            this.strikeProgress++;
            if (this.strikeProgress >= this.config.strike.duration) {
                this.isStriking = false;
                this.strikeProgress = 0;
                this.postStrikeGlow = this.config.color.postStrikeGlowBoost;
            }
        }
    }

    _createParticleExplosion(x, y, angle) {
        for (let i = 0; i < this.config.particles.count; i++) {
            this.particles.push(new Particle(x, y, angle, this.config.particles, this.currentHue));
        }
    }

    _createDustPuff(x, y) {
        const config = this.config.dust;
        for (let i = 0; i < config.count; i++) {
            // El ángulo base es hacia arriba (-PI/2)
            const angle = -Math.PI / 2;
            this.particles.push(new Particle(x, y, angle, config, this.currentHue));
        }
    }

    _updateParticles() {
        this.particles = this.particles.filter(p => p.update());
    }

    _updateEyes() {
        const head = this.spinePoints[0];
        const distToMouse = Math.hypot(this.mouse.x - head.x, this.mouse.y - head.y);
        let targetGlow = (distToMouse < this.config.head.eyes.glowDistance && !this.isGrabbed) ? 1 : 0;
        this.eyeGlow += (targetGlow - this.eyeGlow) * this.config.head.eyes.glowLerpFactor;
    }

    _updatePincers() {
        const head = this.spinePoints[0];
        const distToMouse = Math.hypot(this.mouse.x - head.x, this.mouse.y - head.y);
        const isClosing = (distToMouse < this.config.pincers.snapDistance && !this.isGrabbed);
        let targetAngle = isClosing ? this.config.pincers.closedAngle : this.config.pincers.openAngle;

        // Detectar si las pinzas se acaban de cerrar para crear un destello
        if (isClosing && this.pincerAngle > (this.config.pincers.closedAngle + 0.1)) {
            if (this.lastPincerAngle > this.pincerAngle) { // Si se está moviendo para cerrar
                this._createPincerFlash();
            }
        }

        this.pincerAngle += (targetAngle - this.pincerAngle) * this.config.pincers.snapLerpFactor;
        this.lastPincerAngle = this.pincerAngle;
    }

    _updatePincerPhysics() {
        const lerpFactor = 0.2; // Controla la suavidad/retraso del brazo

        for (let side = -1; side <= 1; side += 2) {
            const sideKey = side === -1 ? 'left' : 'right';
            if (!this.pincerJoints[sideKey]) {
                this.pincerJoints[sideKey] = { elbow: {x: 0, y: 0}, hand: {x: 0, y: 0} };
            }

            const anchorPoint = this.spinePoints[1];

            // Calcular posiciones objetivo
            const targetAngleA = this.headAngle + side * 1.2;
            const targetElbowX = anchorPoint.x + this.config.pincers.lengthA * Math.cos(targetAngleA);
            const targetElbowY = anchorPoint.y + this.config.pincers.lengthA * Math.sin(targetAngleA);

            const targetAngleB = this.headAngle + side * 0.5;
            const targetHandX = targetElbowX + this.config.pincers.lengthB * Math.cos(targetAngleB);
            const targetHandY = targetElbowY + this.config.pincers.lengthB * Math.sin(targetAngleB);

            // Interpolar suavemente hacia el objetivo
            this.pincerJoints[sideKey].elbow.x += (targetElbowX - this.pincerJoints[sideKey].elbow.x) * lerpFactor;
            this.pincerJoints[sideKey].elbow.y += (targetElbowY - this.pincerJoints[sideKey].elbow.y) * lerpFactor;
            this.pincerJoints[sideKey].hand.x += (targetHandX - this.pincerJoints[sideKey].hand.x) * lerpFactor;
            this.pincerJoints[sideKey].hand.y += (targetHandY - this.pincerJoints[sideKey].hand.y) * lerpFactor;
        }
    }

    _createPincerFlash() {
        for (let side = -1; side <= 1; side += 2) {
            const sideKey = side === -1 ? 'left' : 'right';
            const joints = this.pincerJoints[sideKey];
            if (!joints) continue;

            const handX = joints.hand.x;
            const handY = joints.hand.y;
            const config = this.config.pincerFlash;
            for (let i = 0; i < config.count; i++) {
                this.particles.push(new Particle(handX, handY, Math.random() * Math.PI * 2, config, this.currentHue));
            }
        }
    }

    // --- Métodos de Dibujo ---
    draw() {
        const width = this.canvas.width / this.dpr;
        const height = this.canvas.height / this.dpr;
        this.ctx.clearRect(0, 0, width, height);

        if (this.isDeconstructed || this.isDeconstructing || this.isReconstructing) {
            this._drawDeconstructed();
        } else {
            this._drawScorpion();
        }

        this._drawParticles();
    }

    _drawDeconstructed() {
        let t = this.deconstructionProgress;
        t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // Ease in-out

        const bodyColor = `hsl(${this.currentHue}, ${this.config.color.saturation}%, ${this.config.color.lightness}%)`;
        const glowColor = `hsl(${this.currentHue}, ${this.config.color.saturation}%, ${this.config.color.glowLightness}%)`;
        this.ctx.strokeStyle = bodyColor;
        this.ctx.shadowColor = glowColor;
        this.ctx.shadowBlur = this.config.color.glowBlur;

        this.deconstructedParts.filter(p => p.type === 'leg').forEach(p => {
            const leg = this.legs[p.index];
            const fromBody = this.isReconstructing ? p.targetPos : p.homeBodyPoint;
            const toBody = this.isReconstructing ? p.homeBodyPoint : p.targetPos;
            const bodyPoint = {
                x: fromBody.x + (toBody.x - fromBody.x) * t,
                y: fromBody.y + (toBody.y - fromBody.y) * t
            };
            leg.footPos = p.homeFootPos; // Mantener el pie en su sitio para el dibujo
            leg.draw(this.ctx, bodyPoint, this.currentHue, this.config.color);
        });

        // Dibujar pinzas desarmadas
        this.deconstructedParts.filter(p => p.type === 'pincer').forEach(p => {
            const fromAnchor = this.isReconstructing ? p.targetPos : p.homeAnchor;
            const toAnchor = this.isReconstructing ? p.homeAnchor : p.targetPos;
            const anchor = {
                x: fromAnchor.x + (toAnchor.x - fromAnchor.x) * t,
                y: fromAnchor.y + (toAnchor.y - fromAnchor.y) * t
            };

            // Mantenemos la forma de la pinza relativa a su ancla en movimiento
            const offsetXElbow = p.homeJoints.elbow.x - p.homeAnchor.x;
            const offsetYElbow = p.homeJoints.elbow.y - p.homeAnchor.y;
            const offsetXHand = p.homeJoints.hand.x - p.homeAnchor.x;
            const offsetYHand = p.homeJoints.hand.y - p.homeAnchor.y;

            const tempJoints = {
                [p.sideKey]: {
                    elbow: { x: anchor.x + offsetXElbow, y: anchor.y + offsetYElbow },
                    hand: { x: anchor.x + offsetXHand, y: anchor.y + offsetYHand }
                }
            };

            // Usamos una versión modificada de _drawPincers
            this._drawPincers(0, 0, 0, anchor, tempJoints);
        });

        // Dibujar cuerpo y cola desarmados
        const tempSpinePoints = this.deconstructedParts
            .filter(p => p.type === 'spine')
            .sort((a, b) => a.index - b.index) // Asegurar el orden
            .map(p => {
                const from = this.isReconstructing ? p.targetPos : p.homePos;
                const to = this.isReconstructing ? p.homePos : p.targetPos;
                return {
                    x: from.x + (to.x - from.x) * t,
                    y: from.y + (to.y - from.y) * t
                };
            });

        this.ctx.fillStyle = '#000';
        const bodyEndIndex = tempSpinePoints.length - 2;
        for (let i = bodyEndIndex; i > 1; i--) {
            // Reutilizamos la lógica de _drawScorpion para las placas del cuerpo
            const p1 = tempSpinePoints[i];
            const p2 = tempSpinePoints[i - 1];
            const time = i / tempSpinePoints.length;
            const width1 = Math.max(1.5, (3.0 - Math.pow(time, 0.6) * 4.0) * 4.5);
            const width2 = Math.max(1.5, (3.0 - Math.pow((i - 1) / tempSpinePoints.length, 0.6) * 4.0) * 4.5);
            if (width1 < 0.5) continue;
            const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
            const angle2 = Math.atan2(p1.y - tempSpinePoints[i-2].y, p1.x - tempSpinePoints[i-2].x) + Math.PI / 2;
            const p1_left = { x: p1.x + width1 * Math.cos(angle1), y: p1.y + width1 * Math.sin(angle1) };
            const p1_right = { x: p1.x - width1 * Math.cos(angle1), y: p1.y - width1 * Math.sin(angle1) };
            const p2_left = { x: p2.x + width2 * Math.cos(angle2), y: p2.y + width2 * Math.sin(angle2) };
            const p2_right = { x: p2.x - width2 * Math.cos(angle2), y: p2.y - width2 * Math.sin(angle2) };
            this.ctx.beginPath();
            this.ctx.moveTo(p1_left.x, p1_left.y); this.ctx.lineTo(p2_left.x, p2_left.y);
            this.ctx.lineTo(p2_right.x, p2_right.y); this.ctx.lineTo(p1_right.x, p1_right.y);
            this.ctx.closePath();
            this.ctx.fill(); this.ctx.stroke();
        }

        const tailTip = tempSpinePoints[tempSpinePoints.length - 1];
        const preTip = tempSpinePoints[tempSpinePoints.length - 2];
        this._drawStinger(tailTip.x, tailTip.y, Math.atan2(tailTip.y - preTip.y, tailTip.x - preTip.x));
        this._drawHead(tempSpinePoints[0].x, tempSpinePoints[0].y, Math.atan2(tempSpinePoints[0].y - tempSpinePoints[1].y, tempSpinePoints[0].x - tempSpinePoints[1].x) + Math.PI, this.config.head.size);
    }

    _drawScorpion() {
        const bodyColor = `hsl(${this.currentHue}, ${this.config.color.saturation}%, ${this.config.color.lightness}%)`;
        const glowColor = `hsl(${this.currentHue}, ${this.config.color.saturation}%, ${this.config.color.glowLightness}%)`;

        this._drawShadow();

        this.ctx.strokeStyle = bodyColor;
        this.ctx.lineWidth = 1.2;
        this.ctx.shadowColor = glowColor;
        
        // Brillo dinámico basado en el movimiento
        const speedGlow = Math.min(this.headSpeed * 0.5, 2);
        this.ctx.shadowBlur = this.config.color.glowBlur + 
                              Math.sin(this.animationFrame * this.config.color.glowPulseSpeed) * this.config.color.glowPulseAmount + 
                              this.postStrikeGlow +
                              speedGlow;

        this.legs.forEach(leg => {
            const bodyPoint = this.spinePoints[leg.spineIndex];
            leg.draw(this.ctx, bodyPoint, this.currentHue, this.config.color);
        });

        // Dibujar las articulaciones de las pinzas con brillo
        this._drawPincerJoints();

        // Volvemos a dibujar las patas para que las articulaciones del cuerpo queden por encima
        // pero las articulaciones de las pinzas por debajo.
        this.ctx.shadowBlur = 0; // Sin brillo para esta pasada
        this.legs.forEach(leg => {
            const bodyPoint = this.spinePoints[leg.spineIndex];
            leg.draw(this.ctx, bodyPoint, this.currentHue, this.config.color);
        });

        // --- NUEVA LÓGICA PARA DIBUJAR CUERPO SEGMENTADO ---
        this.ctx.fillStyle = '#000';
        // Restaurar el brillo para el cuerpo
        this.ctx.shadowBlur = this.config.color.glowBlur + 
                              Math.sin(this.animationFrame * this.config.color.glowPulseSpeed) * this.config.color.glowPulseAmount + 
                              this.postStrikeGlow +
                              speedGlow;


        // Modificado para recorrer toda la cola, hasta el penúltimo segmento.
        const bodyEndIndex = this.spinePoints.length - 2;

        // Dibujar desde la cola hacia la cabeza para que las placas se superpongan correctamente
        for (let i = bodyEndIndex; i > 1; i--) {
            const p1 = this.spinePoints[i];
            const p2 = this.spinePoints[i-1];
            const t = i / this.spinePoints.length;
            
            let width1, width2;
            // --- LÓGICA DE SEGMENTACIÓN: TÓRAX VS ABDOMEN ---
            if (i <= this.config.body.thoraxEndIndex) {
                // Placas del tórax: más anchas y conectadas
                const thoraxT = (i - 1) / this.config.body.thoraxEndIndex; // Progreso dentro del tórax
                width1 = 12 + 8 * Math.sin(thoraxT * Math.PI);
                width2 = 12 + 8 * Math.sin(((i - 2) / this.config.body.thoraxEndIndex) * Math.PI);
            } else {
                // Placas del abdomen/cola: más delgadas y afiladas
                width1 = Math.max(1.5, (3.0 - Math.pow(t, 0.6) * 4.0) * 4.5);
                width2 = Math.max(1.5, (3.0 - Math.pow((i - 1) / this.spinePoints.length, 0.6) * 4.0) * 4.5);
            }

            if (width1 < 0.5) continue;

            const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
            const angle2 = (i > 2) ? Math.atan2(p1.y - this.spinePoints[i-2].y, p1.x - this.spinePoints[i-2].x) + Math.PI / 2 : angle1;

            // Vértices de la placa (un cuadrilátero)
            const p1_left = { x: p1.x + width1 * Math.cos(angle1), y: p1.y + width1 * Math.sin(angle1) };
            const p1_right = { x: p1.x - width1 * Math.cos(angle1), y: p1.y - width1 * Math.sin(angle1) };
            const p2_left = { x: p2.x + width2 * Math.cos(angle2), y: p2.y + width2 * Math.sin(angle2) };
            const p2_right = { x: p2.x - width2 * Math.cos(angle2), y: p2.y - width2 * Math.sin(angle2) };

            this.ctx.beginPath();
            this.ctx.moveTo(p1_left.x, p1_left.y);
            this.ctx.lineTo(p2_left.x, p2_left.y);
            this.ctx.lineTo(p2_right.x, p2_right.y);
            this.ctx.lineTo(p1_right.x, p1_right.y);
            this.ctx.closePath();

            this.ctx.fill();
            this.ctx.stroke();
        }
        // --- FIN DE LA LÓGICA DEL CUERPO SEGMENTADO ---

        // Dibujar cabeza, pinzas y aguijón encima del cuerpo
        this._drawHead(this.spinePoints[0].x, this.spinePoints[0].y, this.headAngle, this.config.head.size);
        this._drawPincers(this.spinePoints[0].x, this.spinePoints[0].y, this.headAngle);
        const tailTip = this.spinePoints[this.spinePoints.length - 1];
        const preTip = this.spinePoints[this.spinePoints.length - 2];
        this._drawStinger(tailTip.x, tailTip.y, Math.atan2(tailTip.y - preTip.y, tailTip.x - preTip.x));
    }

    _drawParticles() {
        this.ctx.save();
        this.particles.forEach(p => p.draw(this.ctx));
        this.ctx.restore();
    }

    _drawShadow() {
        this.ctx.save();
        const shadowCenter = this.spinePoints[8];
        if (!shadowCenter) return;

        const gradient = this.ctx.createRadialGradient(shadowCenter.x, shadowCenter.y + 10, 5, shadowCenter.x, shadowCenter.y + 10, 80);
        const shadowColor = `hsla(${this.currentHue}, 90%, 10%, 0.4)`;
        gradient.addColorStop(0, shadowColor);
        gradient.addColorStop(1, 'transparent');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.ellipse(shadowCenter.x, shadowCenter.y + 10, 90, 40, this.headAngle, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    _drawHead(x, y, angle, size) {
        this.ctx.save();
        this.ctx.beginPath();

        const width = size * this.config.head.widthFactor;
        const length = size * this.config.head.lengthFactor;
        
        const pFront = { x: length, y: 0 };
        const pFrontSideL = { x: length * 0.6, y: -width/2.5 };
        const pFrontSideR = { x: length * 0.6, y: width/2.5 };
        const pBackSideL = { x: -length * 0.8, y: -width/2 };
        const pBackSideR = { x: -length * 0.8, y: width/2 };
        
        const rotatePoint = (p) => ({
            x: p.x * Math.cos(angle) - p.y * Math.sin(angle),
            y: p.x * Math.sin(angle) + p.y * Math.cos(angle)
        });

        const rpFront = rotatePoint(pFront);
        const rpFrontSideL = rotatePoint(pFrontSideL);
        const rpFrontSideR = rotatePoint(pFrontSideR);
        const rpBackSideL = rotatePoint(pBackSideL);
        const rpBackSideR = rotatePoint(pBackSideR);
        
        this.ctx.moveTo(x + rpBackSideL.x, y + rpBackSideL.y);
        this.ctx.lineTo(x + rpFrontSideL.x, y + rpFrontSideL.y);
        this.ctx.quadraticCurveTo(x + rpFront.x, y + rpFront.y, x + rpFrontSideR.x, y + rpFrontSideR.y);
        this.ctx.lineTo(x + rpBackSideR.x, y + rpBackSideR.y);
        this.ctx.closePath();
        
        this.ctx.fillStyle = '#000';
        this.ctx.fill();
        this.ctx.stroke();
        
        this._drawEyes(x, y, angle);

        this.ctx.restore();
    }

    _drawEyes(headX, headY, headAngle) {
        this.ctx.save();
        const eyeConfig = this.config.head.eyes;

        if (this.eyeGlow > 0.01) {
            const glowColor = `hsl(${this.currentHue}, ${this.config.color.saturation}%, ${this.config.color.glowLightness}%)`;
            this.ctx.shadowColor = glowColor;
            const pulse = Math.sin(this.animationFrame * this.config.color.glowPulseSpeed) * this.config.color.glowPulseAmount;
            this.ctx.shadowBlur = this.eyeGlow * (15 + pulse);
            this.ctx.fillStyle = glowColor;
        } else {
            this.ctx.fillStyle = '#000';
        }

        for (let side = -1; side <= 1; side += 2) {
            const eyeX = headX + Math.cos(headAngle) * (eyeConfig.offsetX * this.config.head.size) + Math.cos(headAngle + Math.PI / 2) * (eyeConfig.offsetY * this.config.head.size * side);
            const eyeY = headY + Math.sin(headAngle) * (eyeConfig.offsetX * this.config.head.size) + Math.sin(headAngle + Math.PI / 2) * (eyeConfig.offsetY * this.config.head.size * side);
            
            this.ctx.beginPath();
            this.ctx.arc(eyeX, eyeY, eyeConfig.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    _drawPincerJoints() {
        this.ctx.save();
        const glowColor = `hsl(${this.currentHue}, ${this.config.color.saturation}%, ${this.config.color.glowLightness}%)`;
        this.ctx.fillStyle = glowColor;
        this.ctx.shadowColor = glowColor;
        this.ctx.shadowBlur = 8;

        for (let side = -1; side <= 1; side += 2) {
            const sideKey = side === -1 ? 'left' : 'right';
            const joints = this.pincerJoints[sideKey];
            if (!joints) continue;

            // Articulación del "hombro"
            const anchorPoint = this.spinePoints[1];
            this.ctx.beginPath();
            this.ctx.arc(anchorPoint.x, anchorPoint.y, 2.5, 0, Math.PI * 2);
            this.ctx.fill();

            // Articulación del "codo"
            this.ctx.beginPath();
            this.ctx.arc(joints.elbow.x, joints.elbow.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    _drawPincers(headX, headY, headAngle, overrideAnchor, overrideJoints) {
        this.ctx.save();
        
        for (let side = -1; side <= 1; side += 2) {
            const sideKey = side === -1 ? 'left' : 'right';
            const joints = overrideJoints ? overrideJoints[sideKey] : this.pincerJoints[sideKey];
            if (!joints) continue; // Si aún no se ha inicializado, saltar

            // 1. Usar las posiciones pre-calculadas
            const anchorPoint = overrideAnchor || this.spinePoints[1];
            const armBaseX = anchorPoint.x;
            const armBaseY = anchorPoint.y;
            const elbowX = joints.elbow.x;
            const elbowY = joints.elbow.y;
            const handX = joints.hand.x;
            const handY = joints.hand.y;

            // Dibujar el primer segmento del brazo
            this.ctx.lineWidth = this.config.pincers.armWidth * 0.8;
            this.ctx.beginPath();
            this.ctx.moveTo(armBaseX, armBaseY);
            this.ctx.lineTo(elbowX, elbowY);
            this.ctx.stroke();

            // Dibujar la "mano" (quela)
            this.ctx.beginPath();
            const handWidth = this.config.pincers.handWidth;
            const armWidth = this.config.pincers.armWidth;
            const armAngle = Math.atan2(handY - elbowY, handX - elbowX);
            const anglePerp = armAngle + Math.PI / 2;
            const p_base_in = { x: elbowX - side * armWidth/2 * Math.cos(anglePerp), y: elbowY - side * armWidth/2 * Math.sin(anglePerp) };
            const p_base_out = { x: elbowX + side * armWidth/2 * Math.cos(anglePerp), y: elbowY + side * armWidth/2 * Math.sin(anglePerp) };
            const p_hand_in = { x: handX - side * handWidth/2 * Math.cos(anglePerp), y: handY - side * handWidth/2 * Math.sin(anglePerp) };
            const p_hand_out = { x: handX + side * handWidth/2 * Math.cos(anglePerp), y: handY + side * handWidth/2 * Math.sin(anglePerp) };
            const p_hand_out_ctrl1 = { x: handX + side * handWidth * 0.8 * Math.cos(anglePerp) - handWidth * 0.2 * Math.cos(armAngle), y: handY + side * handWidth * 0.8 * Math.sin(anglePerp) - handWidth * 0.2 * Math.sin(armAngle) };
            const p_hand_out_ctrl2 = { x: p_base_out.x + (handX - elbowX) * 0.2, y: p_base_out.y + (handY - elbowY) * 0.2 };

            this.ctx.moveTo(p_base_in.x, p_base_in.y);
            this.ctx.lineTo(p_hand_in.x, p_hand_in.y);
            this.ctx.bezierCurveTo(p_hand_in.x, p_hand_in.y, p_hand_out_ctrl1.x, p_hand_out_ctrl1.y, p_hand_out.x, p_hand_out.y);
            this.ctx.bezierCurveTo(p_hand_out_ctrl2.x, p_hand_out_ctrl2.y, p_base_out.x, p_base_out.y, p_base_out.x, p_base_out.y);
            this.ctx.closePath();
    
            this.ctx.fillStyle = '#000';
            this.ctx.fill();
            this.ctx.stroke();
    
            const handAngle = Math.atan2(handY - elbowY, handX - elbowX);
            const fingerLength = this.config.pincers.lengthFinger;
    
            const mobileClawAngle = handAngle + (side * this.pincerAngle);
            const mobileClawEndX = handX + fingerLength * Math.cos(mobileClawAngle);
            const mobileClawEndY = handY + fingerLength * Math.sin(mobileClawAngle);
            const mobileClawControlX = handX + fingerLength * 0.5 * Math.cos(mobileClawAngle + side * 0.2);
            const mobileClawControlY = handY + fingerLength * 0.5 * Math.sin(mobileClawAngle + side * 0.2);
    
            const fixedClawAngle = handAngle - (side * 0.4); 
            const fixedClawEndX = handX + fingerLength * 0.9 * Math.cos(fixedClawAngle);
            const fixedClawEndY = handY + fingerLength * 0.9 * Math.sin(fixedClawAngle);
            const fixedClawControlX = handX + fingerLength * 0.4 * Math.cos(fixedClawAngle - side * 0.4);
            const fixedClawControlY = handY + fingerLength * 0.4 * Math.sin(fixedClawAngle - side * 0.4);
            
            this.ctx.beginPath();
            this.ctx.moveTo(handX, handY); this.ctx.quadraticCurveTo(mobileClawControlX, mobileClawControlY, mobileClawEndX, mobileClawEndY);
            this.ctx.moveTo(handX, handY); this.ctx.quadraticCurveTo(fixedClawControlX, fixedClawControlY, fixedClawEndX, fixedClawEndY);
            this.ctx.lineWidth = 4.5;
            this.ctx.stroke();

            // Resaltar la articulación de la mano
            this.ctx.save();
            const glowColor = `hsl(${this.currentHue}, ${this.config.color.saturation}%, ${this.config.color.glowLightness}%)`;
            this.ctx.fillStyle = glowColor;
            this.ctx.beginPath();
            this.ctx.arc(handX, handY, 2.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();

        }
        this.ctx.restore();
    }

    _drawStinger(baseX, baseY, angle) {
        this.ctx.save();

        let strikeAngleOffset = 0;
        if (this.isStriking) {
            const strikePhase = this.strikeProgress / this.config.strike.duration;
            strikeAngleOffset = Math.sin(strikePhase * Math.PI) * this.config.strike.angleOffset;
        }
        const finalAngle = angle + strikeAngleOffset;
        
        // --- NUEVA LÓGICA PARA FORMA DE AGUIJÓN AMENAZANTE ---
        const bulbRadius = 9;
        const stingerLength = 28; // Más largo
        const stingerCurve = 0.9; // Más curvado

        // Bulbo
        const bulbCenterX = baseX - 4 * Math.cos(finalAngle);
        const bulbCenterY = baseY - 4 * Math.sin(finalAngle);
        this.ctx.beginPath();
        this.ctx.arc(bulbCenterX, bulbCenterY, bulbRadius, finalAngle - Math.PI / 2.2, finalAngle + Math.PI / 2.2);
        this.ctx.closePath();
        this.ctx.fillStyle = this.ctx.strokeStyle;
        this.ctx.fill();
        this.ctx.stroke();

        // Púa principal
        const tipX = bulbCenterX + stingerLength * Math.cos(finalAngle + stingerCurve);
        const tipY = bulbCenterY + stingerLength * Math.sin(finalAngle + stingerCurve);
        const controlX = bulbCenterX + stingerLength * 0.5 * Math.cos(finalAngle + stingerCurve * 0.5);
        const controlY = bulbCenterY + stingerLength * 0.5 * Math.sin(finalAngle + stingerCurve * 0.5);
        const baseOffsetX = bulbRadius * 0.6 * Math.cos(finalAngle + Math.PI / 2);
        const baseOffsetY = bulbRadius * 0.6 * Math.sin(finalAngle + Math.PI / 2);
        this.ctx.beginPath();
        this.ctx.moveTo(bulbCenterX + baseOffsetX, bulbCenterY + baseOffsetY);
        this.ctx.quadraticCurveTo(controlX, controlY, tipX, tipY);
        this.ctx.lineTo(bulbCenterX - baseOffsetX, bulbCenterY - baseOffsetY);
        this.ctx.stroke();

        // Púa secundaria (detalle)
        const subStingerLength = 10;
        const subStingerAngle = finalAngle - 0.5;
        const subTipX = bulbCenterX + subStingerLength * Math.cos(subStingerAngle);
        const subTipY = bulbCenterY + subStingerLength * Math.sin(subStingerAngle);
        this.ctx.beginPath();
        this.ctx.moveTo(bulbCenterX, bulbCenterY);
        this.ctx.lineTo(subTipX, subTipY);
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.restore();
    }
    // --- FIN DE LA LÓGICA DEL AGUIJÓN ---
}

// --- Inicio ---
let scorpion;
let animationLoopId;

function setup() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(dpr, dpr);

    if (animationLoopId) {
        cancelAnimationFrame(animationLoopId);
    }

    scorpion = new Scorpion(canvas, ctx, config);

    // --- Event Listeners ---
    const getMousePos = (e) => {
        const rect = canvas.getBoundingClientRect();
        let clientX = e.touches ? e.touches[0].clientX : e.clientX; // Usa el primer toque o el ratón
        let clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left),
            y: (clientY - rect.top)
        };
    };

    const handleMove = (e) => {
        if (e.type === 'touchmove') e.preventDefault(); // Previene el scroll en móviles
        const { x, y } = getMousePos(e);
        scorpion.updateMouse(x, y);
    };

    const handleClick = () => scorpion.startStrike(); // Función para el ataque

    const handleGrab = (e) => {
        if (e.type === 'touchstart') { // Para el toque, actualiza la posición antes de agarrar
            e.preventDefault();
            const { x, y } = getMousePos(e);
            scorpion.updateMouse(x, y);
        }
        scorpion.startGrab();
    };

    const handleRelease = (e) => {
        if (e.type === 'touchend') e.preventDefault(); // Previene eventos fantasma
        
        // Si se suelta después de arrastrar, no atacar. Si no, es un toque/clic.
        if (scorpion.isGrabbed) {
            scorpion.endGrab();
        } else {
            handleClick(); // Si no se arrastró, es un toque/clic para atacar
        }
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleMove, { passive: false });

    canvas.addEventListener('mousedown', handleGrab);
    canvas.addEventListener('touchstart', handleGrab, { passive: false }); // Inicia el agarre

    canvas.addEventListener('mouseup', handleRelease);
    canvas.addEventListener('touchend', handleRelease, { passive: false }); // Suelta o ataca

    // Nuevo listener para la tecla 'D'
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'd') {
            scorpion.toggleDeconstruction();
        }
    });

    loop();
}

function loop() {
    scorpion.update();
    scorpion.draw();
    animationLoopId = requestAnimationFrame(loop);
}

window.addEventListener('resize', setup);
setup();