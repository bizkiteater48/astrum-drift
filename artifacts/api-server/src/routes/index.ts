import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import miningRouter from "./mining";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(miningRouter);

export default router;
