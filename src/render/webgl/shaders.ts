// WebGL2 shaders for particle rendering
export const PARTICLE_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in float a_type;
in float a_size; // Per-particle size multiplier
in float a_mutationGlow; // Mutation potential glow (0-1)

uniform float u_pointSize;
uniform float u_typeCount;

out float v_type;
out float v_mutationGlow;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  gl_PointSize = u_pointSize * a_size; // Scale by particle size
  v_type = a_type;
  v_mutationGlow = a_mutationGlow;
}
`;

export const PARTICLE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in float v_type;
in float v_mutationGlow;
uniform float u_typeCount;
uniform float u_glow; // G) Glow intensity
uniform vec3 u_palette[16]; // G) Color palette (max 16 types)

out vec4 fragColor;

void main() {
  // Circular point with smooth edge
  vec2 coord = gl_PointCoord - 0.5;
  float dist = length(coord) * 2.0; // normalize to 0-1
  
  if (dist > 1.0) discard;
  
  // Smooth antialiased edge
  float edge = 1.0 - smoothstep(0.9, 1.0, dist);
  
  // Radial gradient (soft center)
  float gradient = 1.0 - (dist * dist * 0.5);
  float alpha = edge * gradient * 0.85;
  
  // Get color from palette
  int typeIndex = int(v_type);
  if (typeIndex < 0 || typeIndex >= 16) typeIndex = 0;
  vec3 color = u_palette[typeIndex];
  
  // Optional glow: brighten center
  if (u_glow > 0.01) {
    float glowFactor = exp(-dist * dist * 3.0);
    color *= (1.0 + glowFactor * u_glow * 0.5);
    alpha += glowFactor * u_glow * 0.1;
  }
  
  // Mutation glow: pulsing white ring when mutating
  if (v_mutationGlow > 0.01) {
    float ringDist = abs(dist - 0.6); // Ring at 60% radius
    float ringIntensity = exp(-ringDist * 15.0) * v_mutationGlow;
    color = mix(color, vec3(1.0, 0.95, 0.8), ringIntensity * 0.7); // Golden glow
    alpha += ringIntensity * 0.3;
  }
  
  fragColor = vec4(color, clamp(alpha, 0.0, 1.0));
}
`;

export const TRAIL_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const TRAIL_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 color = texture(u_texture, uv);
  fragColor = color * 0.95; // Fade
}
`;
