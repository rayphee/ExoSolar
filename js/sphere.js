////////////////////////////////////////////////////////////////////////////////
// SOME COMMENTS ABOUT PERFORMANCE
////////////////////////////////////////////////////////////////////////////////
// There are a lot of performance improvements that can be made for this project
// but to keep it simple and easy to read, I've taken the liberty to "expand"
// inline-able functions, create additional variables, have some stylistic
// choices and include some redundancy. Since this is Javascript anyways, most
// of these issues shouldn't  be the crux of why the program is slow; it's the
// language.
////////////////////////////////////////////////////////////////////////////////

/* WEBGL VARIABLES */
var canvas;
var gl;
var gl_frame;
var program;
var vertex_buffer, color_buffer, emissive_buffer, texture_buffer;
var rotation_buffer = Array(4);
var _Pmatrix, _Vmatrix, _Mmatrix, _globalLightPosition, _vertex, _color, _emissive, _rotation, _texture, _sampler;
var vertex_count = 0;

/* MODEL, VIEW, PROJECTION VARIABLES */
//var THETA = 27.25, PHI = 0, RADIUS = 6;
var THETA = 0, PHI = 0, RADIUS = 6;
var projection_matrix;
var view_matrix;
var model_matrix = mat4(1);

/* INTERACTION & ANIMATION VARIABLES */
var INERTIA = 0.93;
var PAN_COEFFICIENT = 3.5;
var SHUFFLE_STEPS = 30;
var drag = false;
var old_x, old_y;
var dX = 0, dY =0;
var locked = false;

const YELLOW = [0.9, 0.85, 0, 1];
const GREEN = [0, 0.7, 0.2, 1];
const ORANGE = [1.0, 0.42, 0, 1];
const RED = [0.9, 0.2, 0.15, 1];
const BLUE = [0.2, 0.55, 0.7, 1];
const WHITE = [0.98, 0.98, 0.98, 1];
var TIME_CONSTANT = 1;
var SCALE_FACTOR = 1;


var vertices = [];
var colors = [];
var emissive = [];
var rotations = [[], [], [], []];
var textures = [];

var t1, t2, t3, t4, t5, t6, t7, t8, t9, t10;

var sun = {sf:[], sv:[]};
var sun_glow = {sf:[], sv:[]};
var mercury = {sf:[], sv:[]};
var venus = {sf:[], sv:[]};
var earth = {sf:[], sv:[]};
var mars = {sf:[], sv:[]};
var jupiter = {sf:[], sv:[]};
var saturn = {sf:[], sv:[]};
var uranus = {sf:[], sv:[]};
var neptune = {sf:[], sv:[]};
var position1 = translate(0, 0, 0);
var position2 = translate(0.6, 0, 0);
var position3 = translate(1.4, 0, 0);
var position4 = translate(2, 0, 0);
var position5 = translate(3, 0, 0);
var position6 = translate(10, 0, 0);
var position7 = translate(18, 0, 0);
var position8 = translate(40, 0, 0);
var position9 = translate(60, 0, 0);

// An additional helper function
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

/* INTERACTIVE FUNCTIONS */

var mouse_down = function(e) {
  drag = true;
  old_x = e.pageX, old_y = e.pageY;
  e.preventDefault();
  return false;
};

var mouse_up = function(e) {
  drag = false;
};

function key_handler(e) {
  switch(e.code) {
    case "KeyY":
      rotate_face("YELLOW", !e.shiftKey);
      break;
    case "KeyW":
      rotate_face("WHITE", !e.shiftKey);
      break;
    case "KeyO":
      rotate_face("ORANGE", !e.shiftKey);
      break;
    case "KeyR":
      rotate_face("RED", !e.shiftKey);
      break;
    case "KeyG":
      rotate_face("GREEN", !e.shiftKey);
      break;
    case "KeyB":
      rotate_face("BLUE", !e.shiftKey);
      break;
  }
}

var mouse_move = function(e) {
  if (!drag) return false;
  dX = (e.pageX-old_x)*2*Math.PI/canvas.width,
  dY = (e.pageY-old_y)*2*Math.PI/canvas.height;
  THETA += PAN_COEFFICIENT*dX;
  PHI += PAN_COEFFICIENT*dY;
  old_x = e.pageX, old_y = e.pageY;
  e.preventDefault();
};

// These functions could have been inlined for better performance, but appears
// as is for readability
function adjust_radius(radius) {
  view_matrix = mat4(
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, -RADIUS],
    [0, 0, 0, 1]
  );
}

function rotate_theta(angle, matrix) {
  return mult(rotateY(angle), matrix);
}

function rotate_phi(angle, matrix) {
  return mult(rotateX(angle), matrix);
}

function orbit_theta(angle, matrix) {
  return mult(rotateY(angle*TIME_CONSTANT), matrix);
}

function orbit_phi(angle, matrix) {
  return mult(rotateX(angle*TIME_CONSTANT), matrix);
}

async function rotate_cube(duration) {
  for(var i=0; i<100; i++) {
    THETA += i/1000;
    await sleep();
  }
  var old_theta = THETA;
  for(var i=0; i<duration; i++) {
    THETA = old_theta;
    await sleep();
  }
}

/* CUBE GENERATION FUNCTIONS */
function gen_sphere(resolution, position, sphere_scale, color, is_emissive, obj) {
  sphere_scale *= SCALE_FACTOR;
  var base = 1;
  var sphere_vertices = [];
  var sphere_faces = [];
  var temp_faces = [];
  var secondary_temp_faces = [];

  sphere_vertices.push(scale(sphere_scale, normalize(vec3(-1, base, 0), 0)));
  sphere_vertices.push(scale(sphere_scale, normalize(vec3(1, base, 0), 0)));
  sphere_vertices.push(scale(sphere_scale, normalize(vec3(-1, -base, 0), 0)));
  sphere_vertices.push(scale(sphere_scale, normalize(vec3(1, -base, 0), 0)));

  sphere_vertices.push(scale(sphere_scale, normalize(vec3(0, -1, base), 0)));
  sphere_vertices.push(scale(sphere_scale, normalize(vec3(0, 1, base), 0)));
  sphere_vertices.push(scale(sphere_scale, normalize(vec3(0, -1, -base), 0)));
  sphere_vertices.push(scale(sphere_scale, normalize(vec3(0, 1, -base), 0)));

  sphere_vertices.push(scale(sphere_scale, normalize(vec3(base, 0, -1), 0)));
  sphere_vertices.push(scale(sphere_scale, normalize(vec3(base, 0, 1), 0)));
  sphere_vertices.push(scale(sphere_scale, normalize(vec3(-base, 0, -1), 0)));
  sphere_vertices.push(scale(sphere_scale, normalize(vec3(-base, 0, 1), 0)));

  temp_faces.push(vec3(0,11,5));
  temp_faces.push(vec3(0,5,1));
  temp_faces.push(vec3(0,1,7));
  temp_faces.push(vec3(0,7,10));
  temp_faces.push(vec3(0,10,11));

  temp_faces.push(vec3(1,5,9));
  temp_faces.push(vec3(5,11,4));
  temp_faces.push(vec3(11,10,2));
  temp_faces.push(vec3(10,7,6));
  temp_faces.push(vec3(7,1,8));

  temp_faces.push(vec3(3,9,4));
  temp_faces.push(vec3(3,4,2));
  temp_faces.push(vec3(3,2,6));
  temp_faces.push(vec3(3,6,8));
  temp_faces.push(vec3(3,8,9));

  temp_faces.push(vec3(4,9,5));
  temp_faces.push(vec3(2,4,11));
  temp_faces.push(vec3(6,2,10));
  temp_faces.push(vec3(8,6,7));
  temp_faces.push(vec3(9,8,1));

  for(var i=0; i<resolution; i++) {
    for(var j=0; j<temp_faces.length; j++) {
      triple = temp_faces[j];
      var a = get_mid_point(triple[0],triple[1], sphere_vertices, sphere_scale);
      var b = get_mid_point(triple[1],triple[2], sphere_vertices, sphere_scale);
      var c = get_mid_point(triple[2],triple[0], sphere_vertices, sphere_scale);

      secondary_temp_faces.push(vec3(triple[0], a, c));
      secondary_temp_faces.push(vec3(triple[1], b, a));
      secondary_temp_faces.push(vec3(triple[2], c, b));
      secondary_temp_faces.push(vec3(a, b, c));
    }
    temp_faces = [];
    for(var k=0; k<secondary_temp_faces.length; k++){
      temp_faces.push(secondary_temp_faces[k]);
    }
  }
  sphere_faces = temp_faces;

  var v = [];
  for(var i=0; i<sphere_vertices.length; i++) {
    vpoint = sphere_vertices[i];
    v.push(mult(position, vec4(vpoint, 1)));
  }
  var a = 0;
  for(var i=0; i<sphere_faces.length; i++) {
    sface = sphere_faces[i];
    gen_triangle(
      v[sface[0]], v[sface[1]], v[sface[2]], mat4(1), color, is_emissive);
    a++;
  }
  for(var i=0; i<sphere_vertices.length; i++){
    obj.sv.push(sphere_vertices[i]);
  }
  for(var i=0; i<sphere_faces.length; i++){
    obj.sf.push(sphere_faces[i]);
  }
}

