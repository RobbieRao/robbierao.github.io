import * as THREE from '/assets/vendor/three-0.185.0/three.module.min.js';

// FullHeadB UV crop (160, 128) through (864, 736), at its native 1024 pixels.
// RG: tangent slopes. B: roughness. A: short-range indirect visibility.
const surfaceUV = new THREE.Vector4(160 / 1024,128 / 1024,704 / 1024,608 / 1024);

export async function loadFaceSurface(record, baseURL, signal) {
  const url = new URL(record.surface || `surface/${record.id}.png`,baseURL);
  const response = await fetch(url,{signal});
  if (!response.ok) throw new Error(`Face surface ${response.status} for ${record.id}`);
  const image = await createImageBitmap(await response.blob(),{
    colorSpaceConversion:'none',premultiplyAlpha:'none',imageOrientation:'none'
  });
  if (signal?.aborted) {
    image.close();
    signal.throwIfAborted();
  }
  const texture = new THREE.Texture(image);
  texture.name = `${record.id} surface`;
  texture.flipY = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.addEventListener('dispose',() => image.close());
  texture.needsUpdate = true;
  return texture;
}

export function applyFaceSurface(shader,texture) {
  // Scatter the diffuse lobe on the smoother dermal surface. The oily
  // surface reflection still sees the sharp, individual relief. Red light
  // travels further across a terminator than green or blue light does.
  // Normalize the wrapped cosine per channel to keep a frontal patch from
  // brightening as light is redistributed into the transition.
  shader.fragmentShader = shader.fragmentShader.replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>
    vec3 dermalNormal;
    void directSkinLight(const in IncidentLight light, const in vec3 position,
      const in vec3 surfaceNormal, const in vec3 viewDir, const in vec3 clearcoatNormal,
      const in PhysicalMaterial skin, inout ReflectedLight reflected) {
      RE_Direct_Physical(light, position, surfaceNormal, viewDir, clearcoatNormal, skin, reflected);
      float ndl=dot(dermalNormal,light.direction);
      vec3 width=vec3(.21,.14,.10);
      vec3 diffusion=max(vec3(ndl)+width,0.)/((1.+width)*(1.+width));
      float sharp=max(dot(surfaceNormal,light.direction),0.);
      reflected.directDiffuse+=.55*light.color*BRDF_Lambert(skin.diffuseContribution)*(diffusion-sharp);
    }
    #undef RE_Direct
    #define RE_Direct directSkinLight
  `).replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
    dermalNormal=normal;
  `);
  if (!texture) return;
  shader.uniforms.faceSurface = {value:texture};
  shader.uniforms.faceSurfaceUV = {value:surfaceUV};
  // vMapUv comes from the bound donor albedo. The same fragment footprint
  // selects the microrelief mip; sub-pixel furrows integrate to a smooth
  // response instead of sparkling. Derivatives use the animated positions.
  shader.fragmentShader = 'uniform sampler2D faceSurface; uniform vec4 faceSurfaceUV;\n' +
    shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      vec2 skinCoords=(vMapUv-faceSurfaceUV.xy)/faceSurfaceUV.zw;
      vec4 skinSample=texture2D(faceSurface,skinCoords);
      float inStudyUV=step(0.,skinCoords.x)*step(0.,skinCoords.y)*
        step(skinCoords.x,1.)*step(skinCoords.y,1.);
      // Recover a narrow band of the actual donor pigmentation lost to
      // minification. Clamp the gain in the dark openings and eyebrow hair.
      vec3 luma=vec3(.2126,.7152,.0722);
      float pigment=dot(diffuseColor.rgb,luma);
      float adjacent=dot(texture2D(map,vMapUv,2.4).rgb,luma);
      float relief=clamp(log((.055+pigment)/(.055+adjacent)),-.09,.09);
      diffuseColor.rgb*=exp(.72*relief*inStudyUV*smoothstep(.045,.16,pigment));
    `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec3 pX=dFdx(-vViewPosition), pY=dFdy(-vViewPosition);
      vec2 uvX=dFdx(vMapUv), uvY=dFdy(vMapUv);
      vec3 pxPerp=cross(pY,normal), pyPerp=cross(normal,pX);
      vec3 skinT=pxPerp*uvX.x+pyPerp*uvY.x, skinB=pxPerp*uvX.y+pyPerp*uvY.y;
      float metric=max(dot(skinT,skinT),dot(skinB,skinB));
      vec2 slopes=(skinSample.rg-vec2(128./255.))*2.*inStudyUV;
      normal=normalize(normal+(skinT*slopes.x+skinB*slopes.y)*inversesqrt(max(metric,1.e-16)));
      dermalNormal=normalize(mix(dermalNormal,normal,.72));
    `).replace('#include <lights_physical_fragment>',`
      roughnessFactor=mix(roughnessFactor,skinSample.b,inStudyUV);
      // The oilier nose and vermilion return a narrower moving highlight.
      roughnessFactor-=.065*(1.-smoothstep(.48,.66,roughnessFactor))*inStudyUV;
      #include <lights_physical_fragment>
    `).replace('#include <aomap_fragment>',`#include <aomap_fragment>
      float visibility=mix(1.,skinSample.a,inStudyUV);
      reflectedLight.indirectDiffuse*=visibility;
      reflectedLight.indirectSpecular*=mix(1.,visibility,.65);
    `);
}
