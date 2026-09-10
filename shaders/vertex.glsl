

#if OBJECT_INDEX == 3
uniform mat4 uDuneFarMatrix;
#endif
#if OBJECT_INDEX == 4
uniform mat4 uDuneCloseMatrix;
#endif

varying vec2 vUv;

#if OBJECT_INDEX != 0
varying vec3 vGenerated;
#endif
#if OBJECT_INDEX == 3 || OBJECT_INDEX == 4
varying vec3 vNormal;
varying mat3 vDuneNormalRot;
#endif
#if OBJECT_INDEX == 2
varying vec3 vHillsGyroOffset;
#endif

void main() {
  vec3 scenePosition = (modelMatrix * vec4(position, 1.0)).xyz;

  vUv = uv;

  vec3 transformed = scenePosition;

#if OBJECT_INDEX == 1
  float starsRotation = (4.0 * uDimmingAmount + uUnlockProgress + FOLD_MIX(3.0, 0.0)) - 7.0;
  transformed = rotateAroundAxis(transformed, vec3(0.0, 1.0, 0.0), radians(starsRotation));
#endif

#if OBJECT_INDEX == 3
  transformed = (uDuneFarMatrix * vec4(transformed, 1.0)).xyz;
#endif
#if OBJECT_INDEX == 4
  transformed = (uDuneCloseMatrix * vec4(transformed, 1.0)).xyz;
#endif

  gl_Position = projectionMatrix * viewMatrix * vec4(transformed, 1.0);

#if OBJECT_INDEX != 0
  vGenerated = computeGeneratedTextureCoordinates(scenePosition, TEXTURE_SPACE_LOCATION, TEXTURE_SPACE_SIZE);
#endif

#if OBJECT_INDEX == 3 || OBJECT_INDEX == 4
  vNormal = normalize(mat3(modelMatrix) * normal);

  vec2 duneGyroScale = FOLD_MIX(vec2(4.0, 16.0), vec2(1.0, -6.0));
  vec2 duneGyro = uGyro.xy * duneGyroScale;
  float duneYaw = mapRangeLinear(duneGyro.x, 0.007000000216066837, -0.007000000216066837, 294.3999938964844, 385.0) * DEG_TO_RAD;
  float dunePitch = mapRangeLinear(uGyro.y, -0.003000000026077032, 0.003000000026077032, -16.199993133544922, -101.39999389648438) * DEG_TO_RAD;
  vDuneNormalRot = eulerToMat3(vec3(duneYaw, duneYaw, dunePitch));
#endif

#if OBJECT_INDEX == 2
  vec2 hillsGyroScale = FOLD_MIX(vec2(-1.5, -4.875), vec2(-1.5, -5.625));
  vec2 hillsGyro = uGyro.xy * hillsGyroScale;
  float gyroRamp = mapRangeLinear(uFoldProgress, 0.0, 1.0, 4.0, 1.0);
  const float gyroOffsetClamp = 0.004999999888241291;
  float offsetZ = mapRangeLinear(hillsGyro.x * gyroRamp, -0.0027759999502450228, 0.0027759999502450228, gyroOffsetClamp, -gyroOffsetClamp);
  float offsetX = mapRangeLinear(hillsGyro.y * gyroRamp, -0.007199000101536512, 0.007199000101536512, -gyroOffsetClamp, gyroOffsetClamp);
  vHillsGyroOffset = vec3(offsetX, 0.0, offsetZ);
#endif
}
