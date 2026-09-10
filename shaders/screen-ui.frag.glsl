
precision highp float;

uniform sampler2D wallpaperMap;
uniform sampler2D uiMap;
uniform vec2 wallpaperUvScale;
uniform vec2 uiUvScale;
in vec2 vUv;
out vec4 fragColor;

vec2 flipY(vec2 coord) {
  return coord * vec2(1.0, -1.0) + vec2(0.0, 1.0);
}

void main() {
  vec4 wallpaper = texture(wallpaperMap, (vUv - 0.5) * wallpaperUvScale + 0.5);
  vec4 ui = texture(uiMap, flipY((vUv - 0.5) * uiUvScale + 0.5));
  float coverage = ui.a * (1.0 - clamp(wallpaper.a, 0.0, 1.0));

  fragColor = vec4(mix(wallpaper.rgb, ui.rgb, coverage), wallpaper.a);
}
