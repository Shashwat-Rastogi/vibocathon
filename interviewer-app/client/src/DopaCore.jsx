import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export default function DopaCore({
  count = 20000,
  speedMult = 1,
  autoSpin = true,
  theme = 'colorful'
}) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // CONFIG
    const COUNT = count;
    const SPEED_MULT = speedMult;
    const AUTO_SPIN = autoSpin;

    // SETUP
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.01);
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 0, 100);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = AUTO_SPIN;
    controls.autoRotateSpeed = 2.0;

    // POST PROCESSING
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.strength = 1.8; bloomPass.radius = 0.4; bloomPass.threshold = 0;
    composer.addPass(bloomPass);

    // SWARM OBJECTS
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const target = new THREE.Vector3();
    const hsl = {};
    
    // INSTANCED MESH
    const geometry = new THREE.TetrahedronGeometry(0.25);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    const instancedMesh = new THREE.InstancedMesh(geometry, material, COUNT);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedMesh);

    // DATA ARRAYS
    const positions = [];
    for(let i=0; i<COUNT; i++) {
        positions.push(new THREE.Vector3((Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100));
        instancedMesh.setColorAt(i, color.setHex(0x00ff88)); // Init Color
    }

    // CONTROL STUBS
    const PARAMS = {"scale":140,"freq":2.2,"amp":11.4,"speed":1.4,"wells":2,"pull":8,"twist":2};
    const addControl = (id, label, min, max, val) => {
        return PARAMS[id] !== undefined ? PARAMS[id] : val;
    };

    // ANIMATION LOOP
    const clock = new THREE.Clock();
    let animationId;
    
    function animate() {
        animationId = requestAnimationFrame(animate);
        const time = clock.getElapsedTime() * SPEED_MULT;
        
        controls.update();

        // SWARM LOGIC
        const countAlias = COUNT;
        for(let i=0; i<COUNT; i++) {
             const scale = addControl("scale", "Fabric Size", 40, 260, 140.0);
             const freq = addControl("freq", "Wave Frequency", 0.5, 6, 2.2);
             const amp = addControl("amp", "Wave Amplitude", 0, 20, 8.0);
             const speed = addControl("speed", "Flow Speed", 0, 4, 1.4);
             const wells = addControl("wells", "Gravity Wells", 0, 4, 2.0);
             const pull = addControl("pull", "Well Strength", 0, 20, 8.0);
             const twist = addControl("twist", "Shear Twist", 0, 6, 2.0);
             
             const t = time * speed;
             const fi = i / (countAlias > 0 ? countAlias : 1);
             
             // map particles onto a continuous 2D fabric (square grid folded via index)
             const u = (Math.sin(i * 12.9898) * 43758.5453) % 1.0;
             const v = (Math.sin(i * 78.233) * 12345.6789) % 1.0;
             
             // center coordinates
             let x = (u * 2.0 - 1.0) * scale;
             let y = (v * 2.0 - 1.0) * scale;
             
             // base wave field (space-time ripples)
             const wave =
             Math.sin(x * 0.02 * freq + t) +
             Math.sin(y * 0.02 * freq - t * 0.8);
             
             let z = wave * amp;
             
             // multiple moving gravity wells (no arrays)
             const w1x = Math.sin(t * 0.3) * scale * 0.4;
             const w1y = Math.cos(t * 0.2) * scale * 0.4;
             
             const w2x = Math.sin(t * 0.5 + 2.0) * scale * 0.3;
             const w2y = Math.cos(t * 0.4 + 1.0) * scale * 0.3;
             
             // distance fields
             const dx1 = x - w1x;
             const dy1 = y - w1y;
             const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1 + 4.0);
             
             const dx2 = x - w2x;
             const dy2 = y - w2y;
             const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2 + 4.0);
             
             // gravitational curvature (fabric bending)
             const bend1 = -pull / d1;
             const bend2 = -pull / d2;
             
             // blend wells
             z += (bend1 + bend2) * (wells > 1.0 ? 1.0 : wells * 0.5);
             
             // shear twist (frame dragging illusion)
             const ang = twist * (bend1 - bend2);
             const cosA = Math.cos(ang);
             const sinA = Math.sin(ang);
             
             const tx = x * cosA - y * sinA;
             const ty = x * sinA + y * cosA;
             
             target.set(tx, ty, z);
             
             // color based on curvature (depth + energy)
             const depth = Math.abs(z) / (amp + 0.001);
             const hue = (0.6 - depth * 0.5 + 0.1 * Math.sin(t)) % 1.0;
             const sat = 0.7 + 0.3 * depth;
             const light = 0.2 + 0.6 * (1.0 - depth);
             
             color.setHSL(hue, sat, light);

             if (theme === 'monochrome') {
               color.getHSL(hsl);
               color.setHSL(0, 0, hsl.l);
             }

             // LERP & UPDATE
             positions[i].lerp(target, 0.1);
             dummy.position.copy(positions[i]);
             dummy.updateMatrix();
             instancedMesh.setMatrixAt(i, dummy.matrix);
             instancedMesh.setColorAt(i, color);
        }
        instancedMesh.instanceMatrix.needsUpdate = true;
        instancedMesh.instanceColor.needsUpdate = true;

        composer.render();
    }
    animate();

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationId);
        renderer.dispose();
        if (mount.contains(renderer.domElement)) {
            mount.removeChild(renderer.domElement);
        }
    };
  }, [count, speedMult, autoSpin, theme]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', background: '#000' }} />;
}
