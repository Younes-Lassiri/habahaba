import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import pool, { initDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import deliveryManRoutes from "./routes/deliveryManRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from './routes/notificationRoutes.js';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import adminNotificationRoutes from './routes/adminNotificationRoutes.js';
import { checkAndUpdateIsOpen, initOperatingHoursTable } from './controllers/adminController.js';
dotenv.config();

// ============ BULLETPROOF CRASH HANDLERS ============
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', new Date().toISOString());
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 UNHANDLED REJECTION:', new Date().toISOString());
  console.error('Reason:', reason);
});
// ====================================================

const app = express();

// Configure CORS with explicit options
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  let finished = false;

  console.log(`--> ${req.method} ${req.originalUrl}`);

  res.on('finish', () => {
    finished = true;
    console.log(`<-- ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });

  res.on('close', () => {
    if (!finished) {
      console.log(`xx> ${req.method} ${req.originalUrl} closed ${Date.now() - start}ms`);
    }
  });

  next();
});

app.use((req, res, next) => {
  res.setTimeout(15000, () => {
    console.error(`TIMEOUT ${req.method} ${req.originalUrl}`);
    if (!res.headersSent) {
      res.status(504).json({ message: 'Request timeout' });
    }
  });
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/delivery", deliveryManRoutes);
app.use("/api/admin", adminRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/notifications', notificationRoutes);
app.use('/api/notifications', adminNotificationRoutes); // Add this line
const PORT = process.env.PORT || 8000;

// Create HTTP server
const server = createServer(app);

// Create WebSocket server attached to the same HTTP server
const wss = new WebSocketServer({
  server,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024
  }
});

// Store connected clients: {userId}_{userType} -> WebSocket
const connectedClients = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`🔌 New WebSocket connection from ${clientIp}`);

  // Set up ping/pong to keep connection alive
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

ws.on('message', async (message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log('📨 WebSocket message received:', data.type, 'from', data.userId, data.userType);

    if (data.type === 'subscribe' && data.userId && data.userType) {
      const clientKey = `${data.userId}_${data.userType}`;
      connectedClients.set(clientKey, ws);
      ws.clientKey = clientKey;
      ws.userId = data.userId;
      ws.userType = data.userType;

      console.log(`📱 ${data.userType} ${data.userId} subscribed to notifications`);
      console.log(`🔗 Total connected clients: ${connectedClients.size}`);

      try {
        const [result] = await pool.query(
          "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND user_type = ? AND is_read = 0",
          [data.userId, data.userType]
        );
        const unreadCount = result[0]?.count || 0;
        console.log(`📊 Sending unread count to ${data.userType} ${data.userId}: ${unreadCount}`);
        ws.send(JSON.stringify({ type: 'unread_count_update', count: unreadCount }));
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    }

    if (data.type === 'notification_read' && data.notificationId) {
      try {
        await pool.query(
          "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ? AND user_type = ?",
          [data.notificationId, ws.userId, ws.userType]
        );
        console.log(`✅ Notification ${data.notificationId} marked as read by ${ws.userType} ${ws.userId}`);

        const [result] = await pool.query(
          "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND user_type = ? AND is_read = 0",
          [ws.userId, ws.userType]
        );
        const unreadCount = result[0]?.count || 0;
        ws.send(JSON.stringify({ type: 'unread_count_update', count: unreadCount }));
        console.log(`📊 Updated unread count for ${ws.userType} ${ws.userId}: ${unreadCount}`);
      } catch (error) {
        console.error('Error updating notification read status:', error);
      }
    }

  } catch (error) {
    console.error('Error parsing WebSocket message:', error);
  }
  // No finally needed — no manual connections held
});

  ws.on('close', () => {
    if (ws.clientKey) {
      connectedClients.delete(ws.clientKey);
      console.log(`👋 ${ws.userType || 'User'} ${ws.userId || 'Unknown'} disconnected from WebSocket`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Function to send notification to specific user
export const sendNotificationToUser = async (userId, userType, notificationData) => {
  const clientKey = `${userId}_${userType}`;
  const ws = connectedClients.get(clientKey);

  if (!ws || ws.readyState !== 1) {
    console.log(`⚠️ ${userType} ${userId} not connected to WebSocket`);
    return false;
  }

  try {
    ws.send(JSON.stringify({ type: 'new_notification', data: notificationData }));
    console.log(`📨 Sent real-time notification to ${userType} ${userId}`);

    const [result] = await pool.query(
      "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND user_type = ? AND is_read = 0",
      [userId, userType]
    );
    const unreadCount = result[0]?.count || 0;
    ws.send(JSON.stringify({ type: 'unread_count_update', count: unreadCount }));
    console.log(`📊 Sent unread count update to ${userType} ${userId}: ${unreadCount}`);

    return true;
  } catch (error) {
    console.error(`Error sending to ${userType} ${userId}:`, error);
    return false;
  }
};

// Function to broadcast to all users of a type
export const broadcastToUserType = (userType, data) => {
  let sentCount = 0;
  console.log(`📢 Broadcasting to ${userType}, data type: ${data.type}`);

  connectedClients.forEach((ws, key) => {
    if (key.endsWith(`_${userType}`) && ws.readyState === 1) {
      try {
        ws.send(JSON.stringify(data));
        sentCount++;
        console.log(`   ✅ Sent to ${key}`);
      } catch (error) {
        console.error(`   ❌ Error broadcasting to ${key}:`, error.message);
      }
    }
  });

  console.log(`📢 Broadcasted to ${sentCount} ${userType}(s)`);
  return sentCount;
};

// Process notification queue for offline users - FIXED with proper connection management
let isProcessingQueue = false;

const processNotificationQueue = async () => {
  let connection;

  if (isProcessingQueue) {
    console.log('⏭️ Skipping queue run: previous run still active');
    return;
  }

  isProcessingQueue = true;

  try {
    connection = await pool.getConnection();

    const [pendingNotifications] = await connection.query(`
      SELECT nq.*, n.title, n.message, n.is_read, n.created_at
      FROM notification_queue nq
      JOIN notifications n ON nq.notification_id = n.id
      WHERE nq.processed = FALSE
        AND nq.created_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)
        AND nq.attempts < 3
      ORDER BY nq.created_at ASC
      LIMIT 20
    `);

    if (pendingNotifications.length > 0) {
      console.log(`🔍 Processing ${pendingNotifications.length} queued notifications`);
    }

    for (const queueItem of pendingNotifications) {
      try {
        let notificationData = {};

        if (queueItem.data) {
          try {
            notificationData =
              typeof queueItem.data === 'string'
                ? JSON.parse(queueItem.data)
                : queueItem.data;
          } catch (parseError) {
            console.error(`Error parsing data for queue item ${queueItem.id}:`, parseError);
            notificationData = {};
          }
        }

        const sent = await sendNotificationToUser(
          queueItem.user_id.toString(),
          queueItem.user_type,
          {
            id: queueItem.notification_id,
            title: queueItem.title,
            message: queueItem.message,
            is_read: queueItem.is_read,
            created_at: queueItem.created_at,
            data: notificationData
          }
        );

        if (sent) {
          await pool.query(
            'UPDATE notification_queue SET processed = TRUE WHERE id = ?',
            [queueItem.id]
          );
          console.log(`✅ Queued notification sent to ${queueItem.user_type} ${queueItem.user_id}`);
        } else {
          await pool.query(
            'UPDATE notification_queue SET attempts = attempts + 1 WHERE id = ?',
            [queueItem.id]
          );
        }
      } catch (error) {
        console.error(`Error processing queue item ${queueItem.id}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error processing notification queue:', error);
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Error releasing main connection:', releaseError.message);
      }
    }

    isProcessingQueue = false;
  }
};

