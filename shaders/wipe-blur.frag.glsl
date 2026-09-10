/**
 * [INPUT]: 依赖官网 Wipe 管线的纹理、局部坐标与 uniform。
 * [OUTPUT]: 输出保留原始 LOD、两遍模糊与边缘遮光的帧。
 * [POS]: shaders 的 blur 源码重放；仅做命名隔离，不添加视觉补偿。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

precision highp float;

uniform sampler2D map;
uniform float wipeAmount;
uniform float wipePosition;
uniform vec2 blurBounds;
in vec2 vUv;
out vec4 fragColor;

#define maxBlur 8.0


float w0(float a) {
  return (1.0/6.0)*(a*(a*(-a + 3.0) - 3.0) + 1.0);
}

float w1(float a) {
  return (1.0/6.0)*(a*a*(3.0*a - 6.0) + 4.0);
}

float w2(float a) {
  return (1.0/6.0)*(a*(a*(-3.0*a + 3.0) + 3.0) + 1.0);
}

float w3(float a) {
  return (1.0/6.0)*(a*a*a);
}

float g0(float a) {
  return w0(a) + w1(a);
}

float g1(float a) {
  return w2(a) + w3(a);
}

float h0(float a) {
  return -1.0 + w1(a) / (w0(a) + w1(a));
}

float h1(float a) {
  return 1.0 + w3(a) / (w2(a) + w3(a));
}

vec4 bicubic(sampler2D tex, vec2 uv, vec4 texelSize, vec2 fullSize, float lod) {
	uv = uv*texelSize.zw + 0.5;
	vec2 iuv = floor( uv );
	vec2 fuv = fract( uv );

  float g0x = g0(fuv.x);
  float g1x = g1(fuv.x);
  float h0x = h0(fuv.x);
  float h1x = h1(fuv.x);
  float h0y = h0(fuv.y);
  float h1y = h1(fuv.y);

	vec2 p0 = (vec2(iuv.x + h0x, iuv.y + h0y) - 0.5) * texelSize.xy;
	vec2 p1 = (vec2(iuv.x + h1x, iuv.y + h0y) - 0.5) * texelSize.xy;
	vec2 p2 = (vec2(iuv.x + h0x, iuv.y + h1y) - 0.5) * texelSize.xy;
	vec2 p3 = (vec2(iuv.x + h1x, iuv.y + h1y) - 0.5) * texelSize.xy;
	
  vec2 lodFudge = pow(1.95, lod) / fullSize;
  
  return g0(fuv.y) * (g0x * 
    textureLod(tex, p0, lod)  +
            
    g1x * textureLod(tex, p1, lod)
          ) +
       g1(fuv.y) * (
      g0x * textureLod(tex, p2, lod)  +
            g1x * textureLod(tex, p3, lod));
}

vec4 textureBicubic(sampler2D s, vec2 uv, float lod) {
  vec2 lodSizeFloor = vec2(textureSize(s, int(lod)));
  vec2 lodSizeCeil = vec2(textureSize(s, int(lod + 1.0)));
  vec2 fullSize = vec2(textureSize(s, 0));
  vec4 floorSample = bicubic( s, uv, vec4(1.0 / lodSizeFloor.x, 1.0 / lodSizeFloor.y, lodSizeFloor.x, lodSizeFloor.y), fullSize, floor(lod));
  vec4 ceilSample = bicubic( s, uv, vec4(1.0 / lodSizeCeil.x, 1.0 / lodSizeCeil.y, lodSizeCeil.x, lodSizeCeil.y), fullSize, ceil(lod));
  return mix(floorSample, ceilSample, fract(lod));
}


float remap(float minValue, float maxValue, float value) {
  return (value - minValue) / (maxValue - minValue);
}

void main() {
  float distanceToWipe = distance(vUv.x, wipePosition);
  float blurArea = remap(0.0, 0.75, clamp(remap(blurBounds.x, blurBounds.y, distanceToWipe) * wipeAmount * 2.5, 0.0, 1.0));
  vec3 shade = vec3(smoothstep(1.3, 0.9, blurArea) * smoothstep(1.0, 0.9, distance(vUv.y, 0.5) * 2.0));
  fragColor = textureBicubic(map, vUv, blurArea * maxBlur) * vec4(shade, 1.0);
}
