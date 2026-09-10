
uniform sampler2D uColorRampLutTexture;
uniform sampler2D uCurveFloatLutTexture;
uniform sampler2D uWallpaperTexture;

varying vec2 vUv;
varying vec3 vGenerated;
varying vec3 vNormal;
varying mat3 vDuneNormalRot;

void main() {
  vec3 uvw = vec3(vUv, 0.0);

  vec3 vectorMathVector = uvw * vec3(1.0040160417556763, 1.8879798650741577, 1.0) + vec3(-0.0, -0.09502831846475601, 0.0);
  vec3 mapping001Vector = mappingPointTR(uvw, vec3(0.2799999713897705, 0.0, 0.0), vec3(0.0, 1.3857914209365845, -0.42586031556129456));
  float gradientTextureFactor = texGradientLinear(mapping001Vector);
  vec4 colorRamp004Color = colorRampTexture(uColorRampLutTexture, 0.0, COLOR_RAMP_LUT_HEIGHT, gradientTextureFactor);
  vec3 geometryNormal = normalize(normalize(vNormal) + vec3(whiteNoise(vGenerated.xy * 100.0) * 0.1));
  vec3 mappingVector = vDuneNormalRot * geometryNormal;

  vec4 mix003Result;
  vec4 mix008Result;
  {
    vec4 imageTexture001Color = texture2D(uWallpaperTexture, flipY(castToFloat2(vectorMathVector)));
    vec4 mix014Result = FOLD_MIX(vec4(curveFloatTexture(uCurveFloatLutTexture, 0.0, CURVE_FLOAT_LUT_HEIGHT, imageTexture001Color.r),
                                      curveFloatTexture(uCurveFloatLutTexture, 1.0, CURVE_FLOAT_LUT_HEIGHT, imageTexture001Color.g),
                                      curveFloatTexture(uCurveFloatLutTexture, 2.0, CURVE_FLOAT_LUT_HEIGHT, imageTexture001Color.b),
                                      imageTexture001Color.a),
                                 imageTexture001Color);
    vec4 colorRampColor = colorRampTexture(uColorRampLutTexture, 1.0, COLOR_RAMP_LUT_HEIGHT, castToFloat(mix014Result));
    vec3 mapping002Vector = mappingPointT(vGenerated, vec3(-0.25999999046325684, -0.019999995827674866, -0.25999999046325684));
    vec4 gradientTexture001Color = castToFloat4(texGradientSpherical(mapping002Vector));
    vec4 colorRamp001Color = colorRampTexture(uColorRampLutTexture, 2.0, COLOR_RAMP_LUT_HEIGHT, castToFloat(gradientTexture001Color));
    vec4 mix011Result = mixMult(0.8291666507720947, colorRampColor, colorRamp001Color);
    vec4 mix010Result = mixHue(1.0, mix011Result, vec4(0.025186864659190178, 0.035601332783699036, 0.0382043793797493, 1.0));
    mix010Result = pow(mix010Result, vec4(1.2));
    ADJUST_AOD_TINT(mix010Result, WALLPAPER_TINT);
    vec4 mix004Result = mixBlend(uDimmingAmount, mix010Result, mix014Result);
    vec3 mapping003Vector = mappingPointT(vGenerated, vec3(-0.6399999856948853, -0.4399999976158142, 0.4599999785423279));
    vec4 gradientTexture002Color = castToFloat4(texGradientSpherical(mapping003Vector));
    vec4 colorRamp005Color = colorRampTexture(uColorRampLutTexture, 3.0, COLOR_RAMP_LUT_HEIGHT, castToFloat(gradientTexture002Color));
    float mix004Factor = castToFloat(mix004Result);
    vec4 colorRamp008Color = colorRampTexture(uColorRampLutTexture, 4.0, COLOR_RAMP_LUT_HEIGHT, mix004Factor);
    vec4 colorRamp009Color = colorRampTexture(uColorRampLutTexture, 5.0, COLOR_RAMP_LUT_HEIGHT, mix004Factor);
    vec4 mix009Result = mixBlend(dot(colorRamp005Color.rgb, LUMA), colorRamp008Color, colorRamp009Color);
    mix003Result = mixBlend(uUnlockProgress, mix004Result, mix009Result);
    mix008Result = colorRampTexture(uColorRampLutTexture, 7.0, COLOR_RAMP_LUT_HEIGHT, castToFloat(mappingVector));
  }

  vec4 outColor = mixAdd(uDimmingAmount, mix003Result, mix008Result * DUNE_LIGHTING_INTENSITY);
  outColor = finalColorAdjustment(outColor);
  ADJUST_DUNE_GAMMA;

  gl_FragColor = vec4(outColor.rgb, UI_MATTE_PASS);
}
