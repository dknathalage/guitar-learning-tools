import { clamp } from '../math-utils.js';

export function updateTheta(theta, difficulty, ok, lr = 0.04) {
  const alpha = 10;
  const expected = 1 / (1 + Math.exp(-alpha * (theta - difficulty)));
  if (ok) {
    theta += lr * (1 - expected);
  } else {
    theta -= lr * expected;
  }
  return clamp(theta, 0, 1);
}

export function checkPlateau(thetaHistory) {
  if (thetaHistory.length < 5) return false;
  const recent = thetaHistory.slice(-5);
  const thetas = recent.map(h => h.theta);
  const range = Math.max(...thetas) - Math.min(...thetas);
  return range < 0.03;
}

export function adaptiveSigma(totalAttempts, sessionWindow) {
  if (totalAttempts < 10) return 0.12;
  const recent = sessionWindow.slice(-20);
  if (recent.length < 10) return 0.12;
  const acc = recent.filter(r => r.ok).length / recent.length;
  if (acc > 0.90) return 0.15 + (acc - 0.90) * 1.0; // 0.15-0.25
  if (acc < 0.80) return 0.06 + acc * 0.05; // 0.06-0.10
  return 0.12;
}

export function adaptiveOffset(totalAttempts, sessionWindow) {
  if (totalAttempts < 10) return 0.02;
  const recent = sessionWindow.slice(-20);
  if (recent.length < 10) return 0.02;
  const acc = recent.filter(r => r.ok).length / recent.length;
  if (acc > 0.90) return 0.05;
  if (acc < 0.80) return -0.02;
  return 0.02;
}
