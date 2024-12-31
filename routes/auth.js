import express from "express";
import { register,login,user, logout} from "../controllers/auth.js";

const router=express.Router();

router.post("/register",register);
router.post("/login",login);
router.get("/user",user);
router.post("/logout",logout);

export default router;