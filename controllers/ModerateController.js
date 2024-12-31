import { GoogleGenerativeAI } from "@google/generative-ai";
import ffmpeg from "fluent-ffmpeg";
import fetch from "node-fetch";
import fs from "fs";
import multer from "multer";
import path from "path";

export const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const mimeTypes = ["video/mp4", "video/x-matroska", "video/avi"];
    if (!mimeTypes.includes(file.mimetype)) {
      return cb(new Error("Invalid file type. Only video files are allowed."));
    }
    cb(null, true);
  },
});

export const moderateText = async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required for moderation." });
  }

  if (!process.env.API_KEY) {
    console.error("Error: Google Generative AI API key is not set.");
    return res.status(500).json({ error: "Server configuration issue. API key missing." });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analyze the following text for inappropriate or harmful content, including in multiple languages (e.g., Tamil, Hindi). 
      The text may be in English but check its meaning in other languages as well:
      "${text}"
      Provide the result as a JSON object in the following format:
      {
        "flagged": true/false,
        "reason": "Reason why the content was flagged or 'None' if not flagged."
      }
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      return res.status(500).json({ error: "Unexpected response format from Generative AI API." });
    }

    responseText = responseText.replace(/```json|```/g, "").trim();
    const moderationResult = JSON.parse(responseText);

    res.status(200).json(moderationResult);
  } catch (error) {
    console.error("Error moderating text:", error);

    res.status(500).json({
      flagged: false,
      reason: "Unable to process the text at the moment.",
    });
  }
};

export const moderateImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file uploaded." });
  }

  const imageBuffer = req.file.buffer;

  query(imageBuffer)
    .then((response) => {
      res.status(200).json(response);
    })
    .catch((error) => {
      console.error("Error processing the image:", error);
      res.status(500).json({ error: "Failed to process the image." });
    });
};

async function query(imageBuffer) {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/Falconsai/nsfw_image_detection",
    {
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: imageBuffer,
    }
  );

  const result = await response.json();
  return result;
}

export const moderateVideo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No video file uploaded." });
  }

  const uploadsDir = path.resolve("./uploads");
  const videoPath = path.join(uploadsDir, `${Date.now()}-${req.file.originalname}`);

  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(videoPath, req.file.buffer);

    const frames = await extractFrames(videoPath);

    const results = await Promise.all(frames.map((frame) => analyzeFrame(frame)));

    const flaggedFrames = results.filter((result) => result.flagged);
    const isFlagged = flaggedFrames.length / results.length > 0.2;

    res.status(200).json({
      flagged: isFlagged,
      reason: isFlagged ? "Inappropriate content in video frames" : null,
      frameDetails: flaggedFrames,
    });
  } catch (error) {
    console.error("Error processing video:", error);
    res.status(500).json({ error: "Failed to process the video." });
  } finally {
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
  }
};

const extractFrames = (videoPath) => {
  const outputDir = "./frames/";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const framePaths = [];
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(`${outputDir}%04d.png`)
      .fps(1)
      .on("end", () => {
        const files = fs.readdirSync(outputDir).map((file) => `${outputDir}${file}`);
        resolve(files);
      })
      .on("error", (err) => reject(err))
      .run();
  });
};

const analyzeFrame = async (framePath) => {
  const data = fs.readFileSync(framePath);
  const response = await fetch(
    "https://api-inference.huggingface.co/models/Falconsai/nsfw_image_detection",
    {
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: data,
    }
  );

  const result = await response.json();
  return { flagged: result.flagged, reason: result.reason, framePath };
};
