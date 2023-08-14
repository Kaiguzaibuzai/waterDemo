# waterDemo
A simple water surface demo created using the T3D engine.

water based PBR material

Some small points to note:
1. We utilize the red channel of the texture to store water surface height, the green channel for the rate of change, and the blue and alpha channels for storing normal vectors. And since these values can be negative, we use a texture of float type. And when using a filterType of linear, gl needs to have the corresponding support enabled, such as 'OES_texture_float_linear', 'EXT_color_buffer_float'. (We use WebGL 2.0 and texture half-float type, these extensions will be built-in.)

2. Storing the xz coordinates of the normal vectors and calculating the y coordinate based on normalization can help avoid the need to store all the data in the texture.

3. different engine's plane vertex will be different

TODO :
1. Freely adjust the size and subdivision count of the water surface.
2. caustics
