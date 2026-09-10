
uniform sampler2D uColorRampLutTexture;
uniform sampler2D uCurveFloatLutTexture;
uniform sampler2D uHashTexture;
uniform sampler2D uWallpaperTexture;

varying vec2 vUv;
varying vec3 vGenerated;
varying vec3 vHillsGyroOffset;

#define HAZE_OFFSET_FOLDED 10.0
#define HAZE_OFFSET_OPEN 5.0

vec4 hazeLook(vec4 base, vec3 mapA, vec3 mapB, float scale,
              float offset, float frequency, float intensity, float contrast) {
  float fbmResult = fbm(1.0, mapA * scale + offset, frequency, 0.6200000047683716, 90.5, uHashTexture);
  vec4 first = mixSoft(contrast, base, invert(1.0, castToFloat4(fbmResult)) * intensity);
  fbmResult = fbm(1.0, mapB * scale + offset, frequency, 0.6200000047683716, 90.5, uHashTexture);

  return mixSoft(contrast, first, castToFloat4(fbmResult * intensity));
}

vec4 hazeCrossFade(vec4 base, vec3 mapA, vec3 mapB, float scale) {
  float t = uFoldProgress;

  if (t >= 1.0) {
    return hazeLook(base, mapA, mapB, scale, HAZE_OFFSET_OPEN, HAZE_FREQUENCY_OPEN,
                    HAZE_INTENSITY_OPEN, HAZE_CONTRAST_OPEN);
  }

  vec4 folded = hazeLook(base, mapA, mapB, scale, HAZE_OFFSET_FOLDED, HAZE_FREQUENCY_FOLDED,
                         HAZE_INTENSITY_FOLDED, HAZE_CONTRAST_FOLDED);

  if (t <= 0.0) {
    return folded;
  }

  vec4 open = hazeLook(base, mapA, mapB, scale, HAZE_OFFSET_OPEN, HAZE_FREQUENCY_OPEN,
                       HAZE_INTENSITY_OPEN, HAZE_CONTRAST_OPEN);

  return mix(folded, open, t);
}

void main() {
  vec3 uvw = vec3(vUv, 0.0);

  vec3 vectorMathVector = uvw * vec3(1.15340256690979, 6.273525714874268, 1.0) + vec3(-0.0784313753247261, -2.707653760910034, 0.0);
  float value022Value = 30.100000381469727;

  vec4 mix001Result;
  {
    vec4 imageTextureColor = texture2D(uWallpaperTexture, flipY(castToFloat2(vectorMathVector)));
    vec4 mix013Result = FOLD_MIX(vec4(curveFloatTexture(uCurveFloatLutTexture, 0.0, CURVE_FLOAT_LUT_HEIGHT, imageTextureColor.r),
                                      curveFloatTexture(uCurveFloatLutTexture, 1.0, CURVE_FLOAT_LUT_HEIGHT, imageTextureColor.g),
                                      curveFloatTexture(uCurveFloatLutTexture, 2.0, CURVE_FLOAT_LUT_HEIGHT, imageTextureColor.b),
                                      imageTextureColor.a),
                                 imageTextureColor);
    vec3 combineXYZ004Vector = vec3(1.2400002479553223, 0.1400003284215927, 0.18000000715255737);
    vec3 mapping001Vector = mappingPointS(vGenerated, combineXYZ004Vector);
    vec3 mappingVector = mappingPointTS(vGenerated, vHillsGyroOffset, combineXYZ004Vector);
    vec4 mix006Result = hazeCrossFade(mix013Result, mapping001Vector, mappingVector, value022Value);
    mix006Result = pow(mix006Result, vec4(HILLS_WALLPAPER_LOCK_GAMMA));
    vec4 mix002Result = mix006Result;
    vec4 colorRampColor = colorRampTexture(uColorRampLutTexture, 2.0, COLOR_RAMP_LUT_HEIGHT, castToFloat(mix002Result));
    vec4 rgbCurves003Color = vec4(curveFloatTexture(uCurveFloatLutTexture, 3.0, CURVE_FLOAT_LUT_HEIGHT, colorRampColor.r),
                                  curveFloatTexture(uCurveFloatLutTexture, 4.0, CURVE_FLOAT_LUT_HEIGHT, colorRampColor.g),
                                  curveFloatTexture(uCurveFloatLutTexture, 5.0, CURVE_FLOAT_LUT_HEIGHT, colorRampColor.b),
                                  colorRampColor.a);
    mix001Result = mixBlend(uUnlockProgress, mix002Result, rgbCurves003Color);
  }

  vec4 outColor = mix001Result;
  outColor = finalColorAdjustment(outColor);

  gl_FragColor = vec4(outColor.rgb, UI_MATTE_OCCLUDE);
}
