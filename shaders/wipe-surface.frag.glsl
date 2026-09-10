/**
 * [INPUT]: 依赖官网 Wipe 管线的纹理、局部坐标与 uniform。
 * [OUTPUT]: 按原始平面求交投影采样，保留随折叠变化的透视边界。
 * [POS]: shaders 的 surface 源码重放；仅做命名隔离，不添加视觉补偿。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

vec3 v = normalize(vWipeLocalCameraPosition - vWipeLocalPosition);
vec3 worldNormal = normalize(inverseTransformDirection(normal, viewMatrix));
vec3 n = normalize(vWipeRotationMatrixInverse * worldNormal);

v = clampAngleFromAxis(v, n, radians(maxViewingAngle)); // <-- clamp here

vec3 vRefraction = normalize(refract(-v, n, 1.0));
vec3 vFlat = -n;
vec3 viewDir = normalize(mix(vRefraction, vFlat, 0.0));

// planar
vec3 la = vWipeLocalPosition;
vec3 lb = vWipeLocalPosition + viewDir;
vec4 intersectionResult = planeLineIntersection(vWipeP0, vWipeP1, vWipeP2, la, lb);
vec3 intersectionLocation = intersectionResult.yzw;

float planarU = dot(vWipeP0, -vWipeP1) + dot(intersectionLocation, vWipeP1);
float planarV = dot(vWipeP0, -vWipeP2) + dot(intersectionLocation, vWipeP2);

vec2 lookupBasis = vec2(planarU, planarV);
// end planar

vec2 emissiveMapSize = vec2(textureSize(emissiveMap, 0));
vec2 texSize = emissiveMapSize.x > emissiveMapSize.y ? landscapeSize : portraitSize;
float aspect = texSize.x / texSize.y;
vec2 lookupUv = lookupBasis * (1.0 / wipeScale) * vec2(1.0, aspect) * (1.0 / wipeZoom) * vec2(0.988) + vec2(0.5 + wipeAmount * wipeOffset, 0.5);

vec2 uv = mix(
  (lookupUv - 0.5) * wallpaperUvScale.x + 0.5,
  (vec2(vWipeUv.x, 1.0 - vWipeUv.y) - 0.5) * wallpaperUvScale + 0.5,
  enableFraming ? transitionToCameraRest : 1.0
);

uv = (uv - 0.5) / (enableFraming ? 1.12 : 1.0) + 0.5;

// Shading
float distanceToWipe = distance(vWipeUv.x, wipePosition);
float wipe = 1.0 - clamp(smoothstep(shadeBounds.x, shadeBounds.y, distanceToWipe) * wipeAmount * 1.5, 0.0, 1.0) * (enableFraming ? 1.0 : 0.0);
float edges = smoothstep(1.1, 1.0, uv.x) * smoothstep(-0.1, 0.0, uv.x) *
              smoothstep(1.1, 1.0, uv.y) * smoothstep(-0.1, 0.0, uv.y);

float camera = 1.0;
// Landscape
if (texSize.x > texSize.y) {
  vec2 insideRes = vec2(2853.0, 2007.0);
  float radius = wipeCameraRadius / insideRes.y;
  vec2 pos = (wipeCameraPos / insideRes) * vec2(aspect, 1.0);
  float circle = fill(circleSDF(vWipeUv * vec2(aspect, 1.0) - pos), radius);
  camera = mix(camera, wipeCameraDarkness, circle);
  // Extra inner shadow on the left
  edges = mix(edges, edges * smoothstep(0.05, 0.5, uv.x), smoothstep(0.0, 0.55, wipeAmount));
}


// Composite
float emissiveBrightness = mix(minShading, 1.0, smoothstep(0.1, 1.0, wipeBrightness) * wipe * edges * camera);
totalEmissiveRadiance = texture(emissiveMap, uv).rgb * emissive * emissiveBrightness;
