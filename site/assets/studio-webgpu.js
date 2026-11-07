import {STUDIO_RENDER as S, makeStudioCellAtlas} from './studio-renderer.js?v=8046debd6605';

/** GPU resources are retained when only scene geometry or object counts change. */
export async function createStudioGPU(canvas, {scene, atlas, onLost = () => {}}) {
  const adapter = await navigator.gpu?.requestAdapter({powerPreference: 'low-power'});
  if (!adapter) throw new Error('adapter-unavailable');
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) { device.destroy(); throw new Error('context-unavailable'); }
  let disposed = false, failed = false, depth = null, points = null, transforms = null, uniform = null, texture = null;
  let pointCapacity = 0, transformCapacity = 0, pointCount = 0, objectCount = 0, group = null;
  let width = 1, height = 1, cellWidth = 2.2, cellHeight = 3.1, scale = 1;
  let atlasView = null, glyphWidth = 0, glyphHeight = 0, glyphStride = 0, glyphPadding = 1;
  const fail = reason => { if (disposed || failed) return; failed = true; onLost(reason); };
  const onError = event => { event.preventDefault(); fail('gpu-validation-error'); };
  device.addEventListener('uncapturederror', onError);
  device.lost.then(() => { if (!disposed) fail('gpu-device-lost'); }).catch(() => fail('gpu-device-lost'));

  function destroy() {
    if (disposed) return;
    disposed = true; device.removeEventListener('uncapturederror', onError);
    depth?.destroy(); points?.destroy(); transforms?.destroy(); uniform?.destroy(); texture?.destroy();
    try { context.unconfigure(); } catch { /* Context may already be lost. */ }
    device.destroy();
  }

  try {
    const format = navigator.gpu.getPreferredCanvasFormat();
    const module = device.createShaderModule({label: 'Studio ASCII object surfaces', code: /* wgsl */`
      struct View { viewport: vec4f, cell: vec4f, clip: vec4f, glyph: vec4f }
      // 64 + 16 + 16 bytes: the controller's 24-float record, column-major.
      struct ObjectPose { model: mat4x4f, tint: vec4f, extra: vec4f }
      @group(0) @binding(0) var<uniform> view: View;
      @group(0) @binding(1) var<storage, read> poses: array<ObjectPose>;
      @group(0) @binding(2) var atlas: texture_2d<f32>;
      @group(0) @binding(3) var glyphSampler: sampler;
      struct Output {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
        @location(1) color: vec4f,
      }
      @vertex fn vertexMain(
        @builtin(vertex_index) vertex: u32,
        @location(0) local: vec3f,
        @location(1) localNormal: vec3f,
        @location(2) objectIndex: f32
      ) -> Output {
        let object = u32(objectIndex);
        var output: Output;
        output.position = vec4f(2.0, 2.0, 2.0, 1.0);
        output.uv = vec2f(0.0); output.color = vec4f(0.0);
        if (object >= u32(view.clip.y)) { return output; }
        let pose = poses[object];
        let p = (pose.model * vec4f(local, 1.0)).xyz;
        let normal = (pose.model * vec4f(localNormal, 0.0)).xyz;
        let n = normal / max(length(normal), 0.00001);
        let distance = view.cell.z - p.z;
        if (distance <= view.cell.w || distance >= view.clip.x || pose.tint.a <= 0.001) { return output; }
        let towardsEye = normalize(vec3f(-p.x, -p.y, distance));
        if (dot(n, towardsEye) < -0.02) { return output; }
        let perspective = view.cell.z / distance;
        let screen = vec2f(view.viewport.x * 0.5 + p.x * perspective * view.viewport.z,
                          view.viewport.y * 0.49 - p.y * perspective * view.viewport.z);
        let cell = floor(screen / view.cell.xy);
        if (any(cell < vec2f(0.0)) || any(cell >= ceil(view.viewport.xy / view.cell.xy))) { return output; }
        let corners = array<vec2f, 6>(vec2f(0, 0), vec2f(1, 0), vec2f(0, 1), vec2f(0, 1), vec2f(1, 0), vec2f(1, 1));
        let corner = corners[vertex];
        let pixel = (cell + corner) * view.cell.xy;
        let light = vec3f(${S.lightX}, ${S.lightY}, ${S.lightZ});
        let halfway = normalize(light + towardsEye);
        let brightness = clamp(${S.ambient} + ${S.diffuse} * max(0.0, dot(n, light))
          + ${S.specular} * pow(max(0.0, dot(n, halfway)), ${S.shininess}.0), 0.0, 1.0);
        let shade = round(brightness * ${S.shades - 1}.0) / ${S.shades - 1}.0;
        let variation = f32(((i32(cell.x) * 73 + i32(cell.y) * 151 + i32(cell.x * cell.y) * 3) % 17) % 3 - 1);
        let glyph = clamp(3.0 + floor((1.0 - shade) * 6.0) + variation, 3.0, ${S.glyphs.length - 1}.0);
        let cut = pose.extra.x == 1.0 && abs(local.x) < 0.001 && abs(localNormal.x) > 0.99;
        let surfaceTint = select(pose.tint.rgb, vec3f(0.98, 0.16, 0.075), cut);
        // Snap the tint to the same 8-bit channels as the bounded CPU atlas cache.
        let tint = round(clamp(surfaceTint, vec3f(0.0), vec3f(1.0)) * 255.0) / 255.0;
        let color = round(tint * (0.34 + 0.66 * shade) * 255.0) / 255.0;
        output.position = vec4f(pixel.x / view.viewport.x * 2.0 - 1.0,
          1.0 - pixel.y / view.viewport.y * 2.0, (distance - view.cell.w) / (view.clip.x - view.cell.w), 1.0);
        // Map only this glyph's interior; the gutter isolates bilinear footprints.
        let atlasSize = vec2f(view.glyph.z * ${S.glyphs.length}.0, view.glyph.y + view.glyph.w * 2.0);
        output.uv = (vec2f(glyph * view.glyph.z + view.glyph.w, view.glyph.w) + corner * view.glyph.xy) / atlasSize;
        output.color = vec4f(color, clamp(pose.tint.a, 0.0, 1.0));
        return output;
      }
      @fragment fn fragmentMain(input: Output) -> @location(0) vec4f {
        let glyphAlpha = textureSample(atlas, glyphSampler, input.uv).a;
        let alpha = glyphAlpha * input.color.a;
        // Replace the whole nearest cell, including its transparent glyph gaps.
        // No blending/alpha discard: repeated coplanar samples cannot darken it.
        return vec4f(input.color.rgb * alpha, alpha);
      }
    `});
    const compilation = await module.getCompilationInfo();
    if (compilation.messages.some(message => message.type === 'error')) throw new Error('shader-compilation-failed');

    const layout = device.createBindGroupLayout({entries: [
      {binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {type: 'uniform', minBindingSize: 64}},
      {binding: 1, visibility: GPUShaderStage.VERTEX, buffer: {type: 'read-only-storage', minBindingSize: 96}},
      {binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: {sampleType: 'float'}},
      {binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: {type: 'filtering'}},
    ]});
    const pipelineLayout = device.createPipelineLayout({bindGroupLayouts: [layout]});
    const vertex = {module, entryPoint: 'vertexMain', buffers: [{arrayStride: 28, stepMode: 'instance', attributes: [
      {shaderLocation: 0, offset: 0, format: 'float32x3'},
      {shaderLocation: 1, offset: 12, format: 'float32x3'},
      {shaderLocation: 2, offset: 24, format: 'float32'},
    ]}]};
    const [depthPipeline, inkPipeline] = await Promise.all([
      device.createRenderPipelineAsync({label: 'Studio whole-cell occlusion', layout: pipelineLayout, vertex,
        primitive: {topology: 'triangle-list'}, depthStencil: {format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less-equal'}}),
      device.createRenderPipelineAsync({label: 'Studio nearest-cell ASCII', layout: pipelineLayout, vertex,
        fragment: {module, entryPoint: 'fragmentMain', targets: [{format}]},
        primitive: {topology: 'triangle-list'}, depthStencil: {format: 'depth32float', depthWriteEnabled: false, depthCompare: 'equal'}}),
    ]);
    uniform = device.createBuffer({size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
    const sampler = device.createSampler({magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge'});
    const values = new Float32Array(16);

    function bindResources() {
      if (!transforms || !atlasView) return;
      group = device.createBindGroup({layout, entries: [
        {binding: 0, resource: {buffer: uniform}}, {binding: 1, resource: {buffer: transforms}},
        {binding: 2, resource: atlasView}, {binding: 3, resource: sampler},
      ]});
    }

    function resizeAtlas(physicalCellWidth, physicalCellHeight) {
      const targetWidth = Math.max(1, Math.round(physicalCellWidth));
      const targetHeight = Math.max(1, Math.round(physicalCellHeight));
      if (texture && targetWidth === glyphWidth && targetHeight === glyphHeight) return;
      const filtered = makeStudioCellAtlas(atlas, targetWidth, targetHeight);
      const oldTexture = texture;
      texture = device.createTexture({label: 'Studio cell-sized glyph coverage', size: [filtered.canvas.width, filtered.canvas.height], format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT});
      device.queue.copyExternalImageToTexture({source: filtered.canvas}, {texture}, [filtered.canvas.width, filtered.canvas.height]);
      atlasView = texture.createView();
      glyphWidth = filtered.glyphWidth; glyphHeight = filtered.glyphHeight;
      glyphStride = filtered.stride; glyphPadding = filtered.padding;
      bindResources(); oldTexture?.destroy();
    }

    function setScene(next) {
      if (disposed || failed) return;
      if (!(next.points instanceof Float32Array) || next.points.length % 7 || !Array.isArray(next.objects)) throw new TypeError('invalid-gpu-scene');
      pointCount = next.points.length / 7; objectCount = next.objects.length;
      const pointBytes = Math.max(28, next.points.byteLength), transformBytes = Math.max(96, objectCount * 96);
      if (pointBytes > device.limits.maxBufferSize || transformBytes > device.limits.maxStorageBufferBindingSize) throw new RangeError('gpu-scene-too-large');
      if (pointBytes > pointCapacity) {
        points?.destroy(); pointCapacity = pointBytes;
        points = device.createBuffer({label: 'Studio local surface samples', size: pointCapacity, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST});
      }
      if (transformBytes > transformCapacity) {
        transforms?.destroy(); transformCapacity = transformBytes;
        transforms = device.createBuffer({label: 'Studio object transforms', size: transformCapacity, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
        bindResources();
      }
      if (next.points.byteLength) device.queue.writeBuffer(points, 0, next.points);
    }

    function resize(w, h, dpr, cw = 2.2, ch = 3.1, worldScale = Math.min(w / 5.4, h / 3)) {
      if (disposed || failed) return;
      width = Math.max(1, w); height = Math.max(1, h); cellWidth = cw; cellHeight = ch; scale = worldScale;
      const maxSize = device.limits.maxTextureDimension2D;
      const physicalWidth = Math.max(1, Math.min(maxSize, Math.round(width * dpr)));
      const physicalHeight = Math.max(1, Math.min(maxSize, Math.round(height * dpr)));
      resizeAtlas(cellWidth * physicalWidth / width, cellHeight * physicalHeight / height);
      if (depth && canvas.width === physicalWidth && canvas.height === physicalHeight) return;
      canvas.width = physicalWidth; canvas.height = physicalHeight;
      depth?.destroy(); depth = device.createTexture({size: [physicalWidth, physicalHeight], format: 'depth32float', usage: GPUTextureUsage.RENDER_ATTACHMENT});
    }

    function render(frame) {
      if (disposed || failed || !depth || !group) return;
      if (!(frame.transforms instanceof Float32Array) || frame.transforms.length !== objectCount * 24) throw new RangeError('invalid-gpu-transforms');
      if (frame.transforms.byteLength) device.queue.writeBuffer(transforms, 0, frame.transforms);
      values[0] = width; values[1] = height; values[2] = scale; values[3] = 0;
      values[4] = cellWidth; values[5] = cellHeight; values[6] = S.focal; values[7] = S.near;
      values[8] = S.far; values[9] = objectCount; values[10] = Number.isFinite(frame.time) ? frame.time : 0; values[11] = 0;
      values[12] = glyphWidth; values[13] = glyphHeight; values[14] = glyphStride; values[15] = glyphPadding;
      device.queue.writeBuffer(uniform, 0, values);
      const encoder = device.createCommandEncoder(), depthView = depth.createView();
      // ASCII is a surface texture. Its holes must not expose rear surfaces.
      const occlusion = encoder.beginRenderPass({colorAttachments: [], depthStencilAttachment: {
        view: depthView, depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store',
      }});
      occlusion.setPipeline(depthPipeline); occlusion.setBindGroup(0, group); occlusion.setVertexBuffer(0, points);
      occlusion.draw(6, pointCount); occlusion.end();
      const ink = encoder.beginRenderPass({colorAttachments: [{view: context.getCurrentTexture().createView(),
        loadOp: 'clear', storeOp: 'store', clearValue: {r: 0, g: 0, b: 0, a: 0}}], depthStencilAttachment: {
        view: depthView, depthLoadOp: 'load', depthStoreOp: 'discard',
      }});
      ink.setPipeline(inkPipeline); ink.setBindGroup(0, group); ink.setVertexBuffer(0, points);
      ink.draw(6, pointCount); ink.end(); device.queue.submit([encoder.finish()]);
    }

    context.configure({device, format, alphaMode: 'premultiplied'});
    setScene(scene);
    if (failed) throw new Error('gpu-device-lost-during-init');
    return {render, resize, setScene, destroy, get failed() { return failed; }};
  } catch (error) { destroy(); throw error; }
}
