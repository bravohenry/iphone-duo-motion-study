/**
 * [INPUT]: 依赖锁屏合成纹理；数值来自 Apple FramePass（QMo/ajkYoIsS74YAN6Q/）。
 * [OUTPUT]: 输出 0.9 framing、110 像素圆角和黑色外围，供后续两遍 BlurPass 采样。
 * [POS]: shaders 的 framing 阶段；必须位于 UI 合成之后、模糊之前。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
precision highp float;
uniform sampler2D map;
in vec2 vUv;
out vec4 fragColor;

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
  vec2 uv = (vUv - 0.5) / 0.9 + 0.5;
  vec2 imgSize = vec2(textureSize(map, 0));
  vec2 aspect = vec2(imgSize.x / imgSize.y, 1.0);
  float maxBounds = min(imgSize.x, imgSize.y);
  float corners = 110.0 / maxBounds;
  if (imgSize.x < imgSize.y && uv.x < 0.5) corners = 0.0;
  vec2 center = vec2(0.5) * aspect;
  float area = sdRoundedBox(uv * aspect - center, center, corners);
  vec3 color = texture(map, uv).rgb * smoothstep(0.0, 2.0 / maxBounds, -area);
  // SOURCE: MeshBasicMaterial 的 opaque FramePass 输出 alpha=1，不继承壁纸 UI matte。
  fragColor = vec4(color, 1.0);
}
