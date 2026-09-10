
float lutBasedValueNoise(vec3 inVector, sampler2D hashTexture) {
  vec3 cell = floor(inVector);
  vec3 f = inVector - cell;
  vec3 smoothed = (f * f) * (vec3(3.0) - f * 2.0);
  vec3 slice = vec3(37.0, -17.0, 0.0) * cell.z;
  vec3 hashCoord = ((cell + slice) + smoothed + vec3(0.5, 0.5, 0.0)) / 256.0;
  vec4 texel = texture2D(hashTexture, hashCoord.xy);

  return mix(texel.y, texel.x, clamp(smoothed.z, 0.0, 1.0));
}

float fbm(float inStrength, vec3 inVector, float inFrequency, float inDecay,
          float inAngle, sampler2D hashTexture) {
  float c = cos(inAngle);
  float s = sin(inAngle);
  float t = 1.0 - c;
  mat3 octaveRotation = mat3(vec3(c, -s, 0.0),
                             vec3(s, c, 0.0),
                             vec3(0.0, 0.0, t + c));

  float decay = clamp(inDecay, 0.0, 1.0);
  float strength = inStrength;
  vec3 v = inVector;
  float total = 0.0;

  for (int octave = 0; octave < 4; octave++) {
    float noise = lutBasedValueNoise(v, hashTexture);
    strength = strength * decay;
    total += noise * strength;
    v = (octaveRotation * v) * inFrequency;
  }

  return total;
}
