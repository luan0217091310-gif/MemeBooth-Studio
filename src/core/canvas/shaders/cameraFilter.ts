import type { FilterParams } from '@/types'

export const neutralFilter: FilterParams = {
  brightness: 0,
  contrast: 1,
  saturation: 1,
  tint: [1, 1, 1],
  vignette: 0,
  grain: 0,
  scanline: 0,
  chromaShift: 0,
  bloom: 0,
}

export const vertexSource = `#version 300 es
in vec2 aPos;
uniform vec2 uScale;   // cover scale in clip space
uniform float uMirror; // -1 mirrors horizontally
out vec2 vUv;
void main() {
  vec2 uv = aPos * 0.5 + 0.5;
  vUv = vec2(uMirror < 0.0 ? 1.0 - uv.x : uv.x, 1.0 - uv.y);
  gl_Position = vec4(aPos * uScale, 0.0, 1.0);
}`

// Single shared filter; each vibe is only a set of uniforms.
// uLut is reserved for a future 3D LUT (.cube) texture.
export const fragmentSource = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform vec3 uTint;
uniform float uVignette;
uniform float uGrain;
uniform float uScanline;
uniform float uChroma;
uniform float uBloom;
uniform float uBeauty;
uniform float uTime;
uniform vec2 uResolution;
out vec4 outColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453);
}

void main() {
  vec2 shift = vec2(uChroma * uTexel.x, 0.0);
  vec3 c;
  c.r = texture(uTex, vUv + shift).r;
  c.g = texture(uTex, vUv).g;
  c.b = texture(uTex, vUv - shift).b;
  if (uBeauty > 0.0) {
    // Fast 4-tap studio soft-skin micro-blur + gentle shadow lift + rose warmth.
    vec2 d = uTexel * (1.8 + uBeauty * 1.4);
    vec3 blur = (
      texture(uTex, vUv + vec2( d.x,  d.y)).rgb +
      texture(uTex, vUv + vec2(-d.x,  d.y)).rgb +
      texture(uTex, vUv + vec2( d.x, -d.y)).rgb +
      texture(uTex, vUv + vec2(-d.x, -d.y)).rgb
    ) * 0.25;
    float edge = clamp(1.0 - length(c - blur) * 6.0, 0.0, 1.0);
    c = mix(c, blur, uBeauty * 0.48 * edge);
    c = mix(c, pow(max(c, 0.001), vec3(0.88)), uBeauty * 0.45);
    c *= mix(vec3(1.0), vec3(1.035, 1.005, 1.01), uBeauty);
  }
  if (uBloom > 0.0) {
    // 9-tap (3x3) wide kernel: ~2.8x faster than 5x5 on integrated GPUs.
    vec3 sum = vec3(0.0);
    for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
        vec3 s = texture(uTex, vUv + vec2(float(i), float(j)) * uTexel * 4.5).rgb;
        sum += max(s - 0.7, 0.0);
      }
    }
    c += sum / 9.0 * uBloom * 2.0;
  }
  c += uBrightness;
  c = (c - 0.5) * uContrast + 0.5;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, uSaturation);
  c *= uTint;
  if (uScanline > 0.0) {
    float line = 0.5 + 0.5 * sin(gl_FragCoord.y * 3.14159);
    c *= 1.0 - uScanline * line * 0.35;
  }
  if (uGrain > 0.0) c += (hash(gl_FragCoord.xy) - 0.5) * uGrain;
  if (uVignette > 0.0) {
    vec2 d = gl_FragCoord.xy / uResolution - 0.5;
    c *= 1.0 - uVignette * smoothstep(0.25, 0.75, length(d));
  }
  outColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`

/** CSS filter string approximating the shader for the 2D fallback path. */
export function cssFilter(p: FilterParams, beauty = 0): string {
  const parts = [
    'brightness(' + (1 + p.brightness + beauty * 0.08).toFixed(3) + ')',
    'contrast(' + (p.contrast - beauty * 0.04).toFixed(3) + ')',
    'saturate(' + p.saturation.toFixed(3) + ')',
  ]
  return parts.join(' ')
}
