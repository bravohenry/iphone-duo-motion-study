/**
 * [INPUT]: 依赖 Three.js 标准材质的 modelMatrix、cameraPosition 与顶点局部坐标。
 * [OUTPUT]: 为 Wipe 平面投影提供局部视线、去缩放旋转矩阵与投影基向量。
 * [POS]: shaders 的设备屏幕顶点注入块，与 wipe-surface.vert.glsl 和片元注入块共同复刻官网 Wipe。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
uniform mat4 modelMatrixInverse;
uniform vec3 emissiveLocalPos;
uniform vec3 wipeRotation;
varying vec3 vWipeLocalPosition;
varying vec3 vWipeLocalCameraPosition;
varying mat3 vWipeRotationMatrixInverse;
varying vec3 vWipeP0;
varying vec3 vWipeP1;
varying vec3 vWipeP2;
varying vec2 vWipeUv;

vec3 wipeRotateAxis(vec3 p, vec3 axis, float angle) {
  return mix(dot(axis, p) * axis, p, cos(angle)) + cross(axis, p) * sin(angle);
}
