
import { GoogleGenAI } from "@google/genai";
import { GenerationSettings } from "../types";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzeImage = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = getAiClient();
  const mimeType = base64Image.split(';')[0].split(':')[1];
  const data = base64Image.split(',')[1];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data
            }
          },
          { text: prompt }
        ]
      }
    });
    return response.text || "Could not analyze image.";
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
};

export const generateBackgroundImage = async (
  prompts: string[], 
  settings: GenerationSettings
): Promise<string[]> => {
  const ai = getAiClient();

  const generateSingleImage = async (prompt: string): Promise<string | null> => {
    try {
      const model = settings.model;
      
      const config: any = {
        imageConfig: {
          aspectRatio: settings.aspectRatio,
        }
      };

      // Only gemini-3-pro-image-preview supports imageSize
      if (model === 'gemini-3-pro-image-preview') {
        config.imageConfig.imageSize = settings.imageSize;
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              text: `Photorealistic 3D environment, empty background suitable for compositing a subject, high resolution, cinematic lighting: ${prompt}`
            }
          ]
        },
        config: config
      });

      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        const parts = candidates[0].content.parts;
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
      return null;
    } catch (error) {
      console.error(`Error generating image for prompt "${prompt}":`, error);
      return null;
    }
  };

  const results = await Promise.all(prompts.map(prompt => generateSingleImage(prompt)));
  return results.filter((result): result is string => result !== null);
};

export const generateVideo = async (
  prompt: string, 
  imageBase64: string,
  aspectRatio: string = '16:9'
): Promise<string | null> => {
  const ai = getAiClient();
  const mimeType = imageBase64.split(';')[0].split(':')[1];
  const data = imageBase64.split(',')[1];

  try {
    // veo-3.1-fast-generate-preview supports 16:9 or 9:16
    // Map existing app aspect ratios to closest valid Veo ratio
    const validRatio = aspectRatio === '9:16' ? '9:16' : '16:9';

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || "Animate this scene naturally, cinematic camera movement.",
      image: {
        imageBytes: data,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: validRatio
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (videoUri) {
      return `${videoUri}&key=${process.env.API_KEY}`;
    }
    return null;

  } catch (error) {
    console.error("Error generating video:", error);
    throw error;
  }
};
