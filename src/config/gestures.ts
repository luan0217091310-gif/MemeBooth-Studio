// Every threshold used by perception lives here so DebugPanel can tune it live.
export const visionConfig = {
  wasmBase: './mediapipe/wasm',
  gestureModel: './mediapipe/models/gesture_recognizer.task',
  faceModel: './mediapipe/models/face_landmarker.task',
  numHands: 2,
  numFaces: 1,
  minHandDetectionConfidence: 0.6,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  /** Long edge of frames sent to inference. */
  inferenceLongEdge: 480,
  targetFps: 18,
  mobileTargetFps: 11,
  fallbackFps: 11,
  /** If avg inference ms is below this, run both models every tick. */
  bothModelsBudgetMs: 22,
  /** Keep last hand state this long before treating the hand as lost. */
  handLossGraceMs: 300,
  faceLossGraceMs: 500,
  loadTimeoutMs: 10_000,
}

export const smoothingConfig = {
  minCutoff: 1.0,
  beta: 0.007,
  dCutoff: 1.0,
  scoreAlpha: 0.3,
}

export const gestureConfig = {
  /** tip-to-wrist / pip-to-wrist ratio: below = curled, above = extended. */
  fingerRatio: { curled: 1.0, extended: 1.25 },
  pinchEnter: 0.25,
  pinchExit: 0.35,
  activeScore: 0.6,
}

export const faceConfig = {
  alpha: 0.3,
  winkDiff: 0.45,
  winkOther: 0.3,
  mouthOpen: { enter: 0.65, exit: 0.5 },
  smile: { enter: 0.6, exit: 0.45 },
  pucker: { enter: 0.6, exit: 0.45 },
  browUp: { enter: 0.6, exit: 0.45 },
  cheekPuff: { enter: 0.55, exit: 0.4 },
  /** Max fingertip distance (in hand sizes) to count as touching. */
  heartTouch: 0.5,
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
