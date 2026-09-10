
uniform sampler2D uColorRampLutTexture;
uniform sampler2D uWallpaperTexture;

varying vec2 vUv;

void main() {
  vec3 uvw = vec3(vUv, 0.0);

  float mathValue = uDimmingAmount * FOLD_MIX(1.0, 0.0);
  vec3 mix010Result = mixVector(mathValue, vec3(1.0, 1.0, 1.0), vec3(1.0, 2.0, 1.0));
  vec3 mix011Result = mixVector(mathValue, vec3(0.0, 0.0, 0.0), vec3(0.0, -0.5849999785423279, 0.0));
  vec3 vectorMath002Vector = uvw * mix010Result + mix011Result;
  vectorMath002Vector = vectorMath002Vector * vec3(1.0, 2.70027, 1.0) + vec3(1.0, -1.40594, 1.0);

  vec4 mix001Result;
  {
    vec4 colorRampColor = colorRampTexture(uColorRampLutTexture, 0.0, COLOR_RAMP_LUT_HEIGHT, uvw.y);
    vec4 imageTextureColor = texture2D(uWallpaperTexture, flipY(castToFloat2(vectorMath002Vector)));
    ADJUST_AOD_TINT(colorRampColor, WALLPAPER_TINT);
    vec4 mix002Result = mixBlend(uDimmingAmount, colorRampColor, imageTextureColor);
    vec4 mix007Result = FOLD_MIX(
        colorRampTexture(uColorRampLutTexture, 2.0, COLOR_RAMP_LUT_HEIGHT, uvw.y),
        colorRampTexture(uColorRampLutTexture, 1.0, COLOR_RAMP_LUT_HEIGHT, uvw.y));
    mix001Result = mixBlend(uUnlockProgress, mix002Result, mix007Result);
  }

  vec4 outColor = mix001Result;
  outColor = finalColorAdjustment(outColor);

  gl_FragColor = vec4(outColor.rgb, UI_MATTE_PASS);
}
