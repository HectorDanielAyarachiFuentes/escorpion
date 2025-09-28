const canvas = document.getElementById('scorpionCanvas');
const ctx = canvas.getContext('2d');

// --- Configuración ---
const config = {
    numSpinePoints: 70,
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
        curl: 2.5, // Factor de altura de la curva de la cola
        curlStartSegment: 20, // Segmento donde empieza a curvarse
        // --- Nuevos parámetros para movimiento orgánico ---
        speedCurlFactor: 1.5, // Cuánto se estira la cola al moverse rápido
        wagAmount: 1.2,       // Amplitud del balanceo lateral de la cola al moverse
        wagSpeed: 0.2,        // Velocidad del balanceo lateral
        undulationAmount: 2.0, // Amplitud de la ondulación del cuerpo
        undulationSpeed: 0.2,  // Velocidad de la ondulación del cuerpo
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

    draw(ctx, bodyPoint) {
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
        ctx.fillStyle = ctx.strokeStyle;
        ctx.arc(startX, startY, 1.8, 0, Math.PI * 2);
        ctx.fill();

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
        
        ctx.beginPath();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.arc(jointX, jointY, 1.2, 0, Math.PI * 2);
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

        this.particles = [];
        this._initLegs();
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

    // --- Lógica de actualización principal ---
    update() {
        this.animationFrame++;
        this.currentHue = (this.currentHue + this.config.color.hueChangeSpeed) % 360;

        if (this.postStrikeGlow > 0.1) {
            this.postStrikeGlow *= this.config.color.postStrikeGlowDecay;
        }

        this._updateMovement();
        this._updateSpinePhysics();
        this._updateStrike();
        this._updateParticles();
        this._updateLegs();
        this._updatePincers();
        this._updateEyes();
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
        for (let i = 1; i < this.spinePoints.length; i++) {
            const currentPoint = this.spinePoints[i];
            const prevPoint = this.spinePoints[i - 1];
            const t = i / this.spinePoints.length;
            const dynamicDrag = this.config.movement.spineDrag + (1 - this.config.movement.spineDrag) * t * 0.8;

            if (this.headSpeed > 0.2) {
                const targetX = prevPoint.x + Math.cos(this.headAngle) * this.config.segmentLength;
                const targetY = prevPoint.y + Math.sin(this.headAngle) * this.config.segmentLength;
                currentPoint.x = currentPoint.x * dynamicDrag + targetX * (1 - dynamicDrag);
                currentPoint.y = currentPoint.y * dynamicDrag + targetY * (1 - dynamicDrag);
            }

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

        for (let j = 0; j < this.config.physicsIterations; j++) {
            if (this.isGrabbed && this.grabbedPointIndex !== -1) {
                this.spinePoints[this.grabbedPointIndex].x = this.mouse.x;
                this.spinePoints[this.grabbedPointIndex].y = this.mouse.y;
            }
            for (let i = 1; i < this.spinePoints.length; i++) {
                const currentPoint = this.spinePoints[i];
                const prevPoint = this.spinePoints[i-1];
                let targetX, targetY;

                if (i > this.config.tail.curlStartSegment) {
                    const speedFactor = Math.min(this.headSpeed / this.config.maxSpeed, 1.0);
                    const dynamicCurl = this.config.tail.curl - (speedFactor * this.config.tail.speedCurlFactor);
                    const tailProgress = (i - this.config.tail.curlStartSegment) / (this.spinePoints.length - this.config.tail.curlStartSegment);
                    const curlAngleOffset = Math.pow(tailProgress, 1.5) * (dynamicCurl / 100);
                    
                    const angleFromPrev = Math.atan2(currentPoint.y - prevPoint.y, currentPoint.x - prevPoint.x);
                    const targetAngle = angleFromPrev - curlAngleOffset;
                    targetX = prevPoint.x + Math.cos(targetAngle) * this.config.segmentLength;
                    targetY = prevPoint.y + Math.sin(targetAngle) * this.config.segmentLength;
                } else {
                    const angle = Math.atan2(currentPoint.y - prevPoint.y, currentPoint.x - prevPoint.x);
                    targetX = prevPoint.x + Math.cos(angle) * this.config.segmentLength;
                    targetY = prevPoint.y + Math.sin(angle) * this.config.segmentLength;
                }
                
                currentPoint.x += (targetX - currentPoint.x) * 0.5;
                currentPoint.y += (targetY - currentPoint.y) * 0.5;
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
        let targetAngle = (distToMouse < this.config.pincers.snapDistance && !this.isGrabbed) ? this.config.pincers.closedAngle : this.config.pincers.openAngle;
        this.pincerAngle += (targetAngle - this.pincerAngle) * this.config.pincers.snapLerpFactor;
    }

    // --- Métodos de Dibujo ---
    draw() {
        const width = this.canvas.width / this.dpr;
        const height = this.canvas.height / this.dpr;
        this.ctx.clearRect(0, 0, width, height);

        this._drawScorpion();
        this._drawParticles();
    }

    _drawScorpion() {
        const bodyColor = `hsl(${this.currentHue}, ${this.config.color.saturation}%, ${this.config.color.lightness}%)`;
        const glowColor = `hsl(${this.currentHue}, ${this.config.color.saturation}%, ${this.config.color.glowLightness}%)`;

        this.ctx.strokeStyle = bodyColor;
        this.ctx.lineWidth = 1.2;
        this.ctx.shadowColor = glowColor;
        this.ctx.shadowBlur = this.config.color.glowBlur + Math.sin(this.animationFrame * this.config.color.glowPulseSpeed) * this.config.color.glowPulseAmount + this.postStrikeGlow;

        this.legs.forEach(leg => {
            const bodyPoint = this.spinePoints[leg.spineIndex];
            leg.draw(this.ctx, bodyPoint);
        });

        // --- NUEVA LÓGICA PARA DIBUJAR CUERPO SEGMENTADO ---
        this.ctx.fillStyle = '#000';
        // Modificado para recorrer toda la cola, hasta el penúltimo segmento.
        const bodyEndIndex = this.spinePoints.length - 2;

        // Dibujar desde la cola hacia la cabeza para que las placas se superpongan correctamente
        for (let i = bodyEndIndex; i > 1; i--) {
            const p1 = this.spinePoints[i];
            const p2 = this.spinePoints[i - 1];
            const t = i / this.spinePoints.length;
            
            // Fórmula de ancho modificada para asegurar que la cola tenga un grosor mínimo.
            const width1 = Math.max(0.8, (3.0 - Math.pow(t, 0.6) * 4.0) * 2.8);
            const width2 = Math.max(0.8, (3.0 - Math.pow((i - 1) / this.spinePoints.length, 0.6) * 4.0) * 2.8);

            if (width1 < 0.5) continue;

            const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
            const angle2 = Math.atan2(p1.y - this.spinePoints[i-2].y, p1.x - this.spinePoints[i-2].x) + Math.PI / 2;

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

    _drawPincers(headX, headY, headAngle) {
        this.ctx.save();
        
        for (let side = -1; side <= 1; side += 2) {
            // 1. Anclaje en los "hombros" (primer segmento del cuerpo), no en la cabeza.
            const anchorPoint = this.spinePoints[1];
            const anchorAngle = Math.atan2(this.spinePoints[2].y - anchorPoint.y, this.spinePoints[2].x - anchorPoint.x);
            const armBaseX = anchorPoint.x;
            const armBaseY = anchorPoint.y;

            // 2. Calcular la posición del "codo" (articulación).
            const angleA = headAngle + side * 1.2;
            const elbowX = armBaseX + this.config.pincers.lengthA * Math.cos(angleA);
            const elbowY = armBaseY + this.config.pincers.lengthA * Math.sin(angleA);

            // 3. Calcular la posición de la "mano".
            const angleB = headAngle + side * 0.5;
            const handX = elbowX + this.config.pincers.lengthB * Math.cos(angleB);
            const handY = elbowY + this.config.pincers.lengthB * Math.sin(angleB);

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
        }
        this.ctx.restore();
    }

    _drawStinger(x, y, angle) {
        this.ctx.save();
        
        let strikeAngleOffset = 0;
        if (this.isStriking) {
            const strikePhase = this.strikeProgress / this.config.strike.duration;
            strikeAngleOffset = Math.sin(strikePhase * Math.PI) * this.config.strike.angleOffset;
        }
        const finalAngle = angle + strikeAngleOffset;

        const bulbSize = 7;
        const barbLength = 15;
        const barbAngleOffset = 0.4;

        const p1 = { x: x, y: y };
        const p2 = { x: x + bulbSize * Math.cos(finalAngle - Math.PI / 2), y: y + bulbSize * Math.sin(finalAngle - Math.PI / 2) };
        const p3 = { x: x + barbLength * Math.cos(finalAngle + barbAngleOffset), y: y + barbLength * Math.sin(finalAngle + barbAngleOffset) };
        const p4 = { x: x + bulbSize * Math.cos(finalAngle + Math.PI / 2), y: y + bulbSize * Math.sin(finalAngle + Math.PI / 2) };

        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.quadraticCurveTo(p2.x, p2.y, p3.x, p3.y);
        this.ctx.quadraticCurveTo(p4.x, p4.y, p1.x, p1.y);
        
        this.ctx.fillStyle = this.ctx.strokeStyle;
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.restore();
    }
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

    loop();
}

function loop() {
    scorpion.update();
    scorpion.draw();
    animationLoopId = requestAnimationFrame(loop);
}

window.addEventListener('resize', setup);
setup();