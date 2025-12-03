

import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { Workspace } from './components/Workspace';
import { 
  AppState, 
  ChromaSettings, 
  Tab, 
  TransformSettings,
  CanvasSettings,
  GenerationSettings,
  VideoState,
  HistoryState,
  SceneObject
} from './types';
import { 
  DEFAULT_CHROMA_SETTINGS, 
  DEFAULT_TRANSFORM_SETTINGS, 
  DEFAULT_BACKGROUND_TRANSFORM_SETTINGS,
  DEFAULT_CANVAS_SETTINGS,
  DEFAULT_GENERATION_SETTINGS,
  DEFAULT_SCENE_OBJECT,
  SAMPLE_BACKGROUND 
} from './constants';
import { processChromaKey } from './services/imageProcessor';
import { generateBackgroundImage, analyzeImage, generateVideo } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.KEYING);
  
  // App State
  const [foregroundSrc, setForegroundSrc] = useState<string | null>(null);
  const [processedForegroundSrc, setProcessedForegroundSrc] = useState<string | null>(null);
  const [backgroundSrc, setBackgroundSrc] = useState<string | null>(SAMPLE_BACKGROUND);
  const [generatedBackgrounds, setGeneratedBackgrounds] = useState<string[]>([]);
  
  const [chroma, setChroma] = useState<ChromaSettings>(DEFAULT_CHROMA_SETTINGS);
  
  // Transforms
  const [transform, setTransform] = useState<TransformSettings>(DEFAULT_TRANSFORM_SETTINGS);
  const [backgroundTransform, setBackgroundTransform] = useState<TransformSettings>(DEFAULT_BACKGROUND_TRANSFORM_SETTINGS);
  
  // Settings
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>(DEFAULT_CANVAS_SETTINGS);
  const [genSettings, setGenSettings] = useState<GenerationSettings>(DEFAULT_GENERATION_SETTINGS);
  
  // Status Flags
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showBackground, setShowBackground] = useState(true);

  // Video State
  const [videoState, setVideoState] = useState<VideoState>({
    isGenerating: false,
    generatedVideoUrl: null,
    prompt: ''
  });

  // Scene Objects (3D)
  const [sceneObjects, setSceneObjects] = useState<SceneObject[]>([]);

  // History State
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);

  // History Management
  const saveSnapshot = useCallback(() => {
    setHistory(prev => [...prev, {
      chroma: { ...chroma },
      transform: { ...transform },
      backgroundTransform: { ...backgroundTransform },
      sceneObjects: JSON.parse(JSON.stringify(sceneObjects)) // deep copy
    }]);
    setFuture([]);
  }, [chroma, transform, backgroundTransform, sceneObjects]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    
    // Save current to future
    setFuture(prev => [{
      chroma: { ...chroma },
      transform: { ...transform },
      backgroundTransform: { ...backgroundTransform },
      sceneObjects: JSON.parse(JSON.stringify(sceneObjects))
    }, ...prev]);
    
    setHistory(newHistory);
    
    setChroma(previous.chroma);
    setTransform(previous.transform);
    setBackgroundTransform(previous.backgroundTransform);
    setSceneObjects(previous.sceneObjects);
  }, [history, chroma, transform, backgroundTransform, sceneObjects]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    
    // Save current to history
    setHistory(prev => [...prev, {
      chroma: { ...chroma },
      transform: { ...transform },
      backgroundTransform: { ...backgroundTransform },
      sceneObjects: JSON.parse(JSON.stringify(sceneObjects))
    }]);
    
    setFuture(newFuture);
    
    setChroma(next.chroma);
    setTransform(next.transform);
    setBackgroundTransform(next.backgroundTransform);
    setSceneObjects(next.sceneObjects);
  }, [future, chroma, transform, backgroundTransform, sceneObjects]);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for inputs/textareas to avoid overriding text editing
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        redo();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Scene Object Handlers
  const handleAddSceneObject = (type: SceneObject['type']) => {
    saveSnapshot();
    const newObj: SceneObject = {
      ...DEFAULT_SCENE_OBJECT,
      id: crypto.randomUUID(),
      type,
    };
    setSceneObjects(prev => [...prev, newObj]);
  };

  const handleUpdateSceneObject = (id: string, updates: Partial<SceneObject>) => {
    // Only save snapshot on major changes (like mouse down)
    // The control panel inputs handle calling saveSnapshot onFocus/onPointerDown
    setSceneObjects(prev => prev.map(obj => 
      obj.id === id ? { ...obj, ...updates } : obj
    ));
  };

  const handleRemoveSceneObject = (id: string) => {
    saveSnapshot();
    setSceneObjects(prev => prev.filter(obj => obj.id !== id));
  };


  // File Upload Handler (Foreground)
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Save history before resetting transform
      saveSnapshot();
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setForegroundSrc(event.target.result as string);
          // Reset transform when new image loads
          setTransform(DEFAULT_TRANSFORM_SETTINGS);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // File Upload Handler (Background)
  const handleBackgroundUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      saveSnapshot(); // Save before changing background
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBackgroundSrc(event.target.result as string);
          setActiveTab(Tab.COMPOSITE);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Debounced Chroma Key Processing
  useEffect(() => {
    if (!foregroundSrc) return;

    const timer = setTimeout(async () => {
      try {
        const processed = await processChromaKey(foregroundSrc, chroma);
        setProcessedForegroundSrc(processed);
      } catch (error) {
        console.error("Error processing chroma key:", error);
      }
    }, 100); // 100ms debounce

    return () => clearTimeout(timer);
  }, [foregroundSrc, chroma]);

  // Handle Background Generation
  const handleGenerateBackground = async (prompt: string) => {
    setIsGenerating(true);
    saveSnapshot(); // Save before generating new background
    try {
      // Generate variations
      const prompts = Array(4).fill(prompt);
      const imageUrls = await generateBackgroundImage(prompts, genSettings);
      
      if (imageUrls.length > 0) {
        setGeneratedBackgrounds(imageUrls);
        setBackgroundSrc(imageUrls[0]);
        // Auto switch to composite tab to see result
        setActiveTab(Tab.COMPOSITE);
      } else {
        alert("No image generated.");
      }
    } catch (error) {
      console.error("GenAI Error:", error);
      alert("Failed to generate background. Please check your API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Image Analysis & Matching
  const handleAnalyzeMatch = async () => {
    if (!processedForegroundSrc) return;
    setIsAnalyzing(true);
    try {
      // 1. Analyze the foreground subject
      const prompt = "Analyze this image and describe a perfect 3D environment or background scene that this subject would naturally belong in. Focus on lighting, perspective, and context. Be descriptive but concise.";
      const description = await analyzeImage(processedForegroundSrc, prompt);
      
      // 2. Generate background based on description
      if (description) {
        await handleGenerateBackground(description);
      }
    } catch (error) {
      console.error("Analysis failed", error);
      alert("Failed to analyze image.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Shared function to render the current composite to a base64 string
  const getCompositeBase64 = async (): Promise<string | null> => {
    if (!processedForegroundSrc && !backgroundSrc) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas to selected output resolution
    const width = canvasSettings.width;
    const height = canvasSettings.height;
    canvas.width = width;
    canvas.height = height;

    // 1. Draw Background with Transform
    if (showBackground && backgroundSrc) {
      const bgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = backgroundSrc!;
      });

      ctx.save();
      
      // Apply Background Transforms
      // Center of canvas
      const cx = width / 2;
      const cy = height / 2;

      ctx.translate(cx, cy);
      ctx.translate(backgroundTransform.x, backgroundTransform.y);
      ctx.scale(backgroundTransform.scale, backgroundTransform.scale);
      ctx.rotate((backgroundTransform.rotate * Math.PI) / 180);
      
      // Reset origin for drawing
      ctx.translate(-cx, -cy);

      // Draw 'cover' style
      const bgRatio = bgImg.width / bgImg.height;
      const canvasRatio = width / height;
      let drawW, drawH, offsetX, offsetY;

      if (bgRatio > canvasRatio) {
        drawH = height;
        drawW = height * bgRatio;
        offsetX = (width - drawW) / 2;
        offsetY = 0;
      } else {
        drawW = width;
        drawH = width / bgRatio;
        offsetX = 0;
        offsetY = (height - drawH) / 2;
      }
      ctx.drawImage(bgImg, offsetX, offsetY, drawW, drawH);
      ctx.restore();

    } else {
      ctx.fillStyle = "#0f172a"; // Match app bg
      ctx.fillRect(0, 0, width, height);
    }

    // NOTE: 3D Objects Layer is not rendered in this 2D canvas export 
    // because it requires WebGL to 2D context transfer which is complex without reading pixels.
    // For now, we export the 2D composition. If full 3D export is needed, we'd need to
    // capture the Three.js canvas dataURL and draw it here.
    
    // Attempt to grab the 3D canvas from DOM if it exists
    const threeCanvas = document.querySelector('canvas[data-engine="three.js"]');
    // Note: Since we didn't mark the canvas specifically, this is pseudo-code logic. 
    // In reality, we'd need to pass a ref or callback to get the 3D dataURL.
    // Skipping complex WebGL capture for this iteration to keep it robust.

    // 2. Draw Foreground with Transform
    if (processedForegroundSrc && transform.visible) {
      const fgImg = await new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.src = processedForegroundSrc!;
      });

      ctx.save();
      ctx.globalAlpha = transform.opacity;

      let fgDrawWidth = fgImg.width;
      let fgDrawHeight = fgImg.height;
      
      // Limit max size for consistency
      if (fgDrawWidth > 800) {
        const ratio = 800 / fgDrawWidth;
        fgDrawWidth = 800;
        fgDrawHeight = fgDrawHeight * ratio;
      }

      const originXPx = fgDrawWidth * (transform.originX / 100);
      const originYPx = fgDrawHeight * (transform.originY / 100);

      ctx.translate(transform.x, transform.y);
      ctx.translate(originXPx, originYPx);
      ctx.rotate((transform.rotate * Math.PI) / 180);
      ctx.scale(transform.scale, transform.scale);
      // Skew
      ctx.transform(1, Math.tan((transform.skewY * Math.PI) / 180), Math.tan((transform.skewX * Math.PI) / 180), 1, 0, 0);

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 30 * transform.scale;
      ctx.shadowOffsetX = 10 * transform.scale;
      ctx.shadowOffsetY = 20 * transform.scale;

      ctx.drawImage(fgImg, -originXPx, -originYPx, fgDrawWidth, fgDrawHeight);

      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  };

  const handleExport = async () => {
    try {
      const base64 = await getCompositeBase64();
      if (!base64) return;

      const link = document.createElement('a');
      link.download = `chromagen-composite-${Date.now()}.png`;
      link.href = base64;
      link.click();
    } catch (e) {
      console.error("Export failed", e);
      alert("Could not export image.");
    }
  };

  const handleGenerateVideo = async () => {
    setVideoState(prev => ({ ...prev, isGenerating: true, generatedVideoUrl: null }));
    try {
      const compositeBase64 = await getCompositeBase64();
      if (!compositeBase64) throw new Error("Could not create composite for video.");

      // Calculate simple prompt if empty
      const promptToUse = videoState.prompt || "Cinematic camera movement, natural motion, high quality.";
      
      const videoUrl = await generateVideo(promptToUse, compositeBase64, genSettings.aspectRatio);
      
      if (videoUrl) {
        setVideoState(prev => ({ ...prev, generatedVideoUrl: videoUrl }));
      } else {
        alert("Video generation failed to return a URL.");
      }
    } catch (error) {
      console.error("Video Generation Error:", error);
      alert("Failed to generate video.");
    } finally {
      setVideoState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-white font-sans">
      <ControlPanel
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        chroma={chroma}
        setChroma={setChroma}
        transform={transform}
        setTransform={setTransform}
        backgroundTransform={backgroundTransform}
        setBackgroundTransform={setBackgroundTransform}
        onGenerateBackground={handleGenerateBackground}
        isGenerating={isGenerating}
        onFileUpload={handleFileUpload}
        onBackgroundUpload={handleBackgroundUpload}
        generatedBackgrounds={generatedBackgrounds}
        onSelectBackground={setBackgroundSrc}
        currentBackground={backgroundSrc}
        showBackground={showBackground}
        setShowBackground={setShowBackground}
        onExport={handleExport}
        canvasSettings={canvasSettings}
        setCanvasSettings={setCanvasSettings}
        genSettings={genSettings}
        setGenSettings={setGenSettings}
        onAnalyzeMatch={handleAnalyzeMatch}
        isAnalyzing={isAnalyzing}
        videoState={videoState}
        setVideoState={setVideoState}
        onGenerateVideo={handleGenerateVideo}
        processedForegroundSrc={processedForegroundSrc}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={undo}
        onRedo={redo}
        onHistorySave={saveSnapshot}
        sceneObjects={sceneObjects}
        onAddSceneObject={handleAddSceneObject}
        onUpdateSceneObject={handleUpdateSceneObject}
        onRemoveSceneObject={handleRemoveSceneObject}
      />
      
      <Workspace
        processedForegroundSrc={processedForegroundSrc}
        backgroundSrc={backgroundSrc}
        transform={transform}
        setTransform={setTransform}
        backgroundTransform={backgroundTransform}
        activeTab={activeTab}
        showBackground={showBackground}
        canvasSettings={canvasSettings}
        onHistorySave={saveSnapshot}
        sceneObjects={sceneObjects}
      />
    </div>
  );
};

export default App;