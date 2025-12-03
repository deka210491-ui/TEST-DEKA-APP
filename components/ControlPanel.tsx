import React, { ChangeEvent, useState, useEffect } from 'react';
import { ChromaSettings, Tab, TransformSettings, CanvasSettings, GenerationSettings, VideoState, SceneObject } from '../types';
import { Upload, Wand2, Layers, Move, Palette, Box, Sliders, Image as ImageIcon, Eye, EyeOff, Download, Monitor, ChevronDown, Sparkles, Video, Film, Loader2, BrainCircuit, Undo2, Redo2, Plus, Trash2, Cuboid, Circle, Cylinder, Triangle, Maximize, Minimize } from 'lucide-react';
import { CANVAS_PRESETS, ASPECT_RATIOS, IMAGE_SIZES } from '../constants';

interface ControlPanelProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  chroma: ChromaSettings;
  setChroma: (settings: ChromaSettings) => void;
  transform: TransformSettings;
  setTransform: (settings: TransformSettings) => void;
  backgroundTransform: TransformSettings;
  setBackgroundTransform: (settings: TransformSettings) => void;
  onGenerateBackground: (prompt: string) => void;
  isGenerating: boolean;
  onFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onBackgroundUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  generatedBackgrounds: string[];
  onSelectBackground: (src: string) => void;
  currentBackground: string | null;
  showBackground: boolean;
  setShowBackground: (show: boolean) => void;
  onExport: () => void;
  canvasSettings: CanvasSettings;
  setCanvasSettings: (settings: CanvasSettings) => void;
  genSettings: GenerationSettings;
  setGenSettings: (settings: GenerationSettings) => void;
  onAnalyzeMatch: () => void;
  isAnalyzing: boolean;
  videoState: VideoState;
  setVideoState: (state: VideoState) => void;
  onGenerateVideo: () => void;
  processedForegroundSrc: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onHistorySave: () => void;
  sceneObjects: SceneObject[];
  onAddSceneObject: (type: SceneObject['type']) => void;
  onUpdateSceneObject: (id: string, updates: Partial<SceneObject>) => void;
  onRemoveSceneObject: (id: string) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  activeTab,
  setActiveTab,
  chroma,
  setChroma,
  transform,
  setTransform,
  backgroundTransform,
  setBackgroundTransform,
  onGenerateBackground,
  isGenerating,
  onFileUpload,
  onBackgroundUpload,
  generatedBackgrounds,
  onSelectBackground,
  currentBackground,
  showBackground,
  setShowBackground,
  onExport,
  canvasSettings,
  setCanvasSettings,
  genSettings,
  setGenSettings,
  onAnalyzeMatch,
  isAnalyzing,
  videoState,
  setVideoState,
  onGenerateVideo,
  processedForegroundSrc,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onHistorySave,
  sceneObjects,
  onAddSceneObject,
  onUpdateSceneObject,
  onRemoveSceneObject
}) => {
  const [prompt, setPrompt] = React.useState('');
  const [activeLayer, setActiveLayer] = useState<'subject' | 'background'>('subject');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleChromaChange = (key: keyof ChromaSettings, value: string | number) => {
    setChroma({ ...chroma, [key]: value });
  };

  const handleTransformChange = (key: keyof TransformSettings, value: number | boolean) => {
    if (activeLayer === 'subject') {
      setTransform({ ...transform, [key]: value });
    } else {
      setBackgroundTransform({ ...backgroundTransform, [key]: value });
    }
  };

  // Helper to get current active transform values for inputs
  const currentTransform = activeLayer === 'subject' ? transform : backgroundTransform;

  const handlePresetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const preset = CANVAS_PRESETS.find(p => p.name === e.target.value);
    if (preset) {
      setCanvasSettings(preset);
    }
  };

  const selectedObject = sceneObjects.find(obj => obj.id === selectedObjectId);

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col h-full overflow-y-auto z-10 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
      <div className="p-6 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent">
            ChromaGen
          </h1>
          <p className="text-[10px] text-slate-400">AI Studio</p>
        </div>
        <div className="flex gap-1 items-center">
          <button 
            onClick={onUndo} 
            disabled={!canUndo}
            className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${!canUndo ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button 
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${!canRedo ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300'}`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1"></div>
          <button 
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-slate-800 transition-colors text-slate-300"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 overflow-x-auto no-scrollbar">
        {[
          { id: Tab.KEYING, icon: Layers, label: 'Key' },
          { id: Tab.BACKGROUND, icon: ImageIcon, label: 'Back' },
          { id: Tab.OBJECTS, icon: Cuboid, label: 'Objects' },
          { id: Tab.COMPOSITE, icon: Box, label: '3D' },
          { id: Tab.VIDEO, icon: Video, label: 'Veo' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 p-3 flex flex-col items-center justify-center text-[10px] sm:text-xs gap-1 transition-colors min-w-[60px] ${
              activeTab === tab.id
                ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-6 flex-1">
        {activeTab === Tab.KEYING && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Input Foreground</label>
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex items-center justify-center border-2 border-dashed border-slate-600 rounded-lg p-6 hover:border-cyan-500 transition-colors bg-slate-800/50">
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    <span className="text-xs text-slate-400">Upload Subject</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Palette size={16} /> Keying Settings
              </h3>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Key Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={chroma.color}
                    onClick={onHistorySave}
                    onChange={(e) => handleChromaChange('color', e.target.value)}
                    className="h-8 w-8 rounded cursor-pointer border-none p-0 bg-transparent"
                  />
                  <span className="text-xs text-slate-500 font-mono">{chroma.color}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 flex justify-between">
                  Similarity <span>{Math.round(chroma.similarity * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  onPointerDown={onHistorySave}
                  value={chroma.similarity}
                  onChange={(e) => handleChromaChange('similarity', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 flex justify-between">
                  Smoothness <span>{Math.round(chroma.smoothness * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  onPointerDown={onHistorySave}
                  value={chroma.smoothness}
                  onChange={(e) => handleChromaChange('smoothness', parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === Tab.BACKGROUND && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Manual Upload Section */}
             <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Upload Background</label>
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onBackgroundUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex items-center justify-center border-2 border-dashed border-slate-600 rounded-lg p-4 hover:border-cyan-500 transition-colors bg-slate-800/50">
                  <div className="text-center flex flex-col items-center">
                    <Upload className="h-6 w-6 text-slate-400 mb-1" />
                    <span className="text-xs text-slate-400">Select Image File</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-900 px-2 text-xs text-slate-500">OR GENERATE WITH AI</span>
              </div>
            </div>

            {processedForegroundSrc && (
              <button
                onClick={onAnalyzeMatch}
                disabled={isAnalyzing}
                className="w-full py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/30"
              >
                 {isAnalyzing ? (
                   <Loader2 size={14} className="animate-spin" />
                 ) : (
                   <BrainCircuit size={14} />
                 )}
                 Analyze Subject & Match Scene
              </button>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Wand2 size={16} /> AI Environment
              </h3>

              {/* Advanced Settings */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                   <label className="block text-[10px] text-slate-500 mb-1">Aspect Ratio</label>
                   <select 
                      value={genSettings.aspectRatio}
                      onChange={(e) => setGenSettings({...genSettings, aspectRatio: e.target.value})}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500"
                   >
                     {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-[10px] text-slate-500 mb-1">Quality/Size</label>
                   <select 
                      value={genSettings.imageSize}
                      onChange={(e) => setGenSettings({
                          ...genSettings, 
                          imageSize: e.target.value,
                          model: 'gemini-3-pro-image-preview' // Force pro model if size selected
                        })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500"
                   >
                     {IMAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-2">Prompt Description</label>
                <textarea
                  className="w-full h-24 bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                  placeholder="e.g. A futuristic neon city street at night..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <button
                onClick={() => onGenerateBackground(prompt)}
                disabled={isGenerating || !prompt.trim()}
                className={`w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                  isGenerating
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/50'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating Variations...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Generate Environments
                  </>
                )}
              </button>
            </div>

            {/* Generated Gallery */}
            {generatedBackgrounds.length > 0 && (
              <div className="space-y-2">
                 <label className="block text-xs text-slate-400">Generated Options</label>
                 <div className="grid grid-cols-2 gap-2">
                    {generatedBackgrounds.map((bg, idx) => (
                      <button
                        key={idx}
                        onClick={() => { onHistorySave(); onSelectBackground(bg); }}
                        className={`relative aspect-video rounded overflow-hidden border-2 transition-all ${
                          currentBackground === bg 
                            ? 'border-cyan-500 shadow-lg shadow-cyan-900/40 ring-1 ring-cyan-500' 
                            : 'border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <img 
                          src={bg} 
                          alt={`Generated ${idx + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        {currentBackground === bg && (
                           <div className="absolute inset-0 bg-cyan-500/10 flex items-center justify-center">
                              <div className="bg-cyan-500 rounded-full p-1">
                                <Box size={12} className="text-white" />
                              </div>
                           </div>
                        )}
                      </button>
                    ))}
                 </div>
              </div>
            )}

            {/* Background Adjustments */}
            {currentBackground && (
              <div className="space-y-4 pt-4 border-t border-slate-700">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Sliders size={16} /> Background Adjustments
                </h3>
                
                {/* Scale & Rotate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Scale</label>
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.05"
                      onPointerDown={onHistorySave}
                      value={backgroundTransform.scale}
                      onChange={(e) => setBackgroundTransform({ ...backgroundTransform, scale: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Rotate</label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      onPointerDown={onHistorySave}
                      value={backgroundTransform.rotate}
                      onChange={(e) => setBackgroundTransform({ ...backgroundTransform, rotate: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>

                {/* Skew Controls */}
                 <div className="space-y-3 p-3 bg-slate-800/50 rounded border border-slate-700">
                   <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <Move size={12} /> Perspective / Skew
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                      <label className="block text-xs text-slate-400 mb-1 flex justify-between">
                        Skew X <span>{Math.round(backgroundTransform.skewX)}°</span>
                      </label>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        onPointerDown={onHistorySave}
                        value={backgroundTransform.skewX}
                        onChange={(e) => setBackgroundTransform({ ...backgroundTransform, skewX: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                     <div>
                      <label className="block text-xs text-slate-400 mb-1 flex justify-between">
                        Skew Y <span>{Math.round(backgroundTransform.skewY)}°</span>
                      </label>
                      <input
                        type="range"
                        min="-45"
                        max="45"
                        onPointerDown={onHistorySave}
                        value={backgroundTransform.skewY}
                        onChange={(e) => setBackgroundTransform({ ...backgroundTransform, skewY: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === Tab.OBJECTS && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Cuboid size={16} /> 3D Scene Objects
            </h3>
            
            <div className="grid grid-cols-4 gap-2">
               <button onClick={() => onAddSceneObject('cube')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded flex flex-col items-center justify-center gap-1 transition-colors">
                  <Cuboid size={16} />
                  <span className="text-[10px] text-slate-400">Cube</span>
               </button>
               <button onClick={() => onAddSceneObject('sphere')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded flex flex-col items-center justify-center gap-1 transition-colors">
                  <Circle size={16} />
                  <span className="text-[10px] text-slate-400">Sphere</span>
               </button>
               <button onClick={() => onAddSceneObject('cone')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded flex flex-col items-center justify-center gap-1 transition-colors">
                  <Triangle size={16} />
                  <span className="text-[10px] text-slate-400">Cone</span>
               </button>
               <button onClick={() => onAddSceneObject('torus')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded flex flex-col items-center justify-center gap-1 transition-colors">
                  <Circle size={16} className="rotate-45" />
                  <span className="text-[10px] text-slate-400">Torus</span>
               </button>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <label className="block text-xs text-slate-400 mb-2">Scene Hierarchy</label>
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {sceneObjects.length === 0 && (
                   <p className="text-xs text-slate-600 italic text-center py-4">No objects in scene</p>
                )}
                {sceneObjects.map((obj) => (
                  <div 
                    key={obj.id}
                    onClick={() => setSelectedObjectId(obj.id)}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer text-xs ${
                      selectedObjectId === obj.id ? 'bg-cyan-900/50 text-cyan-200 border border-cyan-700/50' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                     <span className="capitalize flex items-center gap-2">
                       <Box size={12} /> {obj.type}
                     </span>
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         onRemoveSceneObject(obj.id);
                         if(selectedObjectId === obj.id) setSelectedObjectId(null);
                       }}
                       className="text-slate-500 hover:text-red-400 p-1"
                     >
                        <Trash2 size={12} />
                     </button>
                  </div>
                ))}
              </div>
            </div>

            {selectedObject && (
               <div className="space-y-4 pt-4 border-t border-slate-700">
                  <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Properties</h4>
                  
                  {/* Position */}
                  <div className="space-y-2">
                    <span className="text-xs text-slate-400 block">Position</span>
                    <div className="grid grid-cols-3 gap-2">
                       {['x', 'y', 'z'].map((axis) => (
                          <div key={axis} className="bg-slate-800 rounded px-2 py-1 flex items-center">
                            <span className="text-[10px] text-slate-500 uppercase mr-1">{axis}</span>
                            <input 
                               type="number" 
                               step="0.1"
                               className="w-full bg-transparent text-xs outline-none"
                               value={(selectedObject.position as any)[axis]}
                               onChange={(e) => onUpdateSceneObject(selectedObject.id, {
                                 position: { ...selectedObject.position, [axis]: parseFloat(e.target.value) }
                               })}
                               onFocus={onHistorySave}
                            />
                          </div>
                       ))}
                    </div>
                  </div>

                  {/* Rotation */}
                  <div className="space-y-2">
                    <span className="text-xs text-slate-400 block">Rotation</span>
                    <div className="grid grid-cols-3 gap-2">
                       {['x', 'y', 'z'].map((axis) => (
                          <div key={axis} className="bg-slate-800 rounded px-2 py-1 flex items-center">
                            <span className="text-[10px] text-slate-500 uppercase mr-1">{axis}</span>
                            <input 
                               type="number" 
                               className="w-full bg-transparent text-xs outline-none"
                               value={(selectedObject.rotation as any)[axis]}
                               onChange={(e) => onUpdateSceneObject(selectedObject.id, {
                                 rotation: { ...selectedObject.rotation, [axis]: parseFloat(e.target.value) }
                               })}
                               onFocus={onHistorySave}
                            />
                          </div>
                       ))}
                    </div>
                  </div>

                  {/* Scale */}
                  <div className="space-y-2">
                    <span className="text-xs text-slate-400 block">Scale</span>
                    <div className="grid grid-cols-3 gap-2">
                       {['x', 'y', 'z'].map((axis) => (
                          <div key={axis} className="bg-slate-800 rounded px-2 py-1 flex items-center">
                            <span className="text-[10px] text-slate-500 uppercase mr-1">{axis}</span>
                            <input 
                               type="number" 
                               step="0.1"
                               className="w-full bg-transparent text-xs outline-none"
                               value={(selectedObject.scale as any)[axis]}
                               onChange={(e) => onUpdateSceneObject(selectedObject.id, {
                                 scale: { ...selectedObject.scale, [axis]: parseFloat(e.target.value) }
                               })}
                               onFocus={onHistorySave}
                            />
                          </div>
                       ))}
                    </div>
                  </div>

                  {/* Color */}
                   <div>
                    <label className="block text-xs text-slate-400 mb-1">Color</label>
                    <div className="flex items-center gap-2 bg-slate-800 p-2 rounded">
                      <input
                        type="color"
                        value={selectedObject.color}
                        onClick={onHistorySave}
                        onChange={(e) => onUpdateSceneObject(selectedObject.id, { color: e.target.value })}
                        className="h-6 w-6 rounded cursor-pointer border-none p-0 bg-transparent"
                      />
                      <span className="text-xs text-slate-300 font-mono">{selectedObject.color}</span>
                    </div>
                  </div>
               </div>
            )}
          </div>
        )}

        {activeTab === Tab.COMPOSITE && (
          <div className="space-y-6 animate-in fade-in duration-300">
             
             {/* Target Toggle */}
             <div className="flex bg-slate-800 p-1 rounded-lg">
                <button
                  onClick={() => setActiveLayer('subject')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeLayer === 'subject' 
                      ? 'bg-cyan-600 text-white shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Subject
                </button>
                <button
                  onClick={() => setActiveLayer('background')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeLayer === 'background' 
                      ? 'bg-cyan-600 text-white shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Background
                </button>
             </div>

             {/* Output Settings */}
             <div className="space-y-3 p-3 bg-slate-800/50 rounded border border-slate-700">
               <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Monitor size={12} /> Output Settings
               </span>
               <div className="space-y-2">
                 <div>
                   <label className="block text-xs text-slate-400 mb-1">Preset Size</label>
                   <div className="relative">
                     <select 
                       className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 appearance-none focus:border-cyan-500 outline-none"
                       onChange={handlePresetChange}
                       value={CANVAS_PRESETS.some(p => p.width === canvasSettings.width && p.height === canvasSettings.height) ? canvasSettings.name : ""}
                     >
                       {CANVAS_PRESETS.map((p, i) => (
                         <option key={i} value={p.name}>{p.name} ({p.width}x{p.height})</option>
                       ))}
                       <option value="">Custom</option>
                     </select>
                     <ChevronDown size={12} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
                   </div>
                 </div>
               </div>
             </div>

             {/* Size & Opacity */}
             <div className="space-y-3 p-3 bg-slate-800/50 rounded border border-slate-700">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                   <Sliders size={12} /> {activeLayer === 'subject' ? 'Subject' : 'Background'} Properties
                </span>
                
                {activeLayer === 'subject' && (
                  <div className="flex items-center justify-between mb-2">
                     <span className="text-xs text-slate-400">Visible</span>
                     <button 
                      onClick={() => { onHistorySave(); handleTransformChange('visible', !currentTransform.visible); }}
                      className={`text-slate-400 hover:text-cyan-400 transition-colors`}
                     >
                      {currentTransform.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                     </button>
                  </div>
                )}
                {activeLayer === 'background' && (
                  <div className="flex items-center justify-between mb-2">
                     <span className="text-xs text-slate-400">Visible</span>
                     <button 
                      onClick={() => setShowBackground(!showBackground)}
                      className={`text-slate-400 hover:text-cyan-400 transition-colors`}
                     >
                      {showBackground ? <Eye size={16} /> : <EyeOff size={16} />}
                     </button>
                  </div>
                )}

                <div>
                   <label className="block text-xs text-slate-400 mb-1 flex justify-between">
                     Scale <span>{Math.round(currentTransform.scale * 100)}%</span>
                   </label>
                   <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.05"
                      onPointerDown={onHistorySave}
                      value={currentTransform.scale}
                      onChange={(e) => handleTransformChange('scale', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                </div>
             </div>

             <div className="border-t border-slate-700 my-4" />

             <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Box size={16} /> 3D Transform ({activeLayer})
              </h3>

              {/* Basic Rotation */}
              <div className="space-y-3 p-3 bg-slate-800/50 rounded border border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="block text-xs text-slate-400">Rotation</label>
                  <span className="text-xs font-mono text-slate-500">{currentTransform.rotate}°</span>
                </div>
                 <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  onPointerDown={onHistorySave}
                  value={currentTransform.rotate}
                  onChange={(e) => handleTransformChange('rotate', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* Perspective */}
              <div className="space-y-3 p-3 bg-slate-800/50 rounded border border-slate-700">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Box size={12} /> Perspective 3D
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 flex justify-between">
                      Tilt X <span>{Math.round(currentTransform.perspectiveX)}°</span>
                    </label>
                    <input
                      type="range"
                      min="-60"
                      max="60"
                      onPointerDown={onHistorySave}
                      value={currentTransform.perspectiveX}
                      onChange={(e) => handleTransformChange('perspectiveX', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 flex justify-between">
                      Tilt Y <span>{Math.round(currentTransform.perspectiveY)}°</span>
                    </label>
                    <input
                      type="range"
                      min="-60"
                      max="60"
                      onPointerDown={onHistorySave}
                      value={currentTransform.perspectiveY}
                      onChange={(e) => handleTransformChange('perspectiveY', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Skew */}
              <div className="space-y-3 p-3 bg-slate-800/50 rounded border border-slate-700">
                 <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Move size={12} /> Skew
                </span>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-xs text-slate-400 mb-1 flex justify-between">
                      Skew X <span>{Math.round(currentTransform.skewX)}°</span>
                    </label>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      onPointerDown={onHistorySave}
                      value={currentTransform.skewX}
                      onChange={(e) => handleTransformChange('skewX', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                   <div>
                    <label className="block text-xs text-slate-400 mb-1 flex justify-between">
                      Skew Y <span>{Math.round(currentTransform.skewY)}°</span>
                    </label>
                    <input
                      type="range"
                      min="-45"
                      max="45"
                      onPointerDown={onHistorySave}
                      value={currentTransform.skewY}
                      onChange={(e) => handleTransformChange('skewY', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={onExport}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/50 transition-all mt-4"
              >
                <Download size={16} /> Export Composite
              </button>
          </div>
        )}

        {activeTab === Tab.VIDEO && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-4">
               <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Film size={16} /> Generate Video (Veo)
               </h3>
               
               <p className="text-xs text-slate-400">
                 Turn your current composite (subject + background) into a cinematic video using Veo 3.1.
               </p>

               {/* Video Prompt */}
               <div>
                  <label className="block text-xs text-slate-400 mb-2">Motion Prompt</label>
                  <textarea
                    className="w-full h-24 bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                    placeholder="Describe how the scene should move (e.g., 'Slow pan right, subtle wind effects')..."
                    value={videoState.prompt}
                    onChange={(e) => setVideoState({ ...videoState, prompt: e.target.value })}
                  />
               </div>

               {/* Generate Button */}
               <button
                  onClick={onGenerateVideo}
                  disabled={videoState.isGenerating}
                  className={`w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                    videoState.isGenerating
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/50'
                  }`}
               >
                  {videoState.isGenerating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Generating Video...
                    </>
                  ) : (
                    <>
                      <Video size={16} /> Generate Video
                    </>
                  )}
               </button>

               {/* Video Result */}
               {videoState.generatedVideoUrl && (
                 <div className="mt-6 space-y-2">
                    <label className="block text-xs text-slate-400">Generated Video</label>
                    <div className="rounded-lg overflow-hidden border border-slate-700 bg-black aspect-video">
                       <video 
                         src={videoState.generatedVideoUrl} 
                         controls 
                         className="w-full h-full"
                         autoPlay
                         loop
                       />
                    </div>
                    <a 
                      href={videoState.generatedVideoUrl} 
                      download="generated_video.mp4"
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-center rounded text-xs transition-colors"
                    >
                      Download MP4
                    </a>
                 </div>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};