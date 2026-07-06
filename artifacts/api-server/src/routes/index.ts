import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import miningRouter from "./mining";
import chatRouter from "./chat";
import moderationRouter from "./moderation";
import gamblingRouter from "./gambling";
import adminRouter from "./admin";
import inboxRouter from "./inbox";
import playersRouter from "./players";
import chatIgnoresRouter from "./chat-ignores";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(miningRouter);
router.use(chatRouter);
router.use(moderationRouter);
router.use(gamblingRouter);
router.use(adminRouter);
router.use(inboxRouter);
router.use(playersRouter);
router.use(chatIgnoresRouter);

export default router;
