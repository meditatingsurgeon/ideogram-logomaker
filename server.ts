import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { verifyAuthToken } from "./src/lib/firebase-admin";
import { db } from "./src/db";
import { users, generations } from "./src/db/schema";
import { eq } from "drizzle-orm";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Authentication middleware
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await verifyAuthToken(idToken);
    (req as any).user = decodedToken;
    
    // Sync user to database
    try {
      await db.insert(users)
        .values({
          id: decodedToken.uid,
          email: decodedToken.email || '',
        })
        .onConflictDoUpdate({
          target: users.id,
          set: { email: decodedToken.email || '' },
        });
    } catch (dbError) {
      console.error('Error syncing user to database', dbError);
      // Don't fail the request if DB sync fails
    }
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

app.get("/api/user", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;
    const user = await db.select().from(users).where(eq(users.id, uid)).limit(1);
    
    if (!user.length) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json(user[0]);
  } catch (error) {
    console.error("User fetch error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function generateIdeogramImage(prompt: string, aspectRatio: string, seed?: number): Promise<{url: string, seed: number}> {
  if (!process.env.IDEOGRAM_API_KEY) {
    console.warn("IDEOGRAM_API_KEY missing, using mock data");
    const ratios: any = {
      "ASPECT_1_1": "https://placehold.co/800x800/222222/ffffff?text=1:1+Logo",
      "ASPECT_16_9": "https://placehold.co/1920x1080/222222/ffffff?text=16:9+Banner",
      "ASPECT_3_1": "https://placehold.co/1200x400/222222/ffffff?text=3:1+Header",
      "ASPECT_9_16": "https://placehold.co/1080x1920/222222/ffffff?text=9:16+Story"
    };
    return { url: ratios[aspectRatio] || ratios["ASPECT_1_1"], seed: seed || Math.floor(Math.random() * 1000000) };
  }

  const response = await fetch("https://api.ideogram.ai/generate", {
    method: "POST",
    headers: {
      "Api-Key": process.env.IDEOGRAM_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      image_request: {
        prompt: prompt,
        aspect_ratio: aspectRatio,
        model: "V_2",
        magic_prompt_option: "AUTO",
        ...(seed !== undefined ? { seed } : {})
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ideogram API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  if (data.data && data.data.length > 0) {
    return {
      url: data.data[0].url,
      seed: data.data[0].seed
    };
  }
  throw new Error("Invalid response from Ideogram API");
}

// Ideogram API handler
app.post("/api/test-generate", async (req, res) => {
  try {
    const { enhancedPrompt, companyName, tagline, brandVision } = req.body;
    const uid = "test-uid";
    
    // 1. Generate Base Logo (1:1)
    const baseResult = await generateIdeogramImage(enhancedPrompt, "ASPECT_1_1");
    const seed = baseResult.seed;

    // 2. Generate derived assets
    const [socialBanner, websiteHeader, verticalStory] = await Promise.all([
      generateIdeogramImage(enhancedPrompt, "ASPECT_16_9", seed),
      generateIdeogramImage(enhancedPrompt, "ASPECT_3_1", seed).catch(e => {
        console.warn("ASPECT_3_1 failed", e);
        return generateIdeogramImage(enhancedPrompt, "ASPECT_16_9", seed);
      }),
      generateIdeogramImage(enhancedPrompt, "ASPECT_9_16", seed)
    ]);
    
    const assets = {
      baseLogo: baseResult.url,
      socialBanner: socialBanner.url,
      websiteHeader: websiteHeader.url,
      verticalStory: verticalStory.url,
    };
    
    res.json({
      success: true,
      assets
    });
  } catch (error: any) {
    console.error("Test Asset generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate assets" });
  }
});

app.post("/api/generate-assets", requireAuth, async (req, res) => {
  try {
    const { enhancedPrompt, companyName, tagline, brandVision } = req.body;
    const uid = (req as any).user.uid;
    
    // 1. Generate Base Logo (1:1)
    const baseResult = await generateIdeogramImage(enhancedPrompt, "ASPECT_1_1");
    const seed = baseResult.seed;

    // 2. Generate derived assets using the SAME prompt and SAME seed, but different aspect ratios
    // This allows the model to attempt a consistent "Ad Resizer" effect.
    const [socialBanner, websiteHeader, verticalStory] = await Promise.all([
      generateIdeogramImage(enhancedPrompt, "ASPECT_16_9", seed),
      generateIdeogramImage(enhancedPrompt, "ASPECT_3_1", seed).catch(e => {
        console.warn("ASPECT_3_1 failed, falling back to 16:9", e);
        return generateIdeogramImage(enhancedPrompt, "ASPECT_16_9", seed);
      }),
      generateIdeogramImage(enhancedPrompt, "ASPECT_9_16", seed)
    ]);
    
    const assets = {
      baseLogo: baseResult.url,
      socialBanner: socialBanner.url,
      websiteHeader: websiteHeader.url,
      verticalStory: verticalStory.url,
    };
    
    // Save to database
    await db.insert(generations).values({
      userId: uid,
      companyName,
      tagline,
      brandVision,
      enhancedPrompt,
      baseLogoUrl: assets.baseLogo,
      socialBannerUrl: assets.socialBanner,
      websiteHeaderUrl: assets.websiteHeader,
      verticalStoryUrl: assets.verticalStory,
    });
    
    res.json({
      success: true,
      assets
    });
  } catch (error: any) {
    console.error("Asset generation error:", error); require("fs").writeFileSync("server-error.txt", JSON.stringify({message: error.message, stack: error.stack}));
    res.status(500).json({ error: error.message || "Failed to generate assets" });
  }
});

app.post("/api/test-enhance", async (req, res) => {
  try {
    const { companyName, tagline, brandVision } = req.body;
    
    if (!companyName || !brandVision) {
      return res.status(400).json({ error: "Company name and brand vision are required" });
    }

    const systemInstruction = `You are an expert prompt engineer specializing in the Ideogram API.
Your job is to take a simple business description and output a highly detailed, optimized prompt specifically designed for Ideogram's "DESIGN" style.

The output must ONLY contain the final prompt string, nothing else. No pleasantries, no markdown blocks.

The prompt should include:
- The exact company name and tagline formatted as text to be rendered.
- Specific typography instructions (e.g., "bold sans-serif", "elegant serif").
- Description of a minimalist, scalable vector-style aesthetic (flat colors, clean lines, no complex gradients).
- A specific, professional color palette with 2-3 hex codes.
- Minimal or solid color background.
- "flat vector", "clean logo", "corporate identity" keywords.`;

    const contents = `Company Name: "${companyName}"
Tagline: "${tagline || 'None'}"
Brand Vision/Description: "${brandVision}"

Generate the Ideogram prompt.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ enhancedPrompt: response.text?.trim() });
  } catch (error: any) {
    console.error("Test Prompt enhancement error:", error);
    res.status(500).json({ error: error.message || "Failed to enhance prompt" });
  }
});

app.post("/api/enhance-prompt", requireAuth, async (req, res) => {
  try {
    const { companyName, tagline, brandVision } = req.body;
    
    if (!companyName || !brandVision) {
      return res.status(400).json({ error: "Company name and brand vision are required" });
    }

    const systemInstruction = `You are an expert prompt engineer specializing in the Ideogram API.
Your job is to take a simple business description and output a highly detailed, optimized prompt specifically designed for Ideogram's "DESIGN" style.

The output must ONLY contain the final prompt string, nothing else. No pleasantries, no markdown blocks.

The prompt should include:
- The exact company name and tagline formatted as text to be rendered.
- Specific typography instructions (e.g., "bold sans-serif", "elegant serif").
- Description of a minimalist, scalable vector-style aesthetic (flat colors, clean lines, no complex gradients).
- A specific, professional color palette with 2-3 hex codes.
- Minimal or solid color background.
- "flat vector", "clean logo", "corporate identity" keywords.`;

    const contents = `Company Name: "${companyName}"
Tagline: "${tagline || 'None'}"
Brand Vision/Description: "${brandVision}"

Generate the Ideogram prompt.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ enhancedPrompt: response.text?.trim() });
  } catch (error) {
    console.error("Prompt enhancement error:", error);
    res.status(500).json({ error: "Failed to enhance prompt" });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
