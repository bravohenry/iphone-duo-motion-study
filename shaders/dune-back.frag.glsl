
uniform sampler2D uColorRampLutTexture;
uniform sampler2D uWallpaperTexture;

varying vec2 vUv;
varying vec3 vGenerated;
varying vec3 vNormal;
varying mat3 vDuneNormalRot;

void main() {
  vec3 uvw = vec3(vUv, 0.0);

  vec3 vectorMathVector = uvw * vec3(1.8879798650741577, 9.966777801513672, 1.0) + vec3(-0.534298300743103, -4.122923374176025, 0.0);
  vec3 geometryNormal = normalize(normalize(vNormal) + vec3(whiteNoise(vGenerated.xy * 100.0) * 0.1));
  vec3 mappingVector = vDuneNormalRot * geometryNormal;

  vec4 mix001Result;
  vec4 mix008Result;
  {
    vec4 imageTexture002Color = texture2D(uWallpaperTexture, flipY(castToFloat2(vectorMathVector)));
    vec4 colorRamp001Color = colorRampTexture(uColorRampLutTexture, 0.0, COLOR_RAMP_LUT_HEIGHT, castToFloat(imageTexture002Color));
    vec4 mix009Result = mixHue(1.0, colorRamp001Color, vec4(0.025186864659190178, 0.035601332783699036, 0.0382043793797493, 1.0));
    ADJUST_AOD_TINT(mix009Result, WALLPAPER_TINT);
    vec4 mix003Result = mixBlend(uDimmingAmount, mix009Result, imageTexture002Color);
    vec4 hueSaturationValue001Color = hueSat(0.5, 1.149999976158142, 1.0700000524520874, 1.0, mix003Result);
    mix001Result = mixBlend(uUnlockProgress, mix003Result, hueSaturationValue001Color);
    mix008Result = colorRampTexture(uColorRampLutTexture, 3.0, COLOR_RAMP_LUT_HEIGHT, castToFloat(mappingVector));
  }

  vec4 outColor = mixAdd(uDimmingAmount, mix001Result, mix008Result * DUNE_LIGHTING_INTENSITY);
  outColor = finalColorAdjustment(outColor);
  ADJUST_DUNE_GAMMA;

  gl_FragColor = vec4(outColor.rgb, UI_MATTE_PASS);
}
