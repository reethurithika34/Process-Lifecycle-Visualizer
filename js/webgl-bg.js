/**
 * webgl-bg.js
 * ============================================================
 * WebGL standalone background effect responding to mouse moves.
 * ============================================================
 */

(function initWebGLBackground() {
    const canvas = document.createElement('canvas');
    canvas.id = 'webgl-bg-canvas';
    document.body.prepend(canvas);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // update canvas logic on resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if(gl) {
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            f();
        }
    });

    const gl = canvas.getContext('webgl2');
    if (!gl) {
        console.warn('Require WebGL 2.0');
        return;
    }

    const vss = `#version 300 es
    in vec2 p;
    void main() {
      gl_Position = vec4(p, 0.0, 1.0);
    }
    `;

    const fss = `#version 300 es
    precision mediump float;
    out vec4 o;
    uniform vec4 c;
    void main() {
      o = c;
    }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vss);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs));
        return;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fss);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs));
        return;
    }

    const prg = gl.createProgram();
    gl.attachShader(prg, vs);
    gl.attachShader(prg, fs);
    gl.linkProgram(prg);
    if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(prg));
        return;
    }

    gl.detachShader(prg, vs);
    gl.deleteShader(vs);
    gl.detachShader(prg, fs);
    gl.deleteShader(fs);

    const $p = gl.getAttribLocation(prg, 'p');
    const $c = gl.getUniformLocation(prg, 'c');

    const va = gl.createVertexArray();
    gl.bindVertexArray(va);

    const N = 300; // n triangles

    let ps;
    {    
        ps = new Float32Array(2 + N * 2 * 2);
        ps[0] = 0; // clip space center
        ps[1] = 0;
        let j = 2;
        for (let i = 0; i < N; ++i) {
            ps[j++] = Math.random() * 2 - 1; //x 
            ps[j++] = Math.random() * 2 - 1; //y
            ps[j++] = Math.random() * 2 - 1; //x 
            ps[j++] = Math.random() * 2 - 1; //y
        }
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, ps, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray($p);
    gl.vertexAttribPointer(
        $p,
        2, gl.FLOAT, // two 32b-float (8bytes)
        false,
        0, // skip n byte to fetch next
        0  // skip n byte to fetch first
    );

    let idxs; 
    { 
        idxs = new Uint16Array(3 * N);
        let j = 0;
        for (let i = 0; i < N; ++i) {
            idxs[j++] = 0;
            idxs[j++] = 1 + i * 2;
            idxs[j++] = 2 + i * 2;
        }
    }

    const ibuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idxs, gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    //----- render
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    
    // Match the dark background from the CSS theme manually (var(--bg-base) is #0a0c10)
    gl.clearColor(10/255, 12/255, 16/255, 1.0);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(prg);
    gl.bindVertexArray(va);

    function f() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform4fv($c, [0.0, 0.9, 0.75, 0.015]); // Slightly cyan/greenish glow mapping to original theme but very transparent
        gl.drawElements(
            gl.TRIANGLES,
            idxs.length, // n indices
            gl.UNSIGNED_SHORT, // ui16
            0 // skip n bytes to fetch first
        );
    }
    f();

    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    document.body.addEventListener('mousemove', (e) => {
        ps[0] = e.clientX / window.innerWidth * 2 - 1;
        ps[1] = -1 * (e.clientY / window.innerHeight * 2 - 1);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, ps.slice(0, 2));
        f();
    });
})();
