import express from 'express';
import ModerateRouter from "./routes/ModerateRoutes.js";
import cors from "cors";
import multer from "multer";

const app = express();
app.use(express.json());

app.use(cors());

app.use("/moderate", ModerateRouter);

app.listen(3001, () => {
  console.log('Server is running on http://localhost:3001');
})