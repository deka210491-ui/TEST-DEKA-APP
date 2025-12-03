

export interface ChromaSettings {
  color: string; // Hex color
  similarity: number; // 0-1
  smoothness: number; // 0-1
  spill: number; // 0-1
}

export interface TransformSettings {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  perspectiveX: number; // For pseduo-3D effect
  perspectiveY: number;
  skewX: number;
  skewY: number;
  originX: number; // 0-100%
  originY: number; // 0-100%
  opacity: number; // 0-1
  visible: boolean;
}

export interface CanvasSettings {
  width: number;
  height: number;
  name: string;
}

export interface GenerationSettings {
  aspectRatio: string;
  imageSize: string;
  model: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';
}

export interface VideoState {
  isGenerating: boolean;
  generatedVideoUrl: string | null;
  prompt: string;
}

export interface SceneObject {
  id: string;
  type: 'cube' | 'sphere' | 'torus' | 'cone';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
}

export interface HistoryState {
  chroma: ChromaSettings;
  transform: TransformSettings;
  backgroundTransform: TransformSettings;
  sceneObjects: SceneObject[];
}

export interface AppState {
  foregroundSrc: string | null;
  processedForegroundSrc: string | null;
  backgroundSrc: string | null;
  chroma: ChromaSettings;
  transform: TransformSettings;
  backgroundTransform: TransformSettings;
  canvas: CanvasSettings;
  isProcessing: boolean;
  isGenerating: boolean;
  prompt: string;
  video: VideoState;
  sceneObjects: SceneObject[];
}

export enum Tab {
  KEYING = 'KEYING',
  BACKGROUND = 'BACKGROUND',
  OBJECTS = 'OBJECTS',
  COMPOSITE = 'COMPOSITE',
  VIDEO = 'VIDEO'
}