
#define WALLPAPER_TINT 3.6
#define DEG_TO_RAD 0.01745329251

#define ADJUST_AOD_TINT(c, t) c = clamp(c * t, 0.0, 1.0)

#define FOLD_MIX(f, o) mix(f, o, uFoldProgress)

#define ADJUST_DUNE_GAMMA outColor = pow(outColor, vec4(1.1))

#define HAZE_INTENSITY_FOLDED 0.84375
#define HAZE_INTENSITY_OPEN 0.6
#define HAZE_FREQUENCY_FOLDED 0.015
#define HAZE_FREQUENCY_OPEN 0.002625
#define HAZE_CONTRAST_FOLDED 0.68
#define HAZE_CONTRAST_OPEN 0.45696

#define DUNE_LIGHTING_INTENSITY 1.3125

#define HILLS_WALLPAPER_LOCK_GAMMA FOLD_MIX(1.0, 0.98)

#define STARS_INTENSITY 2.0

#define UI_MATTE_OCCLUDE 1.0
#define UI_MATTE_PASS 0.0

uniform float uFoldProgress;
const float uDimmingAmount = 1.0;
const float uUnlockProgress = 0.0;
const vec3 uGyro = vec3(0.0);

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

const float LUT_HALF_TEXEL = 0.5 / 256.0;

vec2 flipY(vec2 coord) {
  return coord * vec2(1.0, -1.0) + vec2(0.0, 1.0);
}

vec4 finalColorAdjustment(vec4 color) {
  return pow(color, FOLD_MIX(vec4(0.99, 1.0, 0.98, 1.0), vec4(1.01, 1.0, 0.96, 1.0)));
}

vec3 computeGeneratedTextureCoordinates(vec3 position, vec3 texspaceLocation, vec3 texspaceSize) {
  return ((position - texspaceLocation) / texspaceSize) * 0.5 + 0.5;
}

float castToFloat(vec3 v) { return dot(v, LUMA); }
float castToFloat(vec4 v) { return dot(v.rgb, LUMA); }
vec2 castToFloat2(vec3 v) { return v.xy; }
vec4 castToFloat4(float v) { return vec4(v, v, v, 1.0); }

mat3 eulerToMat3(vec3 euler) {
  float cx = cos(euler.x), sx = sin(euler.x);
  float cy = cos(euler.y), sy = sin(euler.y);
  float cz = cos(euler.z), sz = sin(euler.z);

  float sysx = sy * sx;
  float sycx = sy * cx;

  return mat3(vec3(cy * cz, cy * sz, -sy),
              vec3(sysx * cz - cx * sz, sysx * sz + cx * cz, cy * sx),
              vec3(sycx * cz + sx * sz, sycx * sz - sx * cz, cy * cx));
}

vec3 rotateAroundAxis(vec3 p, vec3 axis, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  float t = 1.0 - c;

  float x = axis.x, y = axis.y, z = axis.z;
  float tx = t * x, ty = t * y;
  float sx = s * x, sy = s * y, sz = s * z;
  float txy = tx * y, txz = tx * z, tyz = ty * z;

  mat3 R = mat3(vec3(tx * x + c, txy - sz, txz + sy),
                vec3(txy + sz, ty * y + c, tyz - sx),
                vec3(txz - sy, tyz + sx, t * z * z + c));

  return R * p;
}

vec4 rgbToHsv(vec4 rgb) {
  float cmax = max(rgb.r, max(rgb.g, rgb.b));
  float cmin = min(rgb.r, min(rgb.g, rgb.b));
  float cdelta = cmax - cmin;

  float v = cmax;
  float s = cmax != 0.0 ? cdelta / cmax : 0.0;
  float h = 0.0;

  if (s != 0.0) {
    vec3 c = (vec3(cmax) - rgb.rgb) / cdelta;

    if (rgb.r == cmax) {
      h = c.b - c.g;
    } else if (rgb.g == cmax) {
      h = 2.0 + c.r - c.b;
    } else {
      h = 4.0 + c.g - c.r;
    }

    h /= 6.0;

    if (h < 0.0) {
      h += 1.0;
    }
  }

  return vec4(h, s, v, rgb.a);
}

vec4 hsvToRgb(vec4 hsv) {
  float h = hsv.x;
  float s = hsv.y;
  float v = hsv.z;
  vec3 rgb = vec3(v);

  if (s != 0.0) {
    if (h == 1.0) {
      h = 0.0;
    }

    h *= 6.0;
    float i = floor(h);
    float f = h - i;
    float p = v * (1.0 - s);
    float q = v * (1.0 - (s * f));
    float t = v * (1.0 - (s * (1.0 - f)));

    if (i == 0.0) {
      rgb = vec3(v, t, p);
    } else if (i == 1.0) {
      rgb = vec3(q, v, p);
    } else if (i == 2.0) {
      rgb = vec3(p, v, t);
    } else if (i == 3.0) {
      rgb = vec3(p, q, v);
    } else if (i == 4.0) {
      rgb = vec3(t, p, v);
    } else {
      rgb = vec3(v, p, q);
    }
  }

  return vec4(rgb, hsv.a);
}

