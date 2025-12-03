

import { CanvasSettings, TransformSettings, GenerationSettings, SceneObject } from "./types";

export const DEFAULT_CHROMA_SETTINGS = {
  color: '#00ff00', // Green
  similarity: 0.4,
  smoothness: 0.1,
  spill: 0.1
};

export const DEFAULT_TRANSFORM_SETTINGS: TransformSettings = {
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
  perspectiveX: 0,
  perspectiveY: 0,
  skewX: 0,
  skewY: 0,
  originX: 50,
  originY: 50,
  opacity: 1,
  visible: true
};

export const DEFAULT_BACKGROUND_TRANSFORM_SETTINGS: TransformSettings = {
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
  perspectiveX: 0,
  perspectiveY: 0,
  skewX: 0,
  skewY: 0,
  originX: 50,
  originY: 50,
  opacity: 1,
  visible: true
};

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  width: 1280,
  height: 720,
  name: "HD Landscape (16:9)"
};

export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  aspectRatio: "16:9",
  imageSize: "1K",
  model: 'gemini-2.5-flash-image'
};

export const DEFAULT_SCENE_OBJECT: Omit<SceneObject, 'id' | 'type'> = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  color: '#06b6d4'
};

export const CANVAS_PRESETS: CanvasSettings[] = [
  { width: 1280, height: 720, name: "HD Landscape (720p)" },
  { width: 1920, height: 1080, name: "Full HD (1080p)" },
  { width: 1080, height: 1920, name: "Social Story (9:16)" },
  { width: 1080, height: 1080, name: "Square Post (1:1)" },
  { width: 1080, height: 1350, name: "Portrait (4:5)" },
  { width: 1200, height: 628, name: "Social Landscape" },
];

export const ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9", "21:9"];
export const IMAGE_SIZES = ["1K", "2K", "4K"];

export const SAMPLE_BACKGROUND = "https://picsum.photos/1920/1080";