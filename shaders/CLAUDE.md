# shaders/
> L2 | 父级: ../CLAUDE.md

成员清单

common.glsl: Apple 壁纸各层共享的颜色、LUT 与数学函数。
noise.glsl: 山体层使用的程序化噪声函数。
vertex.glsl: 五层壁纸共享的顶点空间输出。
sky.frag.glsl: 天空渐变与贴图合成。
stars.frag.glsl: 星点加色层。
hills.frag.glsl: 山体纹理、LUT 和噪声合成。
dune-back.frag.glsl: 远景沙丘着色。
dune-front.frag.glsl: 前景沙丘着色。
screen-ui.vert.glsl: 离屏锁屏 UI 合成的全屏平面顶点着色器。
screen-ui.frag.glsl: 以官网 coverage 公式合成动态壁纸与锁屏 UI plate。
screen-frame.frag.glsl: 原始 FramePass 的 0.9 framing 与圆角黑底；在模糊前扩展采样边界。
wipe-blur.vert.glsl: 双通道 Wipe 模糊的全屏平面顶点着色器。
wipe-blur.frag.glsl: 原始 bicubic mip LOD 模糊与遮光，两遍处理 FramePass 的输出。
wipe-surface-vertex-vars.glsl: 注入 MeshPhysicalMaterial 的局部相机与投影基声明。
wipe-surface.vert.glsl: 从蒙皮后的设备屏幕顶点计算 Wipe 局部平面。
wipe-surface-fragment-vars.glsl: 平面求交、视角钳制和相机孔径函数。
wipe-surface.frag.glsl: 原始设备局部平面求交投影；透视边界来自几何与 framing，不使用径向补偿。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
