
uniform sampler2D uColorRampLutTexture;

varying vec2 vUv;
varying vec3 vGenerated;

void main() {
  float math001Value = 1.0 - uDimmingAmount;
  float mathValue = math001Value + COLOR_INDEX;
  vec4 colorRamp001Color = colorRampTexture(uColorRampLutTexture, 0.0, COLOR_RAMP_LUT_HEIGHT, vGenerated.z);
  vec4 colorRamp002Color = colorRampTexture(uColorRampLutTexture, 1.0, COLOR_RAMP_LUT_HEIGHT, vGenerated.z);
  vec4 mix001Result = mixBlend(uDimmingAmount, colorRamp001Color, colorRamp002Color);
  float mapRange001Result = mapRangeLinear(COLOR_INDEX, 0.0, 1.0, 0.4000000059604645, 0.05000000074505806);
  float mapRangeResult = mapRangeLinear(uDimmingAmount, 0.0, 1.0, 0.30000001192092896, 1.0);
  float mix004Result = FOLD_MIX(-0.4000000059604645 + mapRange001Result,
                                -0.3499999940395355 + mapRangeResult * math001Value);
  vec3 combineXYZVector = vec3(-0.5, -0.5, mix004Result);
  vec3 mappingVector = mappingPointT(vec3(vUv, 0.0), combineXYZVector);
  float gradientTextureFactor = texGradientSpherical(mappingVector);
  vec4 colorRampColor = colorRampTexture(uColorRampLutTexture, 2.0, COLOR_RAMP_LUT_HEIGHT, gradientTextureFactor);
  vec4 mixResult = mixMult(1.0, mix001Result, colorRampColor);
  vec4 mix003Result = mixBlend(mathValue, vec4(0.0, 0.0, 0.0, 1.0), mixResult);

  gl_FragColor = vec4(mix003Result.rgb * STARS_INTENSITY, UI_MATTE_PASS);
}
