

import React, { useRef, useState, useEffect } from 'react';
import { TransformSettings, CanvasSettings, SceneObject } from '../types';
import * as THREE from 'three';

interface WorkspaceProps {
  processedForegroundSrc: string | null;
  backgroundSrc: string | null;
  transform: TransformSettings;
  setTransform: (t: TransformSettings) => void;
  backgroundTransform: TransformSettings;
  activeTab: string;
  showBackground: boolean;
  canvasSettings: CanvasSettings;
  onHistorySave: () => void;
  sceneObjects?: SceneObject[];
}

export const Workspace: React.FC<WorkspaceProps> = ({
  processedForegroundSrc,
  backgroundSrc,
  transform,
  setTransform,
  backgroundTransform,
  showBackground,
  canvasSettings,
  onHistorySave,
  sceneObjects = []
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvas3DRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
  const [viewScale, setViewScale] = useState(1);

  // Three.js State
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);

  // Initialize Three.js
  useEffect(() => {
    if (!canvas3DRef.current) return;

    const width = canvasSettings.width;
    const height = canvasSettings.height;

    // Scene
    const newScene = new THREE.Scene();

    // Camera
    const newCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    newCamera.position.z = 10;
    
    // Renderer
    const newRenderer = new THREE.WebGLRenderer({ 
      canvas: canvas3DRef.current, 
      alpha: true, 
      antialias: true 
    });
    newRenderer.setSize(width, height);
    newRenderer.setPixelRatio(window.devicePixelRatio);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    newScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 5, 5);
    newScene.add(dirLight);

    setRenderer(newRenderer);
    setScene(newScene);
    setCamera(newCamera);

    const animate = () => {
      requestAnimationFrame(animate);
      newRenderer.render(newScene, newCamera);
    };
    animate();

    return () => {
      newRenderer.dispose();
    };
  }, []); // Run once on mount to setup

  // Handle Resize of Renderer
  useEffect(() => {
    if (!renderer || !camera) return;
    renderer.setSize(canvasSettings.width, canvasSettings.height);
    camera.aspect = canvasSettings.width / canvasSettings.height;
    camera.updateProjectionMatrix();
  }, [canvasSettings, renderer, camera]);

  // Sync Scene Objects
  useEffect(() => {
    if (!scene) return;

    // Clear meshes (keeping lights)
    // A better way would be diffing, but simple clear/readd works for small scenes
    const meshesToRemove: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshesToRemove.push(child);
      }
    });
    meshesToRemove.forEach(m => scene.remove(m));

    // Add objects
    sceneObjects.forEach(obj => {
      let geometry;
      switch (obj.type) {
        case 'cube': geometry = new THREE.BoxGeometry(1, 1, 1); break;
        case 'sphere': geometry = new THREE.SphereGeometry(0.6, 32, 32); break;
        case 'cone': geometry = new THREE.ConeGeometry(0.6, 1.2, 32); break;
        case 'torus': geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100); break;
        default: geometry = new THREE.BoxGeometry(1, 1, 1);
      }

      const material = new THREE.MeshStandardMaterial({ 
        color: obj.color,
        metalness: 0.1,
        roughness: 0.5 
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
      mesh.rotation.set(
        obj.rotation.x * (Math.PI / 180), 
        obj.rotation.y * (Math.PI / 180), 
        obj.rotation.z * (Math.PI / 180)
      );
      mesh.scale.set(obj.scale.x, obj.scale.y, obj.scale.z);
      
      scene.add(mesh);
    });

  }, [sceneObjects, scene]);

  // Auto-fit logic to scale the workspace preview
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const padding = 64; // px
        const containerW = containerRef.current.clientWidth - padding;
        const containerH = containerRef.current.clientHeight - padding;
        
        const scaleW = containerW / canvasSettings.width;
        const scaleH = containerH / canvasSettings.height;
        
        setViewScale(Math.min(scaleW, scaleH, 1.2)); 
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasSettings]);

  // Unified Pointer Handlers (Mouse, Touch, Pen)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!transform.visible) return;
    
    // Prevent default browser behavior (scrolling, text selection)
    e.preventDefault();
    e.stopPropagation();
    
    // Save history before starting drag
    onHistorySave();

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x: transform.x, y: transform.y });
    
    // Capture the pointer so we keep receiving events even if the pointer moves outside the element
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();

    const dx = (e.clientX - dragStart.x) / viewScale;
    const dy = (e.clientY - dragStart.y) / viewScale;

    setTransform({
      ...transform,
      x: initialPos.x + dx,
      y: initialPos.y + dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-950 relative overflow-hidden flex items-center justify-center p-8 select-none"
    >
      <div
        style={{
            transform: `scale(${viewScale})`,
            transformOrigin: 'center',
            transition: 'transform 0.2s ease-out'
        }}
      >
        {/* Workspace Container / Artboard */}
        <div 
          className="relative bg-black shadow-2xl overflow-hidden border border-slate-800"
          style={{
              width: `${canvasSettings.width}px`,
              height: `${canvasSettings.height}px`,
          }}
        >
          {/* Background Layer with Transforms */}
          {showBackground && backgroundSrc ? (
            <div 
              className="absolute inset-0 w-full h-full overflow-hidden"
              style={{
                opacity: backgroundTransform.opacity,
                transformOrigin: `${backgroundTransform.originX}% ${backgroundTransform.originY}%`,
                transform: `
                  translate(${backgroundTransform.x}px, ${backgroundTransform.y}px) 
                  scale(${backgroundTransform.scale}) 
                  rotate(${backgroundTransform.rotate}deg)
                  skewX(${backgroundTransform.skewX}deg)
                  skewY(${backgroundTransform.skewY}deg)
                  perspective(1000px)
                  rotateX(${backgroundTransform.perspectiveX}deg)
                  rotateY(${backgroundTransform.perspectiveY}deg)
                `
              }}
            >
              <img 
                src={backgroundSrc} 
                alt="Background" 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-700 bg-slate-900">
              {showBackground ? <p className="text-xl font-light">No Background Generated</p> : <p className="text-xl font-light">Background Hidden</p>}
            </div>
          )}

          {/* 3D Scene Layer */}
          <canvas 
            ref={canvas3DRef} 
            className="absolute inset-0 pointer-events-none" 
            style={{ width: '100%', height: '100%' }}
          />

          {/* Foreground Layer (Composited) */}
          {processedForegroundSrc && transform.visible && (
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`absolute cursor-move touch-none ${isDragging ? 'opacity-80 ring-2 ring-cyan-500/50' : ''} transition-all`}
              style={{
                opacity: transform.opacity,
                transformOrigin: `${transform.originX}% ${transform.originY}%`,
                transform: `
                  translate(${transform.x}px, ${transform.y}px) 
                  scale(${transform.scale}) 
                  rotate(${transform.rotate}deg)
                  skewX(${transform.skewX}deg)
                  skewY(${transform.skewY}deg)
                  perspective(1000px)
                  rotateX(${transform.perspectiveX}deg)
                  rotateY(${transform.perspectiveY}deg)
                `,
                filter: `drop-shadow(${10 * transform.scale}px ${20 * transform.scale}px ${30 * transform.scale}px rgba(0,0,0,0.6))`
              }}
            >
              <img 
                src={processedForegroundSrc} 
                alt="Foreground" 
                className="max-w-none pointer-events-none" 
                style={{
                  maxWidth: '800px' 
                }}
              />
              {/* Bounding Box Indicator */}
              <div className="absolute inset-0 border-2 border-cyan-500/50 opacity-0 hover:opacity-100 transition-opacity rounded-sm pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Overlay Info */}
      <div className="absolute bottom-4 right-4 text-slate-500 text-xs font-mono bg-slate-900/80 p-2 rounded pointer-events-none">
        {canvasSettings.width}x{canvasSettings.height} ({viewScale.toFixed(2)}x Zoom)
      </div>
    </div>
  );
};