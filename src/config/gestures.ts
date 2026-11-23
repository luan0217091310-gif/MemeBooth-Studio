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

export type VisionConfig = typeof visionConfig
