export const SIM_CONFIG = {
    // --- POSSESSO ORDINARIO / MANOVRA ---
    POSSESSION: {
        BASE_PASSES_MAX: 8,
        BASE_PASSES_MIN: 3,
        PASSES_VERTICALITY_WEIGHT: 4,
        PASS_STRENGTH_FACTOR: 0.5,
        BREAKTHROUGH_BASE: 0.18,
        BREAKTHROUGH_V_WEIGHT: 0.35,
        BREAKTHROUGH_VD_WEIGHT: 0.42, // Aumentato (da 0.20): amplifica il premio d'attacco per chi tiene la linea alta

        BREAKTHROUGH_MIN: 0.10,
        BREAKTHROUGH_MAX: 0.85,

        COUNTER_RISK_V_WEIGHT: 0.11,
        COUNTER_RISK_D_WEIGHT: 0.15, // Aumentato (da 0.07): incrementa lo sbilanciamento di chi perde palla con linea alta
        COUNTER_RISK_D_DEFENDER_WEIGHT: 0.65, // Aumentato (da 0.30): inasprisce la vulnerabilità della difesa alta in campo aperto

        COUNTER_RISK_MULTIPLIER: 1.0,

        DEFAULT_OPEN_PLAY_XG: 0.16,
        HIGH_RECOVERY_DEFENSIVE_LINE_THRESHOLD: 0.60
    },

    // --- CONTROPIEDE ---
    COUNTER_ATTACK: {
        PASSES_MIN: 1,
        PASSES_MAX: 4,
        DEFAULT_COUNTER_XG: 0.16,
        BREAKTHROUGH_BASE: 0.30
    },

    // --- CALCIO D'ANGOLO ---
    CORNER: {
        DEFAULT_CORNER_XG: 0.28,
        PASSES_COUNT: 2,
        ATTACKER_AERIAL_WEIGHT: 0.40,
        CORNER_ATTACK_WEIGHT: 0.60,
        DEFENDER_AERIAL_WEIGHT: 0.40,
        CORNER_DEFENSE_WEIGHT: 0.60,

        SHOT_THRESHOLD: 0.30,
        LOOSE_BALL_THRESHOLD: 0.70
    },

    // --- PALLE CONTESE / SECONDE PALLE ---
    LOOSE_BALL: {
        DEFAULT_REBOUND_XG: 0.20,
        PASSES_COUNT: 2,
        ATTACKER_PRESSING_WEIGHT: 0.60,
        ATTACKER_ATTACK_WEIGHT: 0.40,
        DEFENDER_DEFENSE_WEIGHT: 0.60,
        DEFENDER_PRESSING_WEIGHT: 0.40
    },

    // --- SHOT XG / CONCLUSIONE ---
    SHOT: {
        DEFENDER_WEIGHT_DEFENSE: 0.70,
        DEFENDER_WEIGHT_PRESSING: 0.30,
        STAT_DIVISOR: 100
    },

    // --- SOGLIE ESITI TIRO NON-GOL (CUMULATIVE) ---
    SHOT_OUTCOMES: {
        BLOCKED_THRESHOLD: 0.35,      // <= 0.35: BLOCKED -> LOOSE_BALL
        SAVED_CORNER_THRESHOLD: 0.58, // Mantiene CornersCount > 2.5 e CornerXG > 0.10
        SAVED_REBOUND_THRESHOLD: 0.74,// <= 0.74: SAVED_REBOUND -> LOOSE_BALL
        SAVED_HELD_THRESHOLD: 0.76,   // <= 0.76: SAVED_HELD -> OPPONENT_POSSESSION
        POST_BAR_THRESHOLD: 0.82      // <= 0.82: POST_BAR_REBOUND -> LOOSE_BALL
        // > 0.82: OUT -> OPPONENT_POSSESSION
    }
};