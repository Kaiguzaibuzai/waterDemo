import { RenderTarget2D, ShaderPostPass } from 't3d';

const width = 256;
const height = 256;

class WaterSimulation {

	constructor() {
		const rt1 = new RenderTarget2D(width, height);
		rt1.texture.type = 1508;
		rt1.texture.minFilter = rt1.texture.magFilter = 1601;
		rt1.texture.generateMipmaps = false;

		const rt2 = new RenderTarget2D(width, height);
		rt2.texture.type = 1508;
		rt2.texture.minFilter = rt2.texture.magFilter = 1601;
		rt2.texture.generateMipmaps = false;

		this._currentRTT = rt1;
		this._nextRTT = rt2;

		this._dropPass = new ShaderPostPass(dropShader);
		this._normalPass = new ShaderPostPass(normalShader);
		this._updatePass = new ShaderPostPass(updateShader);
	}

	_swapRTT() {
		const temp = this._currentRTT;
		this._currentRTT = this._nextRTT;
		this._nextRTT = temp;
	}

	addDrop(renderer, x, y, radius, strength) {
		this._dropPass.uniforms['center'] = [x, y];
		this._dropPass.uniforms['radius'] = radius;
		this._dropPass.uniforms['strength'] = strength;

		this._dropPass.uniforms['dropTexture'] = this._currentRTT.texture;

		renderer.setRenderTarget(this._nextRTT);

		this._dropPass.render(renderer);
		this._swapRTT();
	}

	updateNormals(renderer) {
		this._normalPass.uniforms.normalTexture = this._currentRTT.texture;

		renderer.setRenderTarget(this._nextRTT);

		this._normalPass.render(renderer);
		this._swapRTT();
	}

	stepSimulation(renderer) {
		this._updatePass.uniforms['flow'] = this._currentRTT.texture;

		renderer.setRenderTarget(this._nextRTT);

		this._updatePass.render(renderer);

		this._swapRTT();
	}

}

const default_vert = `
attribute vec3 a_Position;
attribute vec2 a_Uv;

uniform mat4 u_View;
uniform mat4 u_Model;
uniform mat4 u_Projection;

varying vec2 v_Uv;

void main() {
  v_Uv = a_Uv;
  gl_Position = u_Projection * u_View *u_Model * vec4(a_Position.xyz, 1.0);
}
`;

const update_frag = `

uniform sampler2D flow;
uniform vec2 delta;

varying vec2 v_Uv;

void main() {
  vec4 info = texture2D(flow, v_Uv);
  vec2 dx = vec2(delta.x, 0.0);
  vec2 dy = vec2(0.0, delta.y);

  float average = (
    texture2D(flow, v_Uv - dx).r +
    texture2D(flow, v_Uv - dy).r +
    texture2D(flow, v_Uv + dx).r +
    texture2D(flow, v_Uv + dy).r
  ) * 0.25;

  info.g += (average - info.r) * 2.0;

  info.g *= 0.985;    // 995

  info.r += info.g;

  gl_FragColor = info;
}

`;

const normal_frag = `
uniform sampler2D normalTexture;
uniform vec2 delta;
varying vec2 v_Uv;

void main() {
  vec4 info = texture2D(normalTexture, v_Uv);

  vec3 dx = vec3(delta.x, texture2D(normalTexture, vec2(v_Uv.x + delta.x, v_Uv.y)).r - info.r, 0.0);
  vec3 dy = vec3(0.0, texture2D(normalTexture, vec2(v_Uv.x, v_Uv.y + delta.y)).r - info.r, delta.y);

  info.ba = normalize(cross(dx, dy)).xz;

  gl_FragColor = info;
}

`;

const drop_frag = `

#define PI 3.14159265359

uniform sampler2D dropTexture;
uniform vec2 center;
uniform float radius;
uniform float strength;
varying vec2 v_Uv;

void main() {
  vec4 info = texture2D(dropTexture, v_Uv);

  float drop = max(0.0, 1.0 - length(center * 0.5 + 0.5 - v_Uv) / radius);
  drop = 0.5 - cos(drop * PI) * 0.5;
  info.r += drop * strength;

  gl_FragColor = info;
}
`;

const dropShader = {
	name: 'dropShader',
	defines: {},
	uniforms: {
		center: [0, 0],
		radius: 0,
		strength: 0,
		dropTexture: null,
	},
	vertexShader: default_vert,
	fragmentShader: drop_frag
}

const normalShader = {
	name: 'normalShader',
	defines: {},
	uniforms: {
		delta: [1 / width, 1 / width],
		normalTexture: null,
	},
	vertexShader: default_vert,
	fragmentShader: normal_frag
}

const updateShader = {
	name: 'updateShader',
	defines: {},
	uniforms: {
		delta: [1 / width, 1 / width],
		flow: null,
	},
	vertexShader: default_vert,
	fragmentShader: update_frag
}

export { WaterSimulation }