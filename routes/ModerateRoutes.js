import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import { moderateText,moderateImage,moderateVideo, flagUser, getLogs } from "../controllers/ModerateController.js";

const router = express.Router();
const upload=multer();
dotenv.config();


router.post("/text",moderateText);
router.post("/image",upload.single("image") ,moderateImage);
router.post("/video", upload.single("video"), moderateVideo);
router.put("/flag",flagUser);
router.get("/logs",getLogs)

export default router;