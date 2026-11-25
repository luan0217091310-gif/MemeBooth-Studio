// Every threshold used by perception lives here so DebugPanel can tune it live.
export const visionConfig = {
  wasmBase: './mediapipe/wasm',
  gestureModel: './mediapipe/models/gesture_recognizer.task',
  faceModel: './mediapipe/models/face_landmarker.task',
  numHands: 2,
  numFaces: 1,
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.45,
  minTrackingConfidence: 0.45,
  /** Long edge of frames sent to inference. */
  inferenceLongEdge: 480,
  targetFps: 18,
  mobileTargetFps: 12,
  fallbackFps: 12,
  /** If avg inference ms is below this, run both models every tick. */
  bothModelsBudgetMs: 22,
  /** Keep last hand state this long before treating the hand as lost. */
  handLossGraceMs: 320,
  faceLossGraceMs: 500,
  loadTimeoutMs: 10_000,
}

export const smoothingConfig = {
  minCutoff: 1.3,
  beta: 0.015,
  dCutoff: 1.0,
  scoreAlpha: 0.45,
}

export const gestureConfig = {
  /** tip-to-wrist / pip-to-wrist ratio: below = curled, above = extended. */
  fingerRatio: { curled: 1.0, extended: 1.25 },
  pinchEnter: 0.25,
  pinchExit: 0.35,
  activeScore: 0.58,
}

export const faceConfig = {
  alpha: 0.45,
  winkDiff: 0.35,
  winkOther: 0.35,
  mouthOpen: { enter: 0.48, exit: 0.34 },
  smile: { enter: 0.48, exit: 0.34 },
  pucker: { enter: 0.45, exit: 0.32 },
  browUp: { enter: 0.42, exit: 0.28 },
  cheekPuff: { enter: 0.4, exit: 0.26 },
  /** Max fingertip distance (in hand sizes) to count as touching. */
  heartTouch: 0.62,
}

export const drawConfig = {
  penDownMs: 120,
  penUpMs: 60,
  grabMs: 60,
  eraseMs: 100,
  pauseMs: 600,
  clearMs: 2000,
  /** Points closer than this (display units) to the previous are dropped. */
  minPointDist: 0.003,
  penEmaAlpha: 0.45,
  /** PINCH grabs items within this distance (fraction of stage width). */
  grabRadius: 0.06,
  eraserRadius: 0.035,
  undoLimit: 60,
  clearUndoToastMs: 5000,
}

export type VisionConfig = typeof visionConfig