vec4 colorRampTexture(sampler2D tex, float rampIdx, float rampHeight, float t) {
  return texture2D(tex, vec2(clamp(t + LUT_HALF_TEXEL, 0.0, 1.0), (rampIdx + 0.5) / rampHeight));
}

float curveFloatTexture(sampler2D tex, float curveIdx, float curveLutHeight, float value) {
  return texture2D(tex, vec2(value + LUT_HALF_TEXEL, (curveIdx + 0.5) / curveLutHeight)).r;
}

vec3 mixVector(float fac, vec3 v1, vec3 v2) {
  return mix(v1, v2, fac);
}

vec4 mixBlend(float fac, vec4 col1, vec4 col2) {
  vec4 outcol = mix(col1, col2, fac);
  outcol.a = col1.a;

  return outcol;
}

vec4 gamma(vec4 col, float g) {
  vec4 outcol;

  outcol.r = col.r > 0.0 ? pow(col.r, g) : col.r;
  outcol.g = col.g > 0.0 ? pow(col.g, g) : col.g;
  outcol.b = col.b > 0.0 ? pow(col.b, g) : col.b;
  outcol.a = col.a;

  return outcol;
}

vec4 hueSat(float hue, float sat, float value, float fac, vec4 col) {
  vec4 hsv = rgbToHsv(col);

  hsv.x = fract(hsv.x + hue + 0.5);
  hsv.y = clamp(hsv.y * sat, 0.0, 1.0);
  hsv.z = hsv.z * value;

  return mix(col, hsvToRgb(hsv), fac);
}

vec4 invert(float fac, vec4 col) {
  return mix(col, vec4(1.0 - col.rgb, col.a), fac);
}

vec4 mixColor(float fac, vec4 col1, vec4 col2) {
  vec4 outcol = col1;
  vec4 hsv2 = rgbToHsv(col2);

  if (hsv2.y != 0.0) {
    vec4 hsv = rgbToHsv(outcol);
    hsv.x = hsv2.x;
    hsv.y = hsv2.y;

    outcol = mix(outcol, hsvToRgb(hsv), fac);
    outcol.a = col1.a;
  }

  return outcol;
}

vec4 mixHue(float fac, vec4 col1, vec4 col2) {
  vec4 outcol = col1;
  vec4 hsv2 = rgbToHsv(col2);

  if (hsv2.y != 0.0) {
    vec4 hsv = rgbToHsv(outcol);
    hsv.x = hsv2.x;

    outcol = mix(outcol, hsvToRgb(hsv), fac);
    outcol.a = col1.a;
  }

  return outcol;
}

float mapRangeLinear(float value, float fromMin, float fromMax, float toMin, float toMax) {
  if (fromMax == fromMin) {
    return 0.0;
  }

  return toMin + ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin);
}

vec4 mixMult(float fac, vec4 col1, vec4 col2) {
  vec4 outcol = fac == 1.0 ? col1 * col2 : mix(col1, col1 * col2, fac);
  outcol.a = col1.a;

  return outcol;
}

vec4 mixAdd(float fac, vec4 col1, vec4 col2) {
  vec4 outcol = fac == 1.0 ? col1 + col2 : mix(col1, col1 + col2, fac);
  outcol.a = col1.a;

  return outcol;
}

vec4 mixSoft(float fac, vec4 col1, vec4 col2) {
  vec4 scr = vec4(1.0) - (vec4(1.0) - col2) * (vec4(1.0) - col1);
  vec4 outcol = mix(col1, ((vec4(1.0) - col1) * col2 * col1 + col1 * scr), fac);
  outcol.a = col1.a;

  return outcol;
}

vec4 brightnessContrast(vec4 col, float brightness, float contrast) {
  float a = 1.0 + contrast;
  float b = brightness - contrast * 0.5;
  vec4 outcol;
  outcol.rgb = max(a * col.rgb + b, 0.0);
  outcol.a = col.a;

  return outcol;
}

vec3 mappingPointT(vec3 v, vec3 location) {
  return v + location;
}

vec3 mappingPointS(vec3 v, vec3 scale) {
  return v * scale;
}

vec3 mappingPointTS(vec3 v, vec3 location, vec3 scale) {
  return (v * scale) + location;
}

vec3 mappingPointTR(vec3 v, vec3 location, vec3 rotation) {
  return (eulerToMat3(rotation) * v) + location;
}

float texGradientSpherical(vec3 p) {
  return clamp(0.999999 - length(p), 0.0, 1.0);
}

float texGradientLinear(vec3 p) {
  return clamp(p.x, 0.0, 1.0);
}

float whiteNoise(vec2 seed) {
  return (fract(seed.x + 12.34567 * fract(100.0 * (abs(seed.x * 0.91) + seed.y + 94.68) * fract((abs(seed.y * 0.41) + 45.46) * fract((abs(seed.y) + 757.21) * fract(seed.y * 0.0171)))))) * 1.0038 - 0.00185;
}