function regen_sphere(position, color, is_emissive, sphere) {
  var sphere_vertices = sphere.sv;
  var sphere_faces = sphere.sf;
  var v = [];
  for(var i=0; i<sphere_vertices.length; i++) {
    vpoint = sphere_vertices[i];
    v.push(mult(position, vec4(vpoint, 1)));
  }
  var a = 0;
  for(var i=0; i<sphere_faces.length; i++) {
    sface = sphere_faces[i];
    gen_triangle(
      v[sface[0]], v[sface[1]], v[sface[2]], mat4(1), color, is_emissive);
    a++;
  }
}

function get_mid_point(a, b, vertex_array, sphere_scale) {
  var point1 = vertex_array[a];
  var point2 = vertex_array[b];
  var x0 = (point1[0]+point2[0])/2.0;
  var x1 = (point1[1]+point2[1])/2.0;
  var x2 = (point1[2]+point2[2])/2.0;
  var middle = vec3(x0, x1, x2);
  vertex_array.push(scale(sphere_scale, normalize(middle)));
  return (vertex_array.length-1);
}

function gen_triangle(a, b, c, rotation, color, is_emissive){
  vertices.push(a, b, c);
  colors = colors.concat(Array(3).fill(color)); // Could have used push() 3x
  emissive = emissive.concat(Array(3).fill(is_emissive?1.0:0.0));
  rotations[0] = rotations[0].concat(Array(3).fill(rotation[0])); // Same
  rotations[1] = rotations[1].concat(Array(3).fill(rotation[1])); // with
  rotations[2] = rotations[2].concat(Array(3).fill(rotation[2])); // rotation
  rotations[3] = rotations[3].concat(Array(3).fill(rotation[3])); // :)
  textures.push(vec2(b,a));
  textures.push(vec2(a,c));
  textures.push(vec2(c,b));
  vertex_count += 3;
}

function init_textures() {
  t1 = gl.createTexture();
  // t2 = gl.createTexture();
  // t3 = gl.createTexture();
  // t4 = gl.createTexture();
  // t5 = gl.createTexture();
  // t6 = gl.createTexture();
  // t7 = gl.createTexture();
  // t8 = gl.createTexture();
  // t9 = gl.createTexture();
  // t10 = gl.createTexture();
  loadTexture(t1, "../textures/t1.jpg");
  // loadTexture(t2, "../textures/t2.png");
  // loadTexture(t3, "../textures/t3.png");
  // loadTexture(t4, "../textures/t4.png");
  // loadTexture(t5, "../textures/t5.png");
  // loadTexture(t6, "../textures/t6.png");
  // loadTexture(t7, "../textures/t7.png");
  // loadTexture(t8, "../textures/t8.png");
  // loadTexture(t9, "../textures/t9.png");
  // loadTexture(t10, "../textures/t10.png");
}

function loadTexture(texture, url) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 0, 255]);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);
  const image = new Image();
  image.onload = function(){
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
    if(isPowerOf2(image.width) && isPowerOf2(image.height)){
      gl.generateMipmap(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    }
    else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParamteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };
  image.src = url;

  return texture;
}

function isPowerOf2(value) {
  return(value & (value-1)) == 0;
}

function resize(canvas) {
  var displayWidth = canvas.clientWidth;
  var displayHeight = canvas.clientHeight;

  if(canvas.width != displayWidth || canvas.height != displayHeight){
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    projection_matrix = perspective(50, canvas.width/canvas.height, 1, 100);
  }
}
function show_settings() {
  $("#settings_panel").slideToggle();
}

/* INITIAL & RENDER FUNCTIONS */

