import type { FilterParams } from '@/types'
import {
  cssFilter,
  fragmentSource,
  neutralFilter,
  vertexSource,
} from '../shaders/cameraFilter'
import type { Viewport } from '../viewport'

export type CameraRenderer = 'webgl2' | 'canvas2d'

type Uniforms = Record<
  | 'uScale'
  | 'uMirror'
  | 'uTex'
  | 'uTexel'
  | 'uBrightness'
  | 'uContrast'
  | 'uSaturation'
  | 'uTint'
  | 'uVignette'
  | 'uGrain'
  | 'uScanline'
  | 'uChroma'
  | 'uBloom'
  | 'uBeauty'
  | 'uTime'
  | 'uResolution',
  WebGLUniformLocation | null
>

/**
 * Layer 0: the only layer allowed to mirror. Draws the camera (or a
 * placeholder backdrop when there is no camera) with the vibe filter.
 */
export class CameraLayer {
  readonly renderer: CameraRenderer
  private gl?: WebGL2RenderingContext
  private ctx?: CanvasRenderingContext2D
  private tex?: WebGLTexture | null
  private u?: Uniforms
  private videoEl: HTMLVideoElement | null = null
  private rvfcHandle = 0
  private rvfcActive = false
  private frameSeq = 0
  private uploadedSeq = -1
  private contextLost = false
  filter: FilterParams = neutralFilter
  mirror = true
  bloomEnabled = true
  beauty = 0.25

  constructor(private canvas: HTMLCanvasElement) {
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault()
      this.contextLost = true
    })
    canvas.addEventListener('webglcontextrestored', () => {
      this.contextLost = false
      if (this.gl) this.setupGl(this.gl)
      this.uploadedSeq = -1
    })
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true, // compositor reads this canvas on capture
    })
    if (gl && this.setupGl(gl)) {
      this.gl = gl
      this.renderer = 'webgl2'
    } else {
      this.ctx = canvas.getContext('2d', { alpha: false }) ?? undefined
      this.renderer = 'canvas2d'
    }
  }

  /**
   * Uses requestVideoFrameCallback (when supported) to detect genuine new
   * MediaStream frames without relying on `video.currentTime` (which stays
   * stuck at 0 on iOS Safari and several Android browsers!).
   */
  private bindVideo(source: HTMLVideoElement): void {
    if (this.videoEl === source) return
    this.unbindVideo()
    this.videoEl = source
    this.rvfcActive = false
    this.frameSeq = 0
    this.uploadedSeq = -1
    const v = source as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number
    }
    if (typeof v.requestVideoFrameCallback === 'function') {
      const onFrame = () => {
        if (this.videoEl !== source) return
        this.rvfcActive = true
        this.frameSeq++
        this.rvfcHandle = v.requestVideoFrameCallback!(onFrame)
      }
      this.rvfcHandle = v.requestVideoFrameCallback(onFrame)
    }
  }

  private unbindVideo(): void {
    const prev = this.videoEl as
      | (HTMLVideoElement & {
          cancelVideoFrameCallback?: (id: number) => void
        })
      | null
    if (prev && this.rvfcHandle && prev.cancelVideoFrameCallback) {
      try {
        prev.cancelVideoFrameCallback(this.rvfcHandle)
      } catch {
        /* ignore */
      }
    }
    this.videoEl = null
    this.rvfcHandle = 0
    this.rvfcActive = false
    this.uploadedSeq = -1
  }

  /** Call when the video stream changes (e.g. front/rear camera switch). */
  resetVideo(): void {
    this.unbindVideo()
  }

  private setupGl(gl: WebGL2RenderingContext): boolean {
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
    }
    const vs = compile(gl.VERTEX_SHADER, vertexSource)
    const fs = compile(gl.FRAGMENT_SHADER, fragmentSource)
    if (!vs || !fs) return false
    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    )
    const loc = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    this.tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const names = [
      'uScale',
      'uMirror',
      'uTex',
      'uTexel',
      'uBrightness',
      'uContrast',
      'uSaturation',
      'uTint',
      'uVignette',
      'uGrain',
      'uScanline',
      'uChroma',
      'uBloom',
      'uBeauty',
      'uTime',
      'uResolution',
    ] as const
    const u = {} as Uniforms
    for (const n of names) u[n] = gl.getUniformLocation(prog, n)
    this.u = u
    gl.uniform1i(u.uTex, 0)
    return true
  }

  resize(width: number, height: number): void {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }
  }

  draw(
    source: HTMLVideoElement | null,
    view: Viewport,
    dpr: number,
    time: number,
  ): void {
    const w = this.canvas.width
    const h = this.canvas.height
    const hasVideo = !!source && source.readyState >= 2 && source.videoWidth > 0
    if (this.gl && this.u && !this.contextLost) {
      const gl = this.gl
      gl.viewport(0, 0, w, h)
      if (!hasVideo) {
        this.unbindVideo()
        gl.clearColor(0.16, 0.12, 0.2, 1)
        gl.clear(gl.COLOR_BUFFER_BIT)
        return
      }
      this.bindVideo(source)
      const u = this.u
      const f = this.filter
      gl.bindTexture(gl.TEXTURE_2D, this.tex!)
      // Only skip texImage2D when requestVideoFrameCallback explicitly confirms
      // no new decoded frame arrived yet; otherwise ALWAYS upload so iOS/Android never freeze.
      const shouldUpload = !this.rvfcActive || this.frameSeq !== this.uploadedSeq
      if (shouldUpload) {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          source,
        )
        this.uploadedSeq = this.frameSeq
      }
      const drawW = view.srcWidth * view.scale * dpr
      const drawH = view.srcHeight * view.scale * dpr
      gl.uniform2f(u.uScale, drawW / w, drawH / h)
      gl.uniform1f(u.uMirror, this.mirror ? -1 : 1)
      gl.uniform2f(u.uTexel, 1 / source.videoWidth, 1 / source.videoHeight)
      gl.uniform1f(u.uBrightness, f.brightness)
      gl.uniform1f(u.uContrast, f.contrast)
      gl.uniform1f(u.uSaturation, f.saturation)
      gl.uniform3f(u.uTint, f.tint[0], f.tint[1], f.tint[2])
      gl.uniform1f(u.uVignette, f.vignette)
      gl.uniform1f(u.uGrain, f.grain)
      gl.uniform1f(u.uScanline, f.scanline)
      gl.uniform1f(u.uChroma, f.chromaShift)
      gl.uniform1f(u.uBloom, this.bloomEnabled ? f.bloom : 0)
      gl.uniform1f(u.uBeauty, this.beauty)
      gl.uniform1f(u.uTime, (time % 10000) / 1000)
      gl.uniform2f(u.uResolution, w, h)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      return
    }
    const ctx = this.ctx
    if (!ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (!hasVideo) {
      ctx.fillStyle = '#291f33'
      ctx.fillRect(0, 0, w, h)
      return
    }
    ctx.filter = cssFilter(this.filter, this.beauty)
    const drawW = view.srcWidth * view.scale * dpr
    const drawH = view.srcHeight * view.scale * dpr
    const x = view.offsetX * dpr
    const y = view.offsetY * dpr
    if (this.mirror) {
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(source, x, y, drawW, drawH)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.filter = 'none'
  }
}
