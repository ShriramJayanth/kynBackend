import { GoogleGenerativeAI } from "@google/generative-ai";
import ffmpeg from "fluent-ffmpeg";
import fetch from "node-fetch";
import fs from "fs";
import multer from "multer";
import path from "path";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

  try {
    const genAI = new GoogleGenerativeAI(process.env.API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analyze the following text for inappropriate or harmful content, check in multiple languages as well like Tamil, Hindi, etc. The text may be in English but check for meaning in other languages as well:
      "${text}"
      Provide the result as a JSON object in the following format:
      {
        "flagged": true/false,
        "reason": "Reason why the content was flagged or 'None' if not flagged."
      }
      nothing more than the json , give the result in json format only nothing more not even a single whitespace.
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.candidates[0].content.parts[0].text;

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
      res.status(200).json(response[0].label==="nsfw" ? { flagged: true, reason: "Inappropriate content in the image." } : { flagged: false });
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

    const cleanupFramesDirectory = () => {
      const outputDir = "./frames/";
      if (fs.existsSync(outputDir)) {
        const files = fs.readdirSync(outputDir);
        files.forEach((file) => {
          const filePath = path.join(outputDir, file);
          fs.unlinkSync(filePath);
        });
        fs.rmdirSync(outputDir);
      }
    };

    cleanupFramesDirectory();

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

export const flagUser = async (req, res) => {
  try {
    const { userId } = req.body; // Ensure userId is destructured correctly

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }, // 
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if(user.flags==2){
      await prisma.log.create({
        data: {
          userId: userId,
          activity: "banned due to multiple flags",
        },
      });
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { banned: true },
      });
      return res.status(400).json({ message: "User banned due to multiple flags", user: updatedUser});
    }
    // Perform your logic here, e.g., increment a flag count
    await prisma.log.create({
      data: {
        userId: userId,
        activity: "flagged due to inappropriate content",
      },
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { flags: { increment: 1 } },
    });

    return res.status(200).json({ message: "User flagged", user: updatedUser });
  } catch (error) {
    console.error("Error flagging user:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getLogs = async (req, res) => {
  try {
    const logs = await prisma.log.findMany({
      orderBy: { timestamp: "desc" },
    });

    res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: "Failed to fetch logs." });
  }
};

