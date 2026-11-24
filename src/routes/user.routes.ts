import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { validateRequest } from '../middleware/validate.middleware';
import {
  createUserSchema,
  getUserChatsSchema,
} from '../validations/user.validation';

const router = Router();

// POST /user/create
router.post('/create', validateRequest(createUserSchema), userController.createUser);

// GET /user/:userId/chats
router.get(
  '/:userId/chats',
  validateRequest(getUserChatsSchema),
  userController.getUserChats
);

export default router;
