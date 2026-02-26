/**
 * Kalman filter for pitch tracking.
 * 2D state: [pitch_semi, velocity_semi_per_frame]
 * Constant velocity model with measurement noise derived from YIN confidence.
 */

const A4 = 440;

/** Convert Hz to semitones relative to A4 */
export function hzToSemi(hz) {
  return 12 * Math.log2(hz / A4);
}

/** Convert semitones relative to A4 back to Hz */
export function semiToHz(semi) {
  return A4 * Math.pow(2, semi / 12);
}

/**
 * PitchKalman — 2D Kalman filter for pitch tracking.
 *
 * State: [pitch_semi, velocity_semi_per_frame]
 * F = [[1,1],[0,1]]  (constant velocity)
 * H = [1, 0]         (measure pitch only)
 * Q = [[q_pitch,0],[0,q_velocity]]
 * R = (1 - confidence)^2 * r_scale
 */
export class PitchKalman {
  /**
   * @param {object} opts
   * @param {number} [opts.q_pitch=0.01]
   * @param {number} [opts.q_velocity=0.005]
   * @param {number} [opts.r_scale=4]
   * @param {number} [opts.resetThreshold=12] - semitones; innovation beyond this triggers reset
   * @param {number} [opts.silenceFrames=5]   - null frames before auto-reset
   */
  constructor(opts = {}) {
    this.q_pitch = opts.q_pitch ?? 0.01;
    this.q_velocity = opts.q_velocity ?? 0.005;
    this.r_scale = opts.r_scale ?? 4;
    this.resetThreshold = opts.resetThreshold ?? 12;
    this.silenceFrames = opts.silenceFrames ?? 5;

    this._initialized = false;
    this._nullCount = 0;

    // State vector [pitch_semi, velocity]
    this._x = [0, 0];
    // Covariance matrix P (2x2)
    this._P = [
      [1, 0],
      [0, 1],
    ];
  }

  get initialized() {
    return this._initialized;
  }

  get state() {
    return { semi: this._x[0], velocity: this._x[1] };
  }

  /** Predict next state. Returns predicted { semi, velocity }. */
  predict() {
    if (!this._initialized) {
      return { semi: this._x[0], velocity: this._x[1] };
    }

    // x = F * x  →  pitch += velocity, velocity unchanged
    const [p, v] = this._x;
    this._x = [p + v, v];

    // P = F * P * F^T + Q
    const P = this._P;
    const p00 = P[0][0] + P[1][0] + P[0][1] + P[1][1] + this.q_pitch;
    const p01 = P[0][1] + P[1][1];
    const p10 = P[1][0] + P[1][1];
    const p11 = P[1][1] + this.q_velocity;

    this._P = [
      [p00, p01],
      [p10, p11],
    ];

    return { semi: this._x[0], velocity: this._x[1] };
  }

  /**
   * Update (correct) with a measurement.
   * @param {number|null} measuredSemi - pitch in semitones (null = no detection)
   * @param {number} [confidence=0.5] - YIN confidence in [0,1]
   * @returns {{ semi: number, velocity: number, gain: number }}
   */
  update(measuredSemi, confidence = 0.5) {
    // Handle null / silence
    if (measuredSemi == null) {
      this._nullCount++;
      if (this._nullCount >= this.silenceFrames) {
        this.reset();
      }
      return { semi: this._x[0], velocity: this._x[1], gain: 0 };
    }

    this._nullCount = 0;

    // First measurement initializes state directly
    if (!this._initialized) {
      this._x = [measuredSemi, 0];
      this._P = [
        [1, 0],
        [0, 1],
      ];
      this._initialized = true;
      return { semi: measuredSemi, velocity: 0, gain: 1 };
    }

    // Innovation (residual)
    const innovation = measuredSemi - this._x[0]; // H = [1, 0]

    // Discontinuity check
    if (Math.abs(innovation) > this.resetThreshold) {
      this.reset();
      this._x = [measuredSemi, 0];
      this._initialized = true;
      return { semi: measuredSemi, velocity: 0, gain: 1 };
    }

    // Measurement noise from confidence
    const R = Math.pow(1 - confidence, 2) * this.r_scale;

    // Innovation covariance S = H P H^T + R = P[0][0] + R
    const S = this._P[0][0] + R;

    // Kalman gain K = P H^T / S  →  K = [P[0][0]/S, P[1][0]/S]
    const K0 = this._P[0][0] / S;
    const K1 = this._P[1][0] / S;

    // State update x = x + K * innovation
    this._x[0] += K0 * innovation;
    this._x[1] += K1 * innovation;

    // Covariance update P = (I - K H) P
    const P = this._P;
    this._P = [
      [P[0][0] - K0 * P[0][0], P[0][1] - K0 * P[0][1]],
      [P[1][0] - K1 * P[0][0], P[1][1] - K1 * P[0][1]],
    ];

    return { semi: this._x[0], velocity: this._x[1], gain: K0 };
  }

  /** Reset filter state and covariance */
  reset() {
    this._initialized = false;
    this._nullCount = 0;
    this._x = [0, 0];
    this._P = [
      [1, 0],
      [0, 1],
    ];
  }
}

/**
 * Score and rank multi-candidate pitch detections using Kalman prediction.
 *
 * @param {Array<{hz: number, confidence: number}>} candidates
 * @param {{ semi: number }} prediction - from PitchKalman.predict()
 * @returns {{ hz: number, confidence: number, semi: number, score: number } | null}
 */
export function weightCandidates(candidates, prediction) {
  if (!candidates || candidates.length === 0) return null;

  let best = null;
  let bestScore = -Infinity;

  for (const c of candidates) {
    if (c.hz <= 0) continue;

    const semi = hzToSemi(c.hz);
    const predError = Math.abs(semi - prediction.semi);

    // Score: weighted sum — confidence matters most, prediction agreement is a bonus
    // predError penalty decays: 1 / (1 + predError) ranges from 1 (perfect) to ~0 (far)
    const predAgreement = 1 / (1 + predError);
    const score = c.confidence * 0.6 + predAgreement * 0.4;

    if (score > bestScore) {
      bestScore = score;
      best = { hz: c.hz, confidence: c.confidence, semi, score };
    }
  }

  return best;
}