window.onload = function init() {
  canvas = document.getElementById('glCanvas');
  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) alert("WebGL failed to start");

  canvas.addEventListener("mouseup", mouse_up, false);
  canvas.addEventListener("mouseout", mouse_up, false);
  canvas.addEventListener("mousedown", mouse_down, false);
  canvas.addEventListener("mousemove", mouse_move, false);
  window.addEventListener("wheel", function(e){
    if (0 > e.deltaY) {
      (RADIUS<100)?RADIUS*=1.01:RADIUS=RADIUS;
    }
    else {
      (RADIUS>1)?RADIUS*=0.99:RADIUS=RADIUS;
    }
  }, false );

  document.getElementById("settings").addEventListener("click", show_settings);

  document.onkeypress = key_handler;

  projection_matrix = perspective(50, canvas.width/canvas.height, 1, 100);

  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  gl.enable(gl.DEPTH_TEST);

  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
  gl.clearColor(0, 0, 0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  vertex_buffer = gl.createBuffer();
  color_buffer = gl.createBuffer();
  emissive_buffer = gl.createBuffer();
  texture_buffer = gl.createBuffer();
  rotation_buffer[0] = gl.createBuffer();
  rotation_buffer[1] = gl.createBuffer();
  rotation_buffer[2] = gl.createBuffer();
  rotation_buffer[3] = gl.createBuffer();

  _Pmatrix = gl.getUniformLocation(program, "Pmatrix");
  _Vmatrix = gl.getUniformLocation(program, "Vmatrix");
  _Mmatrix = gl.getUniformLocation(program, "Mmatrix");
  _globalLightPosition = gl.getUniformLocation(program, "globalLightPosition");
  _sampler = gl.getUniformLocation(program, "r");
  _vertex = gl.getAttribLocation(program, "vertex");
  _color = gl.getAttribLocation(program, "color");
  _emissive = gl.getAttribLocation(program, "emissive");
  _rotation = gl.getAttribLocation(program, "rotation");
  _texture = gl.getAttribLocation(program, "texture");

  init_textures();

  gen_sphere(2, position1, 0.5, [1.0, 0.8, 0, 1], true, sun);
  gen_sphere(0, position1, 0.5, [1.0, 0.8, 0, 1], true, sun_glow);
  gen_sphere(0, position2, 0.005, [0.5, 0.5, 0.5, 1], false, mercury);
  gen_sphere(0, position3, 0.015, YELLOW, false, venus);
  gen_sphere(0, position4, 0.015, BLUE, false, earth);
  gen_sphere(0, position5, 0.009, RED, false, mars);
  gen_sphere(1, position6, 0.05, YELLOW, false, jupiter);
  gen_sphere(1, position7, 0.045, YELLOW, false, saturn);
  gen_sphere(1, position8, 0.04, [0, 0.7, 0.5, 1], false, uranus);
  gen_sphere(1, position9, 0.039, BLUE, false, neptune);

  render();
}


function render() {
  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
  resize(gl.canvas);

  INERTIA = document.getElementById("inertia").value;
  TIME_CONSTANT = document.getElementById("time").value;

  THETA *= INERTIA;
  PHI *= INERTIA;

  adjust_radius(RADIUS);
  model_matrix = rotate_theta(THETA, model_matrix);
  model_matrix = rotate_phi(PHI, model_matrix);

  vertices = [];
  colors = [];
  emissive = [];
  textures = [];
  rotations = [[], [], [], []];

  vertex_count = 0;

  position1 = orbit_theta(.1, position1);
  position2 = orbit_theta(4.14, position2);
  position3 = orbit_theta(1.62 , position3);
  position4 = orbit_theta(1, position4);
  position5 = orbit_theta(0.53, position5);
  position6 = orbit_theta(0.08, position6);
  position7 = orbit_theta(0.03, position7);
  position8 = orbit_theta(0.01, position8);
  position9 = orbit_theta(0.006, position9);

  regen_sphere(position1, [1.0, 0.8, 0, 1], true, sun);
  regen_sphere(position1, [1.0, 0.8, 0, 1], true, sun_glow);
  regen_sphere(position2, [0.5, 0.5, 0.5, 1], false, mercury);
  regen_sphere(position3, YELLOW, false, venus);
  regen_sphere(position4, BLUE, false, earth);
  regen_sphere(position5, RED, false, mars);
  regen_sphere(position6, YELLOW, false, jupiter);
  regen_sphere(position7, YELLOW, false, saturn);
  regen_sphere(position8, [0, 0.7, 0.5, 1], false, uranus);
  regen_sphere(position9, BLUE, false, neptune);

  gl.uniformMatrix4fv(_Pmatrix, false, flatten(projection_matrix));
  gl.uniformMatrix4fv(_Vmatrix, false, flatten(view_matrix));
  gl.uniformMatrix4fv(_Mmatrix, false, flatten(model_matrix));
  gl.uniform1i(_sampler, 0);
  gl.uniform3fv(_globalLightPosition, [0, 0, 0]);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
  gl.vertexAttribPointer(_vertex, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(_vertex);

  gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
  gl.vertexAttribPointer(_color, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(_color);

  gl.bindBuffer(gl.ARRAY_BUFFER, emissive_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(emissive), gl.STATIC_DRAW);
  gl.vertexAttribPointer(_emissive, 1, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(_emissive);

  gl.bindBuffer(gl.ARRAY_BUFFER, texture_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(textures), gl.STATIC_DRAW);
  gl.vertexAttribPointer(_texture, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(_texture);

  for(var i=0; i<4; i++) {
    gl.bindBuffer(gl.ARRAY_BUFFER, rotation_buffer[i]);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(rotations[i]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(_rotation+i, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(_rotation+i);
  }

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, t1);

  gl.drawArrays(gl.TRIANGLES, 0, vertex_count);
  gl_frame = window.requestAnimationFrame(render);
}
