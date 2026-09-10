/**
 * [INPUT]: 依赖 wipe-surface-vertex-vars 的 uniform/varying 与 Three.js 已完成蒙皮的 transformed 顶点。
 * [OUTPUT]: 计算 Apple Wipe 使用的局部屏幕平面、局部相机和无缩放旋转逆矩阵。
 * [POS]: shaders 的设备屏幕 worldpos 替换块，使投影随真实折叠网格与自由视角变化。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
vWipeLocalPosition = transformed;
vWipeUv = uv;

mat3 wipeModelRotation = mat3(modelMatrix);
vec3 wipeModelScale = vec3(
  length(wipeModelRotation[0]),
  length(wipeModelRotation[1]),
  length(wipeModelRotation[2])
);
mat3 wipeRotationMatrix = mat3(
  wipeModelRotation[0] / wipeModelScale.x,
  wipeModelRotation[1] / wipeModelScale.y,
  wipeModelRotation[2] / wipeModelScale.z
);
vWipeRotationMatrixInverse = transpose(wipeRotationMatrix);
vWipeLocalCameraPosition = (modelMatrixInverse * vec4(cameraPosition, 1.0)).xyz;

vec3 wipeUp = vec3(0.0, 1.0, 0.0);
vec3 wipeRight = vec3(1.0, 0.0, 0.0);
vec3 wipeForward = vec3(0.0, 0.0, 1.0);
vWipeP0 = emissiveLocalPos;
vWipeP1 = wipeRotateAxis(wipeRotateAxis(wipeRotateAxis(vec3(1.0, 0.0, 0.0), wipeRight, wipeRotation.x), wipeUp, wipeRotation.y), wipeForward, wipeRotation.z);
vWipeP2 = wipeRotateAxis(wipeRotateAxis(wipeRotateAxis(vec3(0.0, 1.0, 0.0), wipeRight, wipeRotation.x), wipeUp, wipeRotation.y), wipeForward, wipeRotation.z);
