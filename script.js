import { config } from './config.js';

const canvas = document.getElementById('scorpionCanvas');
const ctx = canvas.getContext('2d');

// =====================================================================
// ===               REFACTORIZACIÓN A CLASES (NUEVO)                ===
// =====================================================================

class Particle {
    constructor(x, y, angle, config, hue) {
        const speed = config.minSpeed + Math.random() * (config.maxSpeed - config.minSpeed);
        const sprayAngle = angle + (Math.random() - 0.5) * config.sprayAngle;
        
        this.x = x;
        this.y = y;
        this.vx = Math.cos(sprayAngle) * speed;
        this.vy = Math.sin(sprayAngle) * speed;
        this.gravity = config.gravity || 0.08; // Usar gravedad de config o un valor por defecto
        this.life = config.minLife + Math.random() * (config.maxLife - config.minLife);
        this.maxLife = config.maxLife;
        this.drag = config.drag;
        this.hue = (hue + 180) % 360;
        this.saturation = config.saturation;
        this.lightness = config.glowLightness;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity; // Gravedad
        this.vx *= this.drag;
        this.vy *= this.drag;
        this.life--;
        return this.life > 0;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.beginPath();
        // Dibujar círculos es más rápido que líneas para partículas pequeñas
        ctx.arc(this.x, this.y, 1.5 * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${alpha * 0.8})`;
        ctx.fill();
    }
}

class Leg {
    constructor(spineIndex, side, gaitGroup, initialBodyPoint, initialBodyAngle, config, angle) {
        this.spineIndex = spineIndex;
        this.side = side;
        this.gaitGroup = gaitGroup;
        this.config = config;
        this.angle = angle; // Ángulo específico para este par de patas
        
        this.footPos = { x: 0, y: 0 };
        this._getNaturalRestingPos(initialBodyPoint, initialBodyAngle, 1.0, this.footPos);
        
        this.isStepping = false;
        this.stepProgress = 0;
        this.stepStartPos = { x: 0, y: 0 };
        this.stepTargetPos = { x: 0, y: 0 };
        this.currentStepDuration = this.config.stepDuration;
        this._tempBodyPoint = { x: 0, y: 0 }; // Para la predicción de la posición del cuerpo
    }

    _getNaturalRestingPos(bodyPoint, bodyAngle, scale, out) {
        const angle = bodyAngle + this.side * this.angle;
        const len = this.config.naturalLength * scale;
        out.x = bodyPoint.x + len * Math.cos(angle);
        out.y = bodyPoint.y + len * Math.sin(angle);
        return out;
    }

    update(bodyPoint, bodyAngle, headVelocity, headAngularVelocity, headSpeed, canStep, isGrabbed, onStepCallback) {
        // --- OPTIMIZACIÓN: Usar distancia al cuadrado para evitar Math.hypot ---
        // OPTIMIZACIÓN: Reutilizar un objeto para la posición natural para evitar crear uno nuevo en cada fotograma.
        if (!this._naturalPosCache) this._naturalPosCache = { x: 0, y: 0 };
        const naturalPos = this._getNaturalRestingPos(bodyPoint, bodyAngle, 1.0, this._naturalPosCache);

        const dx = this.footPos.x - naturalPos.x;
        const dy = this.footPos.y - naturalPos.y;
        const distSqFromNatural = dx * dx + dy * dy;

        if (this.isStepping) {
            this.stepProgress++;
            let t = this.stepProgress / this.currentStepDuration;

            const DUST_CREATION_THRESHOLD = 0.9;
            // Justo antes de que la pata aterrice (t > 0.9), crea el polvo
            if (t > DUST_CREATION_THRESHOLD && !this.dustCreated) {
                onStepCallback(this.stepTargetPos.x, this.stepTargetPos.y);
                this.dustCreated = true;
            }

            t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // Fórmula de interpolación Ease in-out

            this.footPos.x = this.stepStartPos.x + (this.stepTargetPos.x - this.stepStartPos.x) * t;
            this.footPos.y = this.stepStartPos.y + (this.stepTargetPos.y - this.stepStartPos.y) * t;

            if (this.stepProgress >= this.currentStepDuration) {                        
                this.isStepping = false;
            }
        } else { // --- LÓGICA DE PASO MEJORADA ---
            // Se elimina la condición `headSpeed > 0.2` para permitir que las patas se reajusten incluso en reposo.
            if (distSqFromNatural > this.config.stepThreshold * this.config.stepThreshold && canStep && !isGrabbed) {
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
                this._tempBodyPoint.x = predictedBodyX;
                this._tempBodyPoint.y = predictedBodyY;
                this._getNaturalRestingPos(this._tempBodyPoint, predictedBodyAngle, 1.0, this.stepTargetPos);
            }
        }
    }

    draw(ctx, bodyPoint, hue, colorConfig) {
        ctx.save();
        
        const startX = bodyPoint.x;
        const startY = bodyPoint.y;
        let footX = this.footPos.x;
        let footY = this.footPos.y;

        let lift = 0;
        if (this.isStepping) {
            lift = Math.sin(this.stepProgress / this.currentStepDuration * Math.PI) * this.config.stepLift;
        }

        const FOOT_SHADOW_LIFT_THRESHOLD = 0.1;
        if (lift > FOOT_SHADOW_LIFT_THRESHOLD) {
            ctx.beginPath();
            ctx.arc(footX, footY, 1.5, 0, Math.PI * 2); // Sombra del pie
            ctx.fillStyle = 'rgba(0,0,0,0.4)'; // Color de la sombra
            ctx.fill();
        }
        footY -= lift;

        const seg1_len = this.config.segment1;
        const seg2_len = this.config.segment2 + this.config.segment3;
        const dist = Math.hypot(startX - footX, startY - footY);
        const MAX_REACH_OFFSET = 1; // Evita que la pata se estire completamente y cause "popping"
        const maxReach = seg1_len + seg2_len - MAX_REACH_OFFSET;
        let jointX, jointY;

        // --- Lógica de Cinemática Inversa (IK) para la rodilla ---
        // Si la distancia al pie es mayor que el alcance máximo, la pata se estira completamente.
        if (dist >= maxReach) {
            const angle = Math.atan2(footY - startY, footX - startX);
            jointX = startX + seg1_len * Math.cos(angle);
            jointY = startY + seg1_len * Math.sin(angle);
        } else {
            // Si el pie está al alcance, se calcula la posición de la rodilla usando la ley de los cosenos
            // para formar un triángulo entre el cuerpo, la rodilla y el pie.
            const angle_at_body = Math.acos((seg1_len**2 + dist**2 - seg2_len**2) / (2 * seg1_len * dist));
            const angle_body_to_foot = Math.atan2(footY - startY, footX - startX);
            // El ángulo de la articulación se ajusta por `this.side` para que las rodillas apunten hacia afuera.
            const jointAngle = angle_body_to_foot + (angle_at_body * this.side);

            jointX = startX + seg1_len * Math.cos(jointAngle);
            jointY = startY + seg1_len * Math.sin(jointAngle);
        }

        const leg_seg2_angle = Math.atan2(footY - jointY, footX - jointX);
        const leg_seg2_len = this.config.segment2;
        const joint2X = jointX + leg_seg2_len * Math.cos(leg_seg2_angle);
        const joint2Y = jointY + leg_seg2_len * Math.sin(leg_seg2_angle);

        // --- LÓGICA DE DIBUJO DE PATAS MÁS DELGADAS Y ARTICULADAS ---
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineWidth = this.config.legWidth; // Segmento más grueso
        ctx.lineTo(jointX, jointY); // Rodilla
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(jointX, jointY);
        ctx.lineWidth = this.config.legWidth * 0.7; // Segmento intermedio
        ctx.lineTo(joint2X, joint2Y); // Tobillo
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(joint2X, joint2Y);
        ctx.lineWidth = this.config.legWidth * 0.4; // Segmento más fino
        ctx.lineTo(footX, footY); 
        ctx.stroke(); // El pie

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
        this.config.legs.indices.forEach((spineIndex, i) => {
            for (let side = -1; side <= 1; side += 2) {
                const bodyPoint = this.spinePoints[spineIndex];
                let bodyAngle = 0;
                if (this.spinePoints.length > spineIndex + 1) {
                    bodyAngle = Math.atan2(this.spinePoints[spineIndex+1].y - bodyPoint.y, this.spinePoints[spineIndex+1].x - bodyPoint.x);
                }
                const legAngle = this.config.legs.angles[i];
                this.legs.push(new Leg(spineIndex, side, legCounter % 2, bodyPoint, bodyAngle, this.config.legs, legAngle));
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
        const deconfig = this.config.deconstruction;

        // Capturar segmentos del cuerpo
        this.spinePoints.forEach((p, i) => {
            const angle = Math.random() * Math.PI * 2;
            const dist = deconfig.spinePart.minDist + Math.random() * deconfig.spinePart.randDist;
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
            const dist = deconfig.legPart.minDist + Math.random() * deconfig.legPart.randDist;
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
            const dist = deconfig.pincerPart.minDist + Math.random() * deconfig.pincerPart.randDist;
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
        const DECONSTRUCTION_DURATION_FRAMES = this.config.deconstruction.durationFrames; // ¡Mucho más claro!
        this.deconstructionProgress += 1 / DECONSTRUCTION_DURATION_FRAMES;

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

        this._updateHeadVelocity(head.x, oldHeadX, head.y, oldHeadY);
        this.headSpeed = Math.hypot(this.headVelocity.x, this.headVelocity.y); // hypot es necesario aquí para la velocidad real

        if (this.headSpeed > 0.1) {
            this.headAngle = Math.atan2(this.headVelocity.y, this.headVelocity.x);
        }

        const angleDifference = (this.headAngle - this.lastHeadAngle + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        this.headAngularVelocity = angleDifference;
        this.lastHeadAngle = this.headAngle;
    }

    _updateHeadVelocity(newX, oldX, newY, oldY) {
        this.headVelocity.x = newX - oldX;
        this.headVelocity.y = newY - oldY; 
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
                const pullFactor = 0.04 * Math.pow(progress, 2); // La fuerza es mayor al final de la cola (LIGERAMENTE REDUCIDO)
                
                point.x += (targetX - point.x) * pullFactor;
                point.y += (targetY - point.y) * pullFactor;
            }

            // 2. Propagamos la posición desde la cabeza hacia la cola para mantener la distancia (restricción de cuerda)
            for (let i = 1; i < this.spinePoints.length; i++) {
                const currentPoint = this.spinePoints[i];
                const prevPoint = this.spinePoints[i - 1];

                const dx = currentPoint.x - prevPoint.x;
                const dy = currentPoint.y - prevPoint.y;
                const distSq = dx * dx + dy * dy;
                // Usar el cuadrado de la longitud del segmento para evitar una raíz cuadrada.
                const segmentLengthSq = this.config.segmentLength * this.config.segmentLength;

                // --- OPTIMIZACIÓN CRÍTICA: Evitar raíz cuadrada (Math.hypot/Math.sqrt) en el bucle de física ---
                // Esta aproximación es mucho más rápida y funciona bien para pequeñas diferencias.
                if (distSq > segmentLengthSq) {
                    const diff = (distSq - segmentLengthSq) / (distSq * 2); // Aproximación de (dist - L) / dist
                    currentPoint.x -= dx * diff;
                    currentPoint.y -= dy * diff;
                    // Esto empuja el punto actual hacia el punto anterior para corregir la distancia,
                    // creando un efecto de "cuerda" o "cadena".
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
        const head = this.spinePoints[0]; // La cabeza es el punto de referencia
        const distToMouse = Math.hypot(this.mouse.x - head.x, this.mouse.y - head.y); // Distancia del cursor a la cabeza
        const isClosing = (distToMouse < this.config.pincers.snapDistance && !this.isGrabbed);
        let targetAngle = isClosing ? this.config.pincers.closedAngle : this.config.pincers.openAngle;

        // Detectar si las pinzas se acaban de cerrar para crear un destello
        if (isClosing && this.pincerAngle > (this.config.pincers.closedAngle + 0.1)) {
            if (this.lastPincerAngle > this.pincerAngle) { // Si se está moviendo para cerrar
                this._createPincerFlash();
            }
        }

        // Interpolar suavemente hacia el ángulo objetivo
        this.pincerAngle += (targetAngle - this.pincerAngle) * this.config.pincers.snapLerpFactor;
        this.lastPincerAngle = this.pincerAngle;
    }

    _updatePincerPhysics() {
        // --- OPTIMIZACIÓN: No calcular la física de las pinzas si el escorpión está siendo arrastrado ---
        if (!this.isGrabbed) {
            const PINCER_FOLLOW_LERP_FACTOR = 0.2; 
    
            for (let side = -1; side <= 1; side += 2) {
                const sideKey = side === -1 ? 'left' : 'right';
                if (!this.pincerJoints[sideKey]) {
                    this.pincerJoints[sideKey] = { elbow: {x: 0, y: 0}, hand: {x: 0, y: 0} };
                }
                const anchorPoint = this.spinePoints[1];
    
                // El objetivo de la pinza ahora es una mezcla entre la posición neutral y la dirección del cursor.
                const targetToMouseAngle = Math.atan2(this.mouse.y - anchorPoint.y, this.mouse.x - anchorPoint.x);
                const baseAngle = this.headAngle;
                
                let angleDiff = (targetToMouseAngle - baseAngle + Math.PI * 3) % (Math.PI * 2) - Math.PI;
                const finalTargetAngle = baseAngle + angleDiff * 0.1;
    
                const targetAngleA = this.headAngle + side * 1.2;
                const targetElbowX = anchorPoint.x + this.config.pincers.lengthA * Math.cos(targetAngleA);
                const targetElbowY = anchorPoint.y + this.config.pincers.lengthA * Math.sin(targetAngleA);
                
                const targetAngleB = finalTargetAngle + side * 0.5;
                const targetHandX = targetElbowX + this.config.pincers.lengthB * Math.cos(targetAngleB);
                const targetHandY = targetElbowY + this.config.pincers.lengthB * Math.sin(targetAngleB);
    
                this.pincerJoints[sideKey].elbow.x += (targetElbowX - this.pincerJoints[sideKey].elbow.x) * PINCER_FOLLOW_LERP_FACTOR;
                this.pincerJoints[sideKey].elbow.y += (targetElbowY - this.pincerJoints[sideKey].elbow.y) * PINCER_FOLLOW_LERP_FACTOR;
                this.pincerJoints[sideKey].hand.x += (targetHandX - this.pincerJoints[sideKey].hand.x) * PINCER_FOLLOW_LERP_FACTOR;
                this.pincerJoints[sideKey].hand.y += (targetHandY - this.pincerJoints[sideKey].hand.y) * PINCER_FOLLOW_LERP_FACTOR;
            }
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
        t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // Fórmula de interpolación Ease in-out

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
            const p1_left_x = p1.x + width1 * Math.cos(angle1);
            const p1_left_y = p1.y + width1 * Math.sin(angle1);
            const p1_right_x = p1.x - width1 * Math.cos(angle1);
            const p1_right_y = p1.y - width1 * Math.sin(angle1);
            const p2_left_x = p2.x + width2 * Math.cos(angle2);
            const p2_left_y = p2.y + width2 * Math.sin(angle2);
            const p2_right_x = p2.x - width2 * Math.cos(angle2);
            const p2_right_y = p2.y - width2 * Math.sin(angle2);
            this.ctx.beginPath();
            this.ctx.moveTo(p1_left_x, p1_left_y); this.ctx.lineTo(p2_left_x, p2_left_y);
            this.ctx.lineTo(p2_right_x, p2_right_y); this.ctx.lineTo(p1_right_x, p1_right_y);
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

        // --- Calcula valores una sola vez por fotograma ---
        const speedGlow = Math.min(this.headSpeed * 0.4, 1.5); // Ligeramente reducido
        const currentGlowBlur = this.config.color.glowBlur +
                                Math.sin(this.animationFrame * this.config.color.glowPulseSpeed) * this.config.color.glowPulseAmount +
                                this.postStrikeGlow +
                                speedGlow;

        this._drawShadow();

        this.ctx.strokeStyle = bodyColor; // Usa el color precalculado
        this.ctx.lineWidth = 1.2;
        this.ctx.shadowColor = glowColor;
        this.ctx.shadowBlur = currentGlowBlur; // Usa el valor precalculado

        // --- OPTIMIZACIÓN: Reordenar el dibujado para evitar dibujar las patas dos veces ---
        // 1. Dibujar las articulaciones de las pinzas (que van por debajo de las patas)
        this._drawPincerJoints();

        // 2. Dibujar las patas UNA SOLA VEZ
        this.legs.forEach(leg => {
            const bodyPoint = this.spinePoints[leg.spineIndex];
            leg.draw(this.ctx, bodyPoint, this.currentHue, this.config.color);
        });

        // --- NUEVA LÓGICA PARA DIBUJAR CUERPO SEGMENTADO ---
        this.ctx.fillStyle = '#000';
        // --- OPTIMIZACIÓN: El shadowBlur ya está establecido, no es necesario volver a asignarlo. ---
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
                // --- LÓGICA MEJORADA PARA ANILLOS DE LA COLA ---
                const abdomenT = (i - this.config.body.thoraxEndIndex) / (this.spinePoints.length - this.config.body.thoraxEndIndex);
                const ringPulse = Math.sin(abdomenT * Math.PI * 12) * 0.5 + 0.5; // Crea valles y crestas
                width1 = this.config.body.abdomenRingScale * (1 - abdomenT * 0.5) * ringPulse;
                
                const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
                const p1_left = { x: p1.x + width1 * Math.cos(angle1), y: p1.y + width1 * Math.sin(angle1) };
                const p1_right = { x: p1.x - width1 * Math.cos(angle1), y: p1.y - width1 * Math.sin(angle1) };
                
                // Usamos el mismo ancho para el punto siguiente para crear un "anillo"
                const p2_left = { x: p2.x + width1 * Math.cos(angle1), y: p2.y + width1 * Math.sin(angle1) };
                const p2_right = { x: p2.x - width1 * Math.cos(angle1), y: p2.y - width1 * Math.sin(angle1) };

                this.ctx.beginPath();
                this.ctx.moveTo(p1_left.x, p1_left.y);
                this.ctx.quadraticCurveTo(p2.x, p2.y, p2_left.x, p2_left.y); // Curva hacia el siguiente punto
                this.ctx.lineTo(p2_right.x, p2_right.y);
                this.ctx.quadraticCurveTo(p2.x, p2.y, p1_right.x, p1_right.y); // Curva de vuelta
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();

                continue; // Saltar la lógica de dibujo de placas planas
            }

            if (width1 < 0.5) continue;

            const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
            // --- OPTIMIZACIÓN: Reutilizar ángulo para evitar Math.atan2 en el bucle ---
            // La diferencia visual es mínima, pero el rendimiento mejora.
            const angle2 = angle1;

            const p1_left_x = p1.x + width1 * Math.cos(angle1);
            const p1_left_y = p1.y + width1 * Math.sin(angle1);
            const p1_right_x = p1.x - width1 * Math.cos(angle1);
            const p1_right_y = p1.y - width1 * Math.sin(angle1);
            const p2_left_x = p2.x + width2 * Math.cos(angle2);
            const p2_left_y = p2.y + width2 * Math.sin(angle2);
            const p2_right_x = p2.x - width2 * Math.cos(angle2);
            const p2_right_y = p2.y - width2 * Math.sin(angle2);

            this.ctx.beginPath();
            this.ctx.moveTo(p1_left_x, p1_left_y); this.ctx.lineTo(p2_left_x, p2_left_y);
            this.ctx.lineTo(p2_right_x, p2_right_y); this.ctx.lineTo(p1_right_x, p1_right_y);
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
        this.particles.forEach(p => p.draw(this.ctx)); // El shadowBlur del escorpión no afecta a las partículas
        this.ctx.restore();
    }

    _drawShadow() {
        // --- OPTIMIZACIÓN: Reemplazar gradiente con un círculo simple para mejorar el rendimiento ---
        this.ctx.save();
        const shadowCenter = this.spinePoints[8];
        if (!shadowCenter) return;

        // Un color oscuro semitransparente es suficiente y mucho más rápido.
        const shadowColor = `hsla(${this.currentHue}, 50%, 10%, 0.35)`;
        this.ctx.fillStyle = shadowColor;
        this.ctx.filter = 'blur(15px)'; // Usar filtro de CSS es a veces más rápido que shadowBlur.

        this.ctx.beginPath();
        this.ctx.ellipse(shadowCenter.x, shadowCenter.y + 15, 60, 30, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    _drawHead(x, y, angle, size) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        const width = size * this.config.head.widthFactor;
        const length = size * this.config.head.lengthFactor;
        
        // --- OPTIMIZACIÓN: Dibujar la forma relativa al origen (0,0) y usar transformaciones ---
        const pFrontX = length;
        const pFrontSideLX = length * 0.6; const pFrontSideLY = -width / 2.5;
        const pFrontSideRX = length * 0.6; const pFrontSideRY = width / 2.5;
        const pBackSideLX = -length * 0.8; const pBackSideLY = -width / 2;
        const pBackSideRX = -length * 0.8; const pBackSideRY = width / 2;
        
        this.ctx.moveTo(pBackSideLX, pBackSideLY);
        // --- OPTIMIZACIÓN: Reemplazar quadraticCurveTo con lineTo para un renderizado más rápido ---
        this.ctx.lineTo(pFrontX, 0); // La forma es casi idéntica pero más eficiente.
        this.ctx.lineTo(pBackSideRX, pBackSideRY);
        this.ctx.closePath();
        
        this.ctx.fillStyle = '#000';
        this.ctx.fill();
        this.ctx.stroke();
        
        this._drawEyes(x, y, angle);
        
        // Restaurar la transformación al final
        this.ctx.restore();
    }

    _drawEyes() {
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

        // --- OPTIMIZACIÓN: Calcular la posición de los ojos una vez y dibujarlos en el espacio local de la cabeza ---
        for (let side = -1; side <= 1; side += 2) {
            const eyeX = eyeConfig.offsetX * this.config.head.size;
            const eyeY = eyeConfig.offsetY * this.config.head.size * side;

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
        // Guardamos el estado del contexto antes de cualquier dibujo de pinza
        // para que las transformaciones de una no afecten a la otra.
        const originalCtxState = this.ctx.getTransform();

        const glowColor = `hsl(${this.currentHue}, ${this.config.color.saturation}%, ${this.config.color.glowLightness}%)`;
        
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

            // --- OPTIMIZACIÓN: Usar transformaciones en lugar de cálculos manuales ---
            const armAngle = Math.atan2(handY - elbowY, handX - elbowX);
            const armAngle2 = Math.atan2(elbowY - armBaseY, elbowX - armBaseX);

            // Dibujar el primer segmento del brazo
            // --- OPTIMIZACIÓN: Evitar setTransform, save/restore es suficiente y más limpio. ---
            this.ctx.lineWidth = this.config.pincers.armWidth * 0.8;
            this.ctx.beginPath();
            this.ctx.moveTo(armBaseX, armBaseY);
            this.ctx.lineTo(elbowX, elbowY);
            this.ctx.stroke();

            this.ctx.save();
            this.ctx.translate(elbowX, elbowY);
            this.ctx.rotate(armAngle);

            // Dibujar la "mano" (quela) - ahora relativa al codo (0,0)
            this.ctx.beginPath();
            const handWidth = this.config.pincers.handWidth;
            const armWidth = this.config.pincers.armWidth;
            const handDist = Math.hypot(handX - elbowX, handY - elbowY);

            const p_base_in_y = -side * armWidth/2;
            const p_base_out_y = side * armWidth/2;
            const p_hand_in_x = handDist;
            const p_hand_in_y = -side * handWidth/2;
            const p_hand_out_x = handDist;
            const p_hand_out_y = side * handWidth/2;
            const p_hand_out_ctrl1_x = handDist - handWidth * 0.2;
            const p_hand_out_ctrl1_y = side * handWidth * 0.8;
            const p_hand_out_ctrl2_x = handDist * 0.2;
            const p_hand_out_ctrl2_y = side * armWidth/2;

            this.ctx.moveTo(0, p_base_in_y);
            this.ctx.lineTo(p_hand_in_x, p_hand_in_y);
            this.ctx.bezierCurveTo(p_hand_in_x, p_hand_in_y, p_hand_out_ctrl1_x, p_hand_out_ctrl1_y, p_hand_out_x, p_hand_out_y);
            this.ctx.bezierCurveTo(p_hand_out_ctrl2_x, p_hand_out_ctrl2_y, 0, p_base_out_y, 0, p_base_out_y);
            this.ctx.closePath();
    
            this.ctx.fillStyle = '#000';
            this.ctx.fill();
            this.ctx.stroke();
    
            // --- LÓGICA DE DIBUJO DE PINZAS MEJORADA (relativa a la mano) ---
            const fingerLength = this.config.pincers.lengthFinger;
            const handOriginX = handDist; const handOriginY = 0;

            const drawClaw = (baseAngle, length, curve1, curve2) => {
                const endX = handOriginX + length * Math.cos(baseAngle);
                const endY = handOriginY + length * Math.sin(baseAngle);
                const ctrl1X = handOriginX + length * 0.4 * Math.cos(baseAngle + curve1);
                const ctrl1Y = handOriginY + length * 0.4 * Math.sin(baseAngle + curve1);
                const ctrl2X = handOriginX + length * 0.8 * Math.cos(baseAngle + curve2);
                const ctrl2Y = handOriginY + length * 0.8 * Math.sin(baseAngle + curve2);
                this.ctx.moveTo(handOriginX, handOriginY);
                this.ctx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, endX, endY);
            };
            
            this.ctx.beginPath();
            drawClaw(side * this.pincerAngle, fingerLength, side * 0.1, side * 0.3); // Móvil
            drawClaw(-side * 0.4, fingerLength * 0.9, -side * 0.1, -side * 0.3); // Fija
            this.ctx.lineWidth = 4.5;
            this.ctx.stroke();

            // Resaltar la articulación de la mano
            this.ctx.save();
            this.ctx.fillStyle = glowColor;
            this.ctx.beginPath();
            this.ctx.arc(handOriginX, handOriginY, 2.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();

            this.ctx.restore(); // Restaura la transformación de esta pinza
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
        
        // --- NUEVA LÓGICA DE AGUIJÓN: MÁS GRANDE, AFILADO Y DETALLADO ---
        const bulbRadius = 10;
        const stingerLength = 35; // Mucho más largo
        const stingerCurve = 1.1; // Más curvado

        // Bulbo principal
        const bulbCenterX = baseX - 5 * Math.cos(finalAngle);
        const bulbCenterY = baseY - 5 * Math.sin(finalAngle);
        this.ctx.beginPath();
        this.ctx.arc(bulbCenterX, bulbCenterY, bulbRadius, finalAngle - Math.PI / 2, finalAngle + Math.PI / 2);
        this.ctx.closePath();
        this.ctx.fillStyle = this.ctx.strokeStyle;
        this.ctx.fill();
        this.ctx.stroke();

        // Púa principal (más afilada y con mejor forma)
        const tipX = bulbCenterX + stingerLength * Math.cos(finalAngle + stingerCurve * 0.8);
        const tipY = bulbCenterY + stingerLength * Math.sin(finalAngle + stingerCurve * 0.8);
        const controlX1 = bulbCenterX + stingerLength * 0.4 * Math.cos(finalAngle + stingerCurve * 0.2);
        const controlY1 = bulbCenterY + stingerLength * 0.4 * Math.sin(finalAngle + stingerCurve * 0.2);
        const controlX2 = bulbCenterX + stingerLength * 0.7 * Math.cos(finalAngle + stingerCurve * 0.9);
        const controlY2 = bulbCenterY + stingerLength * 0.7 * Math.sin(finalAngle + stingerCurve * 0.9);
        
        this.ctx.beginPath();
        this.ctx.moveTo(bulbCenterX, bulbCenterY);
        this.ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, tipX, tipY);
        this.ctx.stroke();

        // Púa secundaria (más agresiva)
        this.ctx.beginPath();
        this.ctx.moveTo(bulbCenterX + 2 * Math.cos(finalAngle), bulbCenterY + 2 * Math.sin(finalAngle));
        this.ctx.lineTo(bulbCenterX + 15 * Math.cos(finalAngle - 0.6), bulbCenterY + 15 * Math.sin(finalAngle - 0.6));
        this.ctx.stroke();
    }
}

// --- Inicio ---
let scorpion;
let animationLoopId;

function setup() {
    const dpr = window.devicePixelRatio || 1;
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