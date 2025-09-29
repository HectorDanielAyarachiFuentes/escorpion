export const config = {
    numSpinePoints: 120, // AUMENTADO para una cola más larga y flexible
    segmentLength: 3.5,  // REDUCIDO para compensar el aumento de puntos
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
        indices: [2, 4, 6, 8, 10, 12, 14, 16], // 8 pares de patas = 16 patas en total
        angles: [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8], // Ángulos distintos para cada par de patas
        naturalLength: 50,
        legWidth: 4.5, // Grosor base de la pata
        segment1: 30,
        segment2: 25,
        segment3: 15, 
        stepThreshold: 30, // Pasos más largos y deliberados (REDUCIDO para más reactividad)
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
        turnSway: 0.4, // AUMENTADO para un contoneo más pronunciado al girar
    },
    strike: {
        duration: 25,
        angleOffset: -1.5,
    },
    tail: {
        stingerLength: 22,
        idleWiggleSpeed: 0.05,
        idleWiggleAmount: 0.15,
        curl: 8.0, // Factor de altura de la curva de la cola (AUMENTADO AÚN MÁS)
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
        thoraxEndIndex: 18, // Índice del segmento de la espina dorsal donde termina el tórax
        abdomenRingScale: 6.5, // Factor de tamaño para los anillos de la cola
    },
    pincers: {
        openAngle: 0.6,     // Ángulo de apertura de la pinza
        closedAngle: 0.05,  // Ángulo de cierre
        lengthA: 25,        // Longitud del primer segmento del brazo (hombro a codo)
        lengthB: 25,        // Longitud del segundo segmento del brazo (codo a mano)
        lengthFinger: 38,   // Longitud de los dedos (AUMENTADO)
        armWidth: 12,       // Grosor del brazo
        handWidth: 22,      // "Mano" mucho más ancha y bulbosa (AUMENTADO)
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
        gravity: 0.08,      // Gravedad que afecta a las partículas
    },
    // --- Configuración de color dinámico ---
    color: {
        initialHue: 200,    
        saturation: 90,     
        lightness: 80,      
        glowLightness: 50,  
        hueChangeSpeed: 0.1, 
        glowBlur: 8,       // Brillo base (REDUCIDO)
        glowPulseSpeed: 0.08, // Velocidad del pulso de brillo
        glowPulseAmount: 3,   // Amplitud del pulso (REDUCIDO)
        postStrikeGlowBoost: 10, // Aumento de brillo extra tras atacar (REDUCIDO)
        postStrikeGlowDecay: 0.95 // Velocidad a la que se desvanece el brillo extra
    }
    ,
    // --- Nueva configuración para el destello de las pinzas ---
    pincerFlash: {
        count: 5,
        minLife: 10, maxLife: 20, minSpeed: 1, maxSpeed: 2.5,
        sprayAngle: Math.PI * 2, drag: 0.94, gravity: 0.08,
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
        gravity: 0.08,
    },
    // --- Nueva configuración para la animación de deconstrucción ---
    deconstruction: {
        durationFrames: 120,
        spinePart: {
            minDist: 150,
            randDist: 150,
        },
        legPart: {
            minDist: 200,
            randDist: 200,
        },
        pincerPart: {
            minDist: 180,
            randDist: 180,
        }
    }
};