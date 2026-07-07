import { Router, type IRouter } from "express";
import { requireNotBanned } from "../middlewares/ban";
import healthRouter from "./health";
import authRouter from "./auth";
import miningRouter from "./mining";
import chatRouter from "./chat";
import moderationRouter from "./moderation";
import gamblingRouter from "./gambling";
import pokerRouter from "./poker";
import adminRouter from "./admin";
import inboxRouter from "./inbox";
import playersRouter from "./players";
import chatIgnoresRouter from "./chat-ignores";
import stationStorageRouter from "./station-storage";
import mainGameActionsRouter from "./main-game-actions";
import shipCargoRouter from "./ship-cargo";

const router: IRouter = Router();

const BAN_EXEMPT_PATHS = new Set([
  "/healthz",
  "/auth/login",
  "/auth/register",
  "/auth/logout",
]);

router.use(async (req, res, next) => {
  if (BAN_EXEMPT_PATHS.has(req.path)) {
    next();
    return;
  }
  await requireNotBanned(req, res, next);
});

router.use(healthRouter);
router.use(authRouter);
router.use(miningRouter);
router.use(chatRouter);
router.use(moderationRouter);
router.use(gamblingRouter);
router.use(pokerRouter);
router.use(adminRouter);
router.use(inboxRouter);
router.use(playersRouter);
router.use(chatIgnoresRouter);
router.use(stationStorageRouter);
router.use(mainGameActionsRouter);
router.use(shipCargoRouter);

export default router;
