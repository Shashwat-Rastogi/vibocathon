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
  theme = 'monochrome'
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
    const hsl = {}; // Cache for HSL retrieval
    
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
    const PARAMS = {"speed":0.613,"chaos":20,"coreSize":15.21};
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
        const cCount = COUNT;
        for(let i=0; i<COUNT; i++) {
             const speed = addControl("speed", "Integration Velocity", 0.1, 2.0, 0.4);
             const chaos = addControl("chaos", "API Noise", 0.0, 50.0, 20.0);
             const coreSize = addControl("coreSize", "CRM Core Radius", 1.0, 30.0, 10.0);
             
             // 1. Calculate progression towards the core (0.0 = outer edge, 1.0 = core)
             const norm = i / cCount;
             const progress = (norm + time * speed * 0.2) % 1.0; 
             // Accelerate the pull as it gets closer to the center
             const easeProgress = Math.pow(progress, 1.5); 
             
             // 2. Spherical distribution (Fibonacci sphere for even 3D volume)
             const goldenRatio = (1.0 + Math.sqrt(5.0)) / 2.0;
             const theta = 2.0 * Math.PI * i / goldenRatio;
             const phi = Math.acos(1.0 - 2.0 * norm);
             
             // 3. Radius logic: from distance 150 down to coreSize
             const currentRadius = coreSize + (150.0 * (1.0 - easeProgress));
             
             // 4. Noise/Chaos: High on the outside APIs, completely 0 at the stable core
             const instability = Math.pow(1.0 - progress, 2.0); 
             const wobbleX = Math.sin(time * 2.0 + norm * 100.0) * chaos * instability;
             const wobbleY = Math.cos(time * 1.5 + norm * 200.0) * chaos * instability;
             const wobbleZ = Math.sin(time * 3.0 - norm * 300.0) * chaos * instability;
             
             // 5. Position assembly
             const sinPhi = Math.sin(phi);
             const x = (currentRadius * sinPhi * Math.cos(theta)) + wobbleX;
             const y = (currentRadius * sinPhi * Math.sin(theta)) + wobbleY;
             const z = (currentRadius * Math.cos(phi)) + wobbleZ;
             
             target.set(x, y, z);
             
             // 6. Color mapping: Outer = Cool Data Blue (~0.55), Core = High-Energy Purple/Neon (~0.8)
             const hue = 0.55 + (0.25 * progress);
             const saturation = 0.8 + (0.2 * progress);
             
             // Core emits a pulse when data arrives
             const corePulse = (progress > 0.95) ? Math.sin(time * 10.0) * 0.3 : 0.0;
             const lightness = 0.2 + (0.6 * progress) + corePulse;
             
             color.setHSL(hue, saturation, Math.max(0.0, Math.min(1.0, lightness)));

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
