// routes/notificationRoutes.js
import express from 'express';
import { createNotification, getNotifications, getUnreadCount, markAllNotificationsAsRead, markNotificationAsRead, registerToken, unregisterToken } from '../controllers/notificationController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
const router = express.Router();
router.post('/register-token', registerToken);
router.post('/unregister-token', unregisterToken);



router.use(verifyToken);


// Get notifications with pagination
router.get('/', getNotifications);

// Mark single notification as read
router.post('/mark-read', markNotificationAsRead);

// Mark all notifications as read for a user
router.post('/mark-all-read', markAllNotificationsAsRead);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Create new notification (for testing or admin use)
router.post('/', createNotification);



export default router;