// Keep connections alive with ping/pong - REDUCED FREQUENCY
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`💀 Terminating dead WebSocket connection: ${ws.clientKey || 'unknown'}`);
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 120000); // CHANGED: Ping every 2 minutes instead of 30 seconds

// Process queue every 30 seconds instead of 3 seconds
//const queueInterval = setInterval(processNotificationQueue, 30000); // CHANGED: Every 30 seconds

// Function to log database notification status
const logNotificationStatus = async () => {
  try {
    const [adminNotifications] = await pool.query(
      "SELECT COUNT(*) as total, SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread FROM notifications WHERE user_type = 'admin'"
    );
    const [adminQueue] = await pool.query(
      "SELECT COUNT(*) as total FROM notification_queue WHERE user_type = 'admin' AND processed = FALSE"
    );
    const [activeAdmins] = await pool.query(
      "SELECT COUNT(*) as total FROM admins WHERE is_active = 1"
    );
    console.log('📊 NOTIFICATION STATUS:');
    console.log(`   👑 Active Admins: ${activeAdmins[0]?.total || 0}`);
    console.log(`   📨 Admin Notifications: ${adminNotifications[0]?.total || 0} total, ${adminNotifications[0]?.unread || 0} unread`);
    console.log(`   ⏳ Admin Queue Pending: ${adminQueue[0]?.total || 0}`);
    console.log(`   🔗 Connected Clients: ${connectedClients.size}`);
    let adminConnections = 0;
    connectedClients.forEach((ws, key) => {
      if (key.includes('_admin')) adminConnections++;
    });
    console.log(`   📱 Connected Admin Clients: ${adminConnections}`);
  } catch (error) {
    console.error('Error logging notification status:', error);
  }
};

// Add periodic logging
// const statusLogInterval = setInterval(logNotificationStatus, 30000); // Every 30 seconds

// Scheduler for automatic is_open updates (runs every minute)
let isOpenSchedulerInterval = null;

const startIsOpenScheduler = () => {
  // Run immediately on startup
  checkAndUpdateIsOpen().then(isOpen => {
    console.log(`🕐 Initial restaurant status: ${isOpen ? 'OPEN' : 'CLOSED'}`);
  }).catch(err => {
    console.error('Error on initial is_open check:', err);
  });

  // Then run every minute
  isOpenSchedulerInterval = setInterval(async () => {
    try {
      await checkAndUpdateIsOpen();
    } catch (error) {
      console.error('Error in is_open scheduler:', error);
    }
  }, 60000); // Every 60 seconds

  console.log('⏰ Restaurant open/close scheduler started (checks every minute)');
};

// Cleanup on server shutdown
server.on('close', () => {
  clearInterval(pingInterval);
  //clearInterval(queueInterval);
  //clearInterval(statusLogInterval);
  if (isOpenSchedulerInterval) {
    clearInterval(isOpenSchedulerInterval);
    console.log('⏰ Restaurant scheduler stopped');
  }
  console.log('🔌 WebSocket server cleanup complete');
});

// Wrap in async IIFE to call initDB before server starts
(async () => {
  try {
    await initDB(); // ✅ create table if it doesn't exist

    // Initialize operating hours table
    await initOperatingHoursTable();

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT} (HTTP & WebSocket)`);
      console.log(`🌐 WebSocket URL: ws://localhost:${PORT}`);

      // Start the is_open scheduler
      startIsOpenScheduler();

      // Log initial status after 5 seconds
      setTimeout(() => {
        logNotificationStatus();
      }, 5000);
    });
  } catch (error) {
    console.error("❌ Failed to initialize DB:", error.message);
    process.exit(1);
  }
})();

export { wss };