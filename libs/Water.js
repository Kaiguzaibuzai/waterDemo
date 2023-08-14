import { Mesh, PlaneGeometry, PBRMaterial, ShaderLib, MATERIAL_TYPE } from "t3d";

let water_vert = ShaderLib.pbr_vert;

water_vert = water_vert.replace(`#include <uv_pars_vert>`, `
#define USE_UV1

#if defined(USE_UV1) || defined(USE_UV2)
    uniform mat3 uvTransform;
#endif

#ifdef USE_UV1
    attribute vec2 a_Uv;
    varying vec2 v_Uv;
#endif

#ifdef USE_UV2
    attribute vec2 a_Uv2;
    varying vec2 v_Uv2;
#endif

`)

water_vert = water_vert.replace(`#include <common_vert>`, `
  #include <common_vert>

  uniform sampler2D water;

  varying vec3 pos;

`)

water_vert = water_vert.replace(`#include <pvm_vert>`, `
  
vec4 info = texture2D(water, transformed.xz * 0.5 + 0.5);
transformed.y += info.r;

pos = transformed.xyz;

#include <pvm_vert>

`)

let water_frag = ShaderLib.pbr_frag;

water_frag = water_frag.replace(`#include <uv_pars_frag>`, `

#define USE_UV1

varying vec3 pos;

#ifdef USE_UV1
    varying vec2 v_Uv;
#endif

#ifdef USE_UV2
    varying vec2 v_Uv2;
#endif
`)


water_frag = water_frag.replace(`#include <normal_pars_frag>`, `
uniform sampler2D water;

#ifndef FLAT_SHADED
varying vec3 v_Normal;
#ifdef USE_TANGENT
	varying vec3 v_Tangent;
	varying vec3 v_Bitangent;
#endif
#endif
`)



water_frag = water_frag.replace(`#include <normal_frag>`, `

#ifdef FLAT_SHADED
    vec3 fdx = dFdx(v_modelPos);
    vec3 fdy = dFdy(v_modelPos);
    vec3 N = normalize(cross(fdx, fdy));
#else
	vec2 coord = pos.xz * 0.5 + 0.5;

	vec4 info = texture2D(water, coord);

	for (int i = 0; i < 5; i++) {
		coord += info.ba * 0.005;
		info = texture2D(water, coord);
	}

	vec3 N =  vec3(info.b, sqrt(1.0 - dot(info.ba, info.ba)), info.a);

    #ifdef DOUBLE_SIDED
        N = N * (float(gl_FrontFacing) * 2.0 - 1.0);
    #endif
#endif

#ifdef USE_TBN
	vec3 tangent = normalize(v_Tangent);
	vec3 bitangent = normalize(v_Bitangent);
	#ifdef DOUBLE_SIDED
		tangent = tangent * (float(gl_FrontFacing) * 2.0 - 1.0);
		bitangent = bitangent * (float(gl_FrontFacing) * 2.0 - 1.0);
	#endif
	mat3 tspace = mat3(tangent, bitangent, N);
#endif

// non perturbed normal
vec3 geometryNormal = N;

#ifdef USE_NORMAL_MAP
    vec3 mapN = texture2D(normalMap, v_Uv).rgb * 2.0 - 1.0;
    mapN.xy *= normalScale;
    #ifdef USE_TBN
        N = normalize(tspace * mapN);
    #else
        mapN.xy *= (float(gl_FrontFacing) * 2.0 - 1.0);
        N = normalize(tsn(N, v_modelPos, v_Uv) * mapN);
    #endif
#elif defined(USE_BUMPMAP)
    N = perturbNormalArb(v_modelPos, N, dHdxy_fwd(v_Uv));
#endif

#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = geometryNormal;
#endif

#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D(clearcoatNormalMap, v_Uv).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;

	#ifdef USE_TBN
		clearcoatNormal = normalize(tspace * clearcoatMapN);
	#else
		clearcoatMapN.xy *= (float(gl_FrontFacing) * 2.0 - 1.0);
		clearcoatNormal = normalize(tsn(clearcoatNormal, v_modelPos, v_Uv) * clearcoatMapN);
	#endif
#endif

`)


class Water extends Mesh {

	constructor() {
		const waterGeometry = new PlaneGeometry(2, 2, 100, 100);

		const waterMaterial = new PBRMaterial();

		waterMaterial.type = MATERIAL_TYPE.SHADER;

		waterMaterial.uniforms = {
			water: null,
		};

		waterMaterial.side = 'double';

		waterMaterial.diffuse.setHex(0x0088ff);
		waterMaterial.shaderName = "waterShader";
		waterMaterial.vertexShader = water_vert;
		waterMaterial.fragmentShader = water_frag;
		waterMaterial.metalness = 1.0;
		waterMaterial.roughness = 0.0;
		waterMaterial.transparent = true;
		waterMaterial.opacity = 0.6;

		super(waterGeometry, waterMaterial);
	}

}

export { Water }