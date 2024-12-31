import express from 'express';
import ModerateRouter from "./routes/ModerateRoutes.js";
import authRoutes from "./routes/auth.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import multer from "multer";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(cors({
    credentials:true,
    origin:true,
  }));

app.use("/auth", authRoutes);
app.use("/moderate", ModerateRouter);

app.listen(process.env.PORT, () => {
  console.log('Server is running on port', process.env.PORT);
})