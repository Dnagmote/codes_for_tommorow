import { Router } from 'express';
import healthRoutes from './health.routes';
import chatRoutes from './chat.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/chat', chatRoutes);
router.use('/user', userRoutes);

export default router;
