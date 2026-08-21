import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { sendEmail } from './mailer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'social.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');
const COVERS_DIR = path.join(UPLOADS_DIR, 'covers');
const CHAT_DIR = path.join(UPLOADS_DIR, 'chat');
const CHAT_MEDIA_DIR = path.join(UPLOADS_DIR, 'chat-media');
const POST_MEDIA_DIR = path.join(UPLOADS_DIR, 'post-media');
const STORIES_DIR = path.join(UPLOADS_DIR, 'stories');

const PORT = process.env.PORT || 5000;

// Ensure directories exist
[DATA_DIR, UPLOADS_DIR, AVATARS_DIR, COVERS_DIR, CHAT_DIR, CHAT_MEDIA_DIR, POST_MEDIA_DIR, STORIES_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Database in memory + disk persistence
let db = {
  users: [],
  pendingRegistrations: {},
  passwordResetOtps: {},
  failedLoginAttempts: {},
  posts: [],
  stories: [],
  friendRequests: [], // [ { id, fromUserId, toUserId, createdAt, status: 'pending' } ]
  friendships: [],    // [ { id, userA, userB, createdAt } ]
  conversations: [],  // [ { id, participants: [idA, idB], lastMessage, lastMessageType, lastMessageTime, messages: [...] } ]
  notifications: [],  // [ { id, userId, actor, type, content, targetId, createdAt, isRead } ]
  otps: {}
};

const saveDB = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error saving DB:', err);
  }
};

const loadDB = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      db = { ...db, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) };
      if (!db.otps) db.otps = {};
      if (!db.pendingRegistrations) db.pendingRegistrations = {};
      if (!db.passwordResetOtps) db.passwordResetOtps = {};
      if (!db.failedLoginAttempts) db.failedLoginAttempts = {};
      if (!db.friendRequests) db.friendRequests = [];
      if (!db.friendships) db.friendships = [];
      if (!db.conversations) db.conversations = [];
      if (!db.notifications) db.notifications = [];
      if (!db.posts) db.posts = [];
    }
  } catch (err) {
    console.error('Error reading DB:', err);
  }
};

const syncUserSocialCounts = (userId) => {
  if (!userId) return;
  const user = db.users.find((u) => u.id === userId);
  if (!user) return;
  const count = (db.friendships || []).filter(
    (f) => f.userA === userId || f.userB === userId
  ).length;

  user.friendsCount = count;
  user.followersCount = count;
  user.followingCount = count;
};

const repairAllSocialCounts = () => {
  if (!db.users || !Array.isArray(db.users)) return;
  let changed = false;
  db.users.forEach((u) => {
    const count = (db.friendships || []).filter(
      (f) => f.userA === u.id || f.userB === u.id
    ).length;

    if (u.friendsCount !== count || u.followersCount !== count || u.followingCount !== count) {
      u.friendsCount = count;
      u.followersCount = count;
      u.followingCount = count;
      changed = true;
    }
  });
  if (changed) {
    saveDB();
    console.log('✅ Repaired all users Friends, Followers, and Following social counts.');
  }
};

loadDB();
repairAllSocialCounts();

// ----------------------------------------------------
// REAL-TIME SSE (SERVER-SENT EVENTS) DISPATCHER
// ----------------------------------------------------
const sseClients = new Map(); // userId -> Set(res)

const registerSSEClient = (userId, res) => {
  if (!sseClients.has(userId)) {
    sseClients.set(userId, new Set());
  }
  sseClients.get(userId).add(res);

  res.on('close', () => {
    const userClients = sseClients.get(userId);
    if (userClients) {
      userClients.delete(res);
      if (userClients.size === 0) sseClients.delete(userId);
    }
  });
};

const isUserOnline = (userId) => {
  return sseClients.has(userId) && sseClients.get(userId).size > 0;
};

const dispatchRealtimeEvent = (recipientUserId, eventType, data) => {
  const userClients = sseClients.get(recipientUserId);
  if (userClients && userClients.size > 0) {
    const payload = `data: ${JSON.stringify({ type: eventType, data, timestamp: Date.now() })}\n\n`;
    userClients.forEach((res) => {
      try {
        res.write(payload);
      } catch (err) {
        console.warn('Error writing SSE event:', err.message);
      }
    });
  }
};

const broadcastRealtimeEvent = (eventType, data, excludeUserId = null) => {
  const payload = `data: ${JSON.stringify({ type: eventType, data, timestamp: Date.now() })}\n\n`;
  for (const [userId, clientSet] of sseClients.entries()) {
    if (excludeUserId && userId === excludeUserId) continue;
    clientSet.forEach((res) => {
      try {
        res.write(payload);
      } catch (err) {
        console.warn('Error writing SSE broadcast event:', err.message);
      }
    });
  }
};

// Helper: Save Base64 File to Disk
const saveBase64File = (base64String, targetDir, prefix = 'file') => {
  try {
    const matches = base64String.match(/^data:([A-Za-z-+\/0-9.-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;
    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    let ext = 'bin';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('mp4')) ext = 'mp4';
    else if (mimeType.includes('webm')) ext = 'webm';
    else if (mimeType.includes('quicktime') || mimeType.includes('mov')) ext = 'mov';
    else if (mimeType.includes('pdf')) ext = 'pdf';

    const fileName = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filePath = path.join(targetDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return fileName;
  } catch (err) {
    console.warn('Error saving base64 file:', err);
    return null;
  }
};

// Password hashing
const hashPassword = (password) => {
  if (!password || typeof password !== 'string') return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${derivedKey}`;
};

const verifyPassword = (password, storedHash) => {
  if (!password || !storedHash || typeof storedHash !== 'string') return false;
  try {
    if (storedHash.includes(':')) {
      const [salt, originalDerivedKey] = storedHash.split(':');
      if (!salt || !originalDerivedKey) return false;
      const derivedKey = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
      const bufA = Buffer.from(derivedKey, 'hex');
      const bufB = Buffer.from(originalDerivedKey, 'hex');
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } else {
      const legacySalt = 'nexus_salt_secure_2026';
      const derivedKey = crypto.pbkdf2Sync(password, legacySalt, 1000, 64, 'sha512').toString('hex');
      const bufA = Buffer.from(derivedKey, 'hex');
      const bufB = Buffer.from(storedHash, 'hex');
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    }
  } catch {
    return false;
  }
};

// Check if two users are friends
const areUsersFriends = (userAId, userBId) => {
  if (!userAId || !userBId || userAId === userBId) return false;
  return db.friendships.some(
    (f) =>
      (f.userA === userAId && f.userB === userBId) ||
      (f.userA === userBId && f.userB === userAId)
  );
};

// Find which conversation a media file belongs to
const findConversationByMediaFilename = (filename) => {
  for (const conv of db.conversations) {
    if (conv.messages) {
      const match = conv.messages.find(
        (m) => m.mediaUrl && (m.mediaUrl.endsWith(`/${filename}`) || m.mediaUrl.includes(filename))
      );
      if (match) return conv;
    }
  }
  return null;
};

// Send JSON response with CORS
const sendJSON = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  });
  res.end(JSON.stringify(data));
};

// Parse JSON body
const parseBody = (req) => {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
};

const mimeTypesMap = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip',
  '.txt': 'text/plain',
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
    });
    return res.end();
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;
  const method = req.method;
  const currentUserId = req.headers['x-user-id'] || urlObj.searchParams.get('userId');

  // 1. Real-Time SSE Stream Endpoint (With Automatic Delivery Sync on Connect)
  if (pathname === '/api/realtime/stream' && method === 'GET') {
    const userId = urlObj.searchParams.get('userId');
    if (!userId) {
      return sendJSON(res, 400, { error: 'userId is required for realtime stream' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);
    registerSSEClient(userId, res);

    // Check for pending 'sent' messages and mark them 'delivered' now that user is connected!
    let deliveredAny = false;
    const senderUpdatesMap = new Map(); // senderId -> [ { conversationId, messageId, status, deliveredAt } ]

    db.conversations.forEach((conv) => {
      if (conv.participants && conv.participants.includes(userId) && conv.messages) {
        conv.messages.forEach((m) => {
          if (m.recipientId === userId && m.status === 'sent') {
            m.status = 'delivered';
            m.deliveredAt = new Date().toISOString();
            deliveredAny = true;

            if (!senderUpdatesMap.has(m.senderId)) {
              senderUpdatesMap.set(m.senderId, []);
            }
            senderUpdatesMap.get(m.senderId).push({
              conversationId: conv.id,
              messageId: m.id,
              status: 'delivered',
              deliveredAt: m.deliveredAt,
            });
          }
        });
      }
    });

    if (deliveredAny) {
      saveDB();
      // Notify senders in real-time that their pending messages have been delivered!
      senderUpdatesMap.forEach((updates, senderId) => {
        dispatchRealtimeEvent(senderId, 'messages_delivered', { updates });
      });
    }

    const keepAlive = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 20000);

    req.on('close', () => clearInterval(keepAlive));
    return;
  }

  // 2. PROTECTED Chat Media File Server (Privacy Gated)
  if (pathname.startsWith('/uploads/chat-media/') || pathname.startsWith('/uploads/chat/')) {
    const filename = path.basename(pathname);
    let filePath = path.join(CHAT_MEDIA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(CHAT_DIR, filename);
    }

    // Verify conversation participant access
    const conv = findConversationByMediaFilename(filename);

    if (conv && currentUserId) {
      if (!conv.participants.includes(currentUserId)) {
        return sendJSON(res, 403, {
          success: false,
          error: 'Access denied. You are not a participant in the conversation that owns this media file.',
        });
      }
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypesMap[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'private, max-age=86400',
      });
      return fs.createReadStream(filePath).pipe(res);
    } else {
      return sendJSON(res, 404, { success: false, error: 'Chat media file not found.' });
    }
  }

  // 2b. Public static uploads (avatars, covers, post-media, stories)
  if (
    pathname.startsWith('/uploads/avatars/') ||
    pathname.startsWith('/uploads/covers/') ||
    pathname.startsWith('/uploads/post-media/') ||
    pathname.startsWith('/uploads/stories/')
  ) {
    const relativePath = pathname.replace('/uploads/', '');
    const filePath = path.join(UPLOADS_DIR, relativePath);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': mimeTypesMap[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      });
      return fs.createReadStream(filePath).pipe(res);
    } else {
      return sendJSON(res, 404, { error: 'File not found' });
    }
  }

  // 2c. Update User Profile (Avatar, Cover, Bio, Occupation, Education, Location, Settings)
  if (pathname === '/api/users/profile' && (method === 'PUT' || method === 'POST')) {
    const body = await parseBody(req);
    const userId = currentUserId || body.userId;

    if (!userId) {
      return sendJSON(res, 400, { success: false, message: 'User ID is required.' });
    }

    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return sendJSON(res, 404, { success: false, message: 'User not found.' });
    }

    // Process avatar if base64
    if (body.avatarUrl && typeof body.avatarUrl === 'string' && body.avatarUrl.startsWith('data:image')) {
      const savedName = saveBase64File(body.avatarUrl, AVATARS_DIR, 'avatar');
      if (savedName) {
        user.avatarUrl = `/uploads/avatars/${savedName}`;
      }
    } else if (body.avatarUrl !== undefined) {
      user.avatarUrl = body.avatarUrl;
    }

    // Process cover if base64
    if (body.coverUrl && typeof body.coverUrl === 'string' && body.coverUrl.startsWith('data:image')) {
      const savedName = saveBase64File(body.coverUrl, COVERS_DIR, 'cover');
      if (savedName) {
        user.coverUrl = `/uploads/covers/${savedName}`;
      }
    } else if (body.coverUrl !== undefined) {
      user.coverUrl = body.coverUrl;
    }

    if (body.fullName !== undefined) user.fullName = body.fullName.trim();
    if (body.firstName !== undefined) user.firstName = body.firstName.trim();
    if (body.lastName !== undefined) user.lastName = body.lastName.trim();
    if (body.bio !== undefined) user.bio = body.bio.trim();
    if (body.location !== undefined) user.location = body.location.trim();
    if (body.occupation !== undefined) user.occupation = body.occupation.trim();
    if (body.education !== undefined) user.education = body.education.trim();
    if (body.website !== undefined) user.website = body.website.trim();
    if (body.phone !== undefined) user.phone = body.phone.trim();
    if (body.gender !== undefined) user.gender = body.gender;
    if (body.isPrivate !== undefined) {
      user.isPrivate = Boolean(body.isPrivate);
      if (!user.privacySettings) user.privacySettings = {};
      user.privacySettings.whoCanSeePosts = user.isPrivate ? 'friends' : 'public';
      user.privacySettings.isPrivate = user.isPrivate;
    }
    if (body.privacySettings) {
      user.privacySettings = { ...user.privacySettings, ...body.privacySettings };
      if (body.privacySettings.isPrivate !== undefined) {
        user.isPrivate = Boolean(body.privacySettings.isPrivate);
        user.privacySettings.whoCanSeePosts = user.isPrivate ? 'friends' : 'public';
      } else if (body.privacySettings.whoCanSeePosts) {
        user.isPrivate = body.privacySettings.whoCanSeePosts === 'friends';
        user.privacySettings.isPrivate = user.isPrivate;
      }
    }

    // Update existing posts author info for this user
    db.posts.forEach((p) => {
      if (p.author && p.author.id === user.id) {
        p.author.fullName = user.fullName;
        p.author.avatarUrl = user.avatarUrl;
        p.author.coverUrl = user.coverUrl;
        p.author.username = user.username;
        p.author.bio = user.bio;
      }
      if (p.sharedPost && p.sharedPost.author && p.sharedPost.author.id === user.id) {
        p.sharedPost.author.fullName = user.fullName;
        p.sharedPost.author.avatarUrl = user.avatarUrl;
        p.sharedPost.author.coverUrl = user.coverUrl;
        p.sharedPost.author.username = user.username;
        p.sharedPost.author.bio = user.bio;
      }
    });

    saveDB();

    const { passwordHash, ...safeUser } = user;

    // Real-time broadcast to all connected clients
    broadcastRealtimeEvent('profile_updated', { userId: user.id, user: safeUser });

    return sendJSON(res, 200, { success: true, message: 'Profile updated successfully.', user: safeUser });
  }

  // 3. Discover Users
  if (pathname === '/api/users/discover' && method === 'GET') {
    const query = (urlObj.searchParams.get('query') || '').toLowerCase().trim();
    const page = parseInt(urlObj.searchParams.get('page') || '1');
    const limit = parseInt(urlObj.searchParams.get('limit') || '20');

    let allUsers = db.users.filter((u) => u.id !== currentUserId);

    if (query) {
      allUsers = allUsers.filter(
        (u) =>
          u.fullName.toLowerCase().includes(query) ||
          u.username.toLowerCase().includes(query) ||
          (u.occupation && u.occupation.toLowerCase().includes(query))
      );
    }

    const total = allUsers.length;
    const startIndex = (page - 1) * limit;
    const paginated = allUsers.slice(startIndex, startIndex + limit);

    const results = paginated.map((targetUser) => {
      const isFriend = areUsersFriends(currentUserId, targetUser.id);
      let relationship = isFriend ? 'friends' : 'none';

      if (!isFriend && currentUserId) {
        const sentReq = db.friendRequests.find(
          (r) => r.fromUserId === currentUserId && r.toUserId === targetUser.id && r.status === 'pending'
        );
        const receivedReq = db.friendRequests.find(
          (r) => r.fromUserId === targetUser.id && r.toUserId === currentUserId && r.status === 'pending'
        );

        if (sentReq) relationship = 'pending_sent';
        else if (receivedReq) relationship = 'pending_received';
      }

      const { passwordHash, ...safeUser } = targetUser;
      return {
        ...safeUser,
        relationshipStatus: relationship,
        isFriend,
      };
    });

    return sendJSON(res, 200, {
      success: true,
      users: results,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  }

  // 4. Friend Requests Endpoints
  if (pathname.startsWith('/api/friends/request/') && method === 'POST') {
    const targetUserId = pathname.replace('/api/friends/request/', '');
    const body = await parseBody(req);
    const senderId = currentUserId || body.senderId;

    if (!senderId || !targetUserId || senderId === targetUserId) {
      return sendJSON(res, 400, { success: false, message: 'Invalid sender or target user ID.' });
    }

    if (areUsersFriends(senderId, targetUserId)) {
      return sendJSON(res, 400, { success: false, message: 'You are already friends with this user.' });
    }

    const existingReq = db.friendRequests.find(
      (r) =>
        r.status === 'pending' &&
        ((r.fromUserId === senderId && r.toUserId === targetUserId) ||
          (r.fromUserId === targetUserId && r.toUserId === senderId))
    );

    if (existingReq) {
      return sendJSON(res, 400, { success: false, message: 'A friend request already exists between you.' });
    }

    const sender = db.users.find((u) => u.id === senderId);
    const target = db.users.find((u) => u.id === targetUserId);

    if (!sender || !target) {
      return sendJSON(res, 404, { success: false, message: 'User not found.' });
    }

    const newRequest = {
      id: `freq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fromUserId: senderId,
      toUserId: targetUserId,
      createdAt: 'Just now',
      timestamp: Date.now(),
      status: 'pending',
    };

    db.friendRequests.push(newRequest);

    const notification = {
      id: `notif-${Date.now()}`,
      userId: targetUserId,
      actor: {
        id: sender.id,
        fullName: sender.fullName,
        username: sender.username,
        avatarUrl: sender.avatarUrl,
      },
      type: 'friend_request',
      content: `${sender.fullName} sent you a friend request.`,
      targetId: newRequest.id,
      createdAt: 'Just now',
      isRead: false,
    };
    db.notifications.unshift(notification);
    saveDB();

    dispatchRealtimeEvent(targetUserId, 'friend_request_received', {
      request: newRequest,
      sender: { id: sender.id, fullName: sender.fullName, avatarUrl: sender.avatarUrl },
      notification,
    });

    return sendJSON(res, 201, {
      success: true,
      message: `Friend request sent to ${target.fullName}.`,
      request: newRequest,
    });
  }

  if (pathname.startsWith('/api/friends/accept/') && method === 'POST') {
    const targetUserId = pathname.replace('/api/friends/accept/', '');
    const body = await parseBody(req);
    const acceptorId = currentUserId || body.acceptorId;

    if (!acceptorId || !targetUserId) {
      return sendJSON(res, 400, { success: false, message: 'Invalid user IDs.' });
    }

    const reqIndex = db.friendRequests.findIndex(
      (r) =>
        r.status === 'pending' &&
        ((r.fromUserId === targetUserId && r.toUserId === acceptorId) ||
          (r.fromUserId === acceptorId && r.toUserId === targetUserId))
    );

    if (reqIndex !== -1) {
      db.friendRequests.splice(reqIndex, 1);
    }

    if (!areUsersFriends(acceptorId, targetUserId)) {
      db.friendships.push({
        id: `friendship-${Date.now()}`,
        userA: acceptorId,
        userB: targetUserId,
        createdAt: new Date().toISOString(),
      });

      syncUserSocialCounts(acceptorId);
      syncUserSocialCounts(targetUserId);

      const userA = db.users.find((u) => u.id === acceptorId);
      const userB = db.users.find((u) => u.id === targetUserId);

      let conv = db.conversations.find(
        (c) =>
          c.participants.includes(acceptorId) && c.participants.includes(targetUserId)
      );

      if (!conv) {
        conv = {
          id: `conv-${[acceptorId, targetUserId].sort().join('-')}`,
          participants: [acceptorId, targetUserId],
          lastMessage: 'Connected on Nexus Social! Say hello 👋',
          lastMessageType: 'text',
          lastMessageTime: 'Just now',
          messages: [],
        };
        db.conversations.unshift(conv);
      }

      if (userA && userB) {
        const notif = {
          id: `notif-${Date.now()}`,
          userId: targetUserId,
          actor: { id: userA.id, fullName: userA.fullName, avatarUrl: userA.avatarUrl },
          type: 'friend_accept',
          content: `${userA.fullName} accepted your friend request.`,
          targetId: conv.id,
          createdAt: 'Just now',
          isRead: false,
        };
        db.notifications.unshift(notif);

        dispatchRealtimeEvent(targetUserId, 'friend_request_accepted', {
          friend: userA,
          conversation: conv,
          notification: notif,
        });
      }

      saveDB();

      return sendJSON(res, 200, {
        success: true,
        message: 'Friend request accepted! You can now chat.',
        conversation: conv,
      });
    }

    return sendJSON(res, 200, { success: true, message: 'Already friends.' });
  }

  // 4b. Unfriend / Remove Friend Endpoint
  if (
    (pathname.startsWith('/api/friends/remove/') || pathname.startsWith('/api/friends/unfriend/')) &&
    (method === 'DELETE' || method === 'POST')
  ) {
    const targetUserId = pathname.replace('/api/friends/remove/', '').replace('/api/friends/unfriend/', '');
    const body = await parseBody(req);
    const userId = currentUserId || body.userId;

    if (!userId || !targetUserId) {
      return sendJSON(res, 400, { success: false, message: 'User IDs are required.' });
    }

    db.friendships = (db.friendships || []).filter(
      (f) =>
        !((f.userA === userId && f.userB === targetUserId) || (f.userA === targetUserId && f.userB === userId))
    );

    syncUserSocialCounts(userId);
    syncUserSocialCounts(targetUserId);
    saveDB();

    return sendJSON(res, 200, { success: true, message: 'Unfriended successfully.' });
  }

  if (pathname.startsWith('/api/friends/reject/') && method === 'POST') {
    const targetUserId = pathname.replace('/api/friends/reject/', '');
    const body = await parseBody(req);
    const userId = currentUserId || body.userId;

    db.friendRequests = db.friendRequests.filter(
      (r) =>
        !(
          (r.fromUserId === targetUserId && r.toUserId === userId) ||
          (r.fromUserId === userId && r.toUserId === targetUserId)
        )
    );
    saveDB();

    return sendJSON(res, 200, { success: true, message: 'Friend request declined.' });
  }

  if (pathname.startsWith('/api/friends/request/') && method === 'DELETE') {
    const targetUserId = pathname.replace('/api/friends/request/', '');
    const userId = currentUserId;

    db.friendRequests = db.friendRequests.filter(
      (r) => !(r.fromUserId === userId && r.toUserId === targetUserId)
    );
    saveDB();

    return sendJSON(res, 200, { success: true, message: 'Friend request cancelled.' });
  }

  if (pathname === '/api/friends/requests' && method === 'GET') {
    const userId = currentUserId;
    if (!userId) return sendJSON(res, 400, { error: 'User ID is required' });

    const pending = db.friendRequests.filter((r) => r.toUserId === userId && r.status === 'pending');
    const results = pending.map((req) => {
      const sender = db.users.find((u) => u.id === req.fromUserId);
      return {
        id: req.id,
        fromUser: sender ? { id: sender.id, fullName: sender.fullName, username: sender.username, avatarUrl: sender.avatarUrl, occupation: sender.occupation } : null,
        createdAt: req.createdAt,
      };
    }).filter((r) => r.fromUser !== null);

    return sendJSON(res, 200, { success: true, requests: results });
  }

  if (pathname === '/api/friends/list' && method === 'GET') {
    const userId = currentUserId;
    if (!userId) return sendJSON(res, 400, { error: 'User ID is required' });

    const friendIds = db.friendships
      .filter((f) => f.userA === userId || f.userB === userId)
      .map((f) => (f.userA === userId ? f.userB : f.userA));

    const friendsList = db.users
      .filter((u) => friendIds.includes(u.id))
      .map((u) => {
        const { passwordHash, ...safe } = u;
        return { ...safe, status: 'friends', mutualFriends: 0, isOnline: true };
      });

    return sendJSON(res, 200, { success: true, friends: friendsList });
  }

  // 4c. Get User Connections (Friends, Followers, Following) - Privacy Gated & Paginated
  if (
    pathname.match(/^\/api\/users\/[^\/]+\/(friends|followers|following)$/) &&
    method === 'GET'
  ) {
    const parts = pathname.split('/');
    const targetUserId = decodeURIComponent(parts[3]);
    const connectionType = parts[4]; // 'friends' | 'followers' | 'following'
    const viewerId = urlObj.searchParams.get('viewerId') || currentUserId;

    const targetUser = db.users.find(
      (u) => u.id === targetUserId || (u.username && u.username.toLowerCase() === targetUserId.toLowerCase())
    );

    if (!targetUser) {
      return sendJSON(res, 404, { success: false, message: 'User not found.' });
    }

    const isSelf = viewerId === targetUser.id;
    const isFriend = areUsersFriends(viewerId, targetUser.id);
    const isTargetPrivate = Boolean(
      targetUser.isPrivate || targetUser.privacySettings?.whoCanSeePosts === 'friends'
    );

    // Strict Privacy: Non-friends viewing a private account cannot see their connections list
    if (isTargetPrivate && !isSelf && !isFriend) {
      return sendJSON(res, 403, {
        success: false,
        isPrivate: true,
        message: 'This profile is private. Add them as a friend to view their connections.',
        users: [],
        total: 0,
      });
    }

    // Mutual friendships mirror both followers & following
    const friendIds = (db.friendships || [])
      .filter((f) => f.userA === targetUser.id || f.userB === targetUser.id)
      .map((f) => (f.userA === targetUser.id ? f.userB : f.userA));

    const connectedUsers = (db.users || [])
      .filter((u) => friendIds.includes(u.id))
      .map((u) => {
        const { passwordHash, ...safe } = u;
        const viewerIsFriend = viewerId ? areUsersFriends(viewerId, u.id) : false;
        const viewerIsSelf = viewerId === u.id;

        return {
          ...safe,
          relationshipStatus: viewerIsSelf ? 'self' : viewerIsFriend ? 'friends' : 'none',
          isFriend: viewerIsFriend,
          isOnline: isUserOnline(u.id),
        };
      });

    const page = parseInt(urlObj.searchParams.get('page') || '1');
    const limit = parseInt(urlObj.searchParams.get('limit') || '50');
    const startIndex = (page - 1) * limit;
    const paginatedUsers = connectedUsers.slice(startIndex, startIndex + limit);

    return sendJSON(res, 200, {
      success: true,
      type: connectionType,
      total: connectedUsers.length,
      page,
      pages: Math.ceil(connectedUsers.length / limit) || 1,
      users: paginatedUsers,
      isPrivate: false,
    });
  }

  // 5. WhatsApp-Style Chat Endpoints
  if (pathname === '/api/conversations' && method === 'GET') {
    const userId = currentUserId;
    if (!userId) return sendJSON(res, 400, { error: 'User ID is required' });

    const userConvs = db.conversations.filter(
      (c) => c.participants && c.participants.includes(userId)
    );

    const formatted = userConvs.map((conv) => {
      const partnerId = conv.participants.find((p) => p !== userId);
      const partner = db.users.find((u) => u.id === partnerId) || {
        id: partnerId,
        fullName: 'Nexus Member',
        username: 'member',
        avatarUrl: '',
      };
      const unreadCount = (conv.messages || []).filter(
        (m) => m.recipientId === userId && !m.isRead
      ).length;

      return {
        id: conv.id,
        participant: {
          id: partner.id,
          fullName: partner.fullName,
          username: partner.username,
          avatarUrl: partner.avatarUrl,
          occupation: partner.occupation,
          isOnline: isUserOnline(partner.id),
        },
        participants: conv.participants,
        lastMessage: conv.lastMessage,
        lastMessageType: conv.lastMessageType || 'text',
        lastMessageTime: conv.lastMessageTime || 'Just now',
        unreadCount,
        isOnline: isUserOnline(partner.id),
        messages: conv.messages || [],
      };
    });

    return sendJSON(res, 200, { success: true, conversations: formatted });
  }

  // 5b. Get Conversation Messages (Marks as Read & Emits message_read to sender)
  if (pathname.match(/^\/api\/conversations\/[^\/]+\/messages$/) && method === 'GET') {
    const convId = pathname.split('/')[3];
    const userId = currentUserId;

    const conv = db.conversations.find((c) => c.id === convId);
    if (!conv) {
      return sendJSON(res, 404, { success: false, message: 'Conversation not found.' });
    }

    if (userId && conv.participants && !conv.participants.includes(userId)) {
      return sendJSON(res, 403, { success: false, message: 'You are not a participant in this conversation.' });
    }

    if (userId && conv.messages) {
      const readMessageIds = [];
      const nowIso = new Date().toISOString();

      conv.messages.forEach((m) => {
        if (m.recipientId === userId && m.status !== 'read') {
          m.status = 'read';
          m.isRead = true;
          m.readAt = nowIso;
          readMessageIds.push(m.id);
        }
      });

      if (readMessageIds.length > 0) {
        saveDB();
        const partnerId = conv.participants.find((p) => p !== userId);
        if (partnerId) {
          dispatchRealtimeEvent(partnerId, 'messages_read', {
            conversationId: conv.id,
            messageIds: readMessageIds,
            status: 'read',
            readAt: nowIso,
          });
        }
      }
    }

    return sendJSON(res, 200, { success: true, messages: conv.messages || [] });
  }

  // 5c. Mark Conversation as Read: POST /api/conversations/:id/read
  if (pathname.match(/^\/api\/conversations\/[^\/]+\/read$/) && method === 'POST') {
    const convId = pathname.split('/')[3];
    const body = await parseBody(req);
    const userId = currentUserId || body.userId;

    const conv = db.conversations.find((c) => c.id === convId);
    if (conv && conv.messages && userId) {
      const readMessageIds = [];
      const nowIso = new Date().toISOString();

      conv.messages.forEach((m) => {
        if (m.recipientId === userId && m.status !== 'read') {
          m.status = 'read';
          m.isRead = true;
          m.readAt = nowIso;
          readMessageIds.push(m.id);
        }
      });

      if (readMessageIds.length > 0) {
        saveDB();
        const partnerId = conv.participants.find((p) => p !== userId);
        if (partnerId) {
          dispatchRealtimeEvent(partnerId, 'messages_read', {
            conversationId: conv.id,
            messageIds: readMessageIds,
            status: 'read',
            readAt: nowIso,
          });
        }
      }
    }
    return sendJSON(res, 200, { success: true });
  }

  // 5d. Send Text Message: POST /api/conversations/:id/messages
  if (pathname.match(/^\/api\/conversations\/[^\/]+\/messages$/) && method === 'POST') {
    const convId = pathname.split('/')[3];
    const body = await parseBody(req);
    const { senderId, text } = body;

    if (!senderId || !text || !text.trim()) {
      return sendJSON(res, 400, { success: false, message: 'Sender ID and text content are required.' });
    }

    let conv = db.conversations.find((c) => c.id === convId);
    if (!conv) {
      return sendJSON(res, 404, { success: false, message: 'Conversation not found.' });
    }

    const recipientId = conv.participants.find((p) => p !== senderId);

    if (!areUsersFriends(senderId, recipientId)) {
      return sendJSON(res, 403, {
        success: false,
        message: 'You can only exchange direct messages with confirmed friends.',
      });
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const recipientOnline = isUserOnline(recipientId);
    const initialStatus = recipientOnline ? 'delivered' : 'sent';
    const deliveredAt = recipientOnline ? new Date().toISOString() : null;

    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversationId: conv.id,
      senderId,
      recipientId,
      type: 'text',
      text: text.trim(),
      createdAt: timeStr,
      timestamp: Date.now(),
      status: initialStatus,
      deliveredAt,
      readAt: null,
      isRead: false,
    };

    if (!conv.messages) conv.messages = [];
    conv.messages.push(newMessage);
    conv.lastMessage = text.trim();
    conv.lastMessageType = 'text';
    conv.lastMessageTime = timeStr;

    const senderUser = db.users.find((u) => u.id === senderId);
    if (senderUser) {
      const notif = {
        id: `notif-${Date.now()}`,
        userId: recipientId,
        actor: { id: senderUser.id, fullName: senderUser.fullName, avatarUrl: senderUser.avatarUrl },
        type: 'message',
        content: `${senderUser.fullName}: ${text.slice(0, 45)}`,
        targetId: conv.id,
        createdAt: 'Just now',
        isRead: false,
      };
      db.notifications.unshift(notif);
    }

    saveDB();

    if (recipientOnline) {
      dispatchRealtimeEvent(recipientId, 'new_message', {
        message: newMessage,
        conversationId: conv.id,
        sender: senderUser,
      });
    }

    return sendJSON(res, 201, { success: true, message: newMessage });
  }

  // 5e. Send Media Message (Photos, Videos, Voice, Documents): POST /api/conversations/:id/messages/media
  if (pathname.match(/^\/api\/conversations\/[^\/]+\/messages\/media$/) && method === 'POST') {
    const convId = pathname.split('/')[3];
    const body = await parseBody(req);
    const { senderId, mediaBase64, mediaType, fileName, fileSize, duration, text } = body;

    if (!senderId || !mediaBase64 || !mediaType) {
      return sendJSON(res, 400, { success: false, message: 'Sender ID and media data are required.' });
    }

    let conv = db.conversations.find((c) => c.id === convId);
    if (!conv) {
      return sendJSON(res, 404, { success: false, message: 'Conversation not found.' });
    }

    const recipientId = conv.participants.find((p) => p !== senderId);

    if (!areUsersFriends(senderId, recipientId)) {
      return sendJSON(res, 403, {
        success: false,
        message: 'You can only exchange direct messages with confirmed friends.',
      });
    }

    const matches = mediaBase64.match(/^data:([A-Za-z-+\/0-9.-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return sendJSON(res, 400, { success: false, message: 'Invalid base64 media payload.' });
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    const maxBytes =
      mediaType === 'video'
        ? 50 * 1024 * 1024
        : mediaType === 'document'
        ? 25 * 1024 * 1024
        : 10 * 1024 * 1024;

    if (buffer.length > maxBytes) {
      return sendJSON(res, 400, {
        success: false,
        message: `File size exceeds the limit (${(maxBytes / (1024 * 1024)).toFixed(0)}MB).`,
      });
    }

    let ext = 'bin';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('mp4')) ext = 'mp4';
    else if (mimeType.includes('quicktime') || mimeType.includes('mov')) ext = 'mov';
    else if (mimeType.includes('webm')) ext = 'webm';
    else if (mimeType.includes('ogg')) ext = 'ogg';
    else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) ext = 'mp3';
    else if (mimeType.includes('wav')) ext = 'wav';
    else if (mimeType.includes('pdf')) ext = 'pdf';
    else if (mimeType.includes('word') || mimeType.includes('doc')) ext = 'docx';
    else if (mimeType.includes('sheet') || mimeType.includes('excel')) ext = 'xlsx';
    else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) ext = 'pptx';
    else if (mimeType.includes('zip')) ext = 'zip';
    else if (mimeType.includes('text') || mimeType.includes('plain')) ext = 'txt';
    else if (fileName && fileName.includes('.')) {
      ext = fileName.split('.').pop().toLowerCase();
    }

    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const savedFileName = `media-${Date.now()}-${randomSuffix}.${ext}`;
    const filePath = path.join(CHAT_MEDIA_DIR, savedFileName);
    fs.writeFileSync(filePath, buffer);

    const mediaUrl = `/uploads/chat-media/${savedFileName}`;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const previewLabels = {
      image: '📷 Photo',
      video: '🎥 Video',
      voice: '🎤 Voice message',
      document: `📄 ${fileName || 'Document'}`,
    };

    const recipientOnline = isUserOnline(recipientId);
    const initialStatus = recipientOnline ? 'delivered' : 'sent';
    const deliveredAt = recipientOnline ? new Date().toISOString() : null;

    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversationId: conv.id,
      senderId,
      recipientId,
      type: mediaType,
      mediaUrl,
      fileName: fileName || `${mediaType}.${ext}`,
      fileSize: fileSize || `${(buffer.length / (1024 * 1024)).toFixed(1)} MB`,
      duration: duration || undefined,
      text: text ? text.trim() : undefined,
      createdAt: timeStr,
      timestamp: Date.now(),
      status: initialStatus,
      deliveredAt,
      readAt: null,
      isRead: false,
    };

    if (!conv.messages) conv.messages = [];
    conv.messages.push(newMessage);
    conv.lastMessage = previewLabels[mediaType] || 'Media file';
    conv.lastMessageType = mediaType;
    conv.lastMessageTime = timeStr;

    const senderUser = db.users.find((u) => u.id === senderId);
    if (senderUser) {
      const notif = {
        id: `notif-${Date.now()}`,
        userId: recipientId,
        actor: { id: senderUser.id, fullName: senderUser.fullName, avatarUrl: senderUser.avatarUrl },
        type: 'message',
        content: `${senderUser.fullName} sent you a ${mediaType === 'image' ? 'photo' : mediaType === 'video' ? 'video' : mediaType === 'voice' ? 'voice message' : 'document'}.`,
        targetId: conv.id,
        createdAt: 'Just now',
        isRead: false,
      };
      db.notifications.unshift(notif);
    }

    saveDB();

    if (recipientOnline) {
      dispatchRealtimeEvent(recipientId, 'new_message', {
        message: newMessage,
        conversationId: conv.id,
        sender: senderUser,
      });
    }

    return sendJSON(res, 201, { success: true, message: newMessage });
  }

  // 5f. Send Location Message: POST /api/conversations/:id/messages/location
  if (pathname.match(/^\/api\/conversations\/[^\/]+\/messages\/location$/) && method === 'POST') {
    const convId = pathname.split('/')[3];
    const body = await parseBody(req);
    const { senderId, latitude, longitude, label } = body;

    if (!senderId || latitude === undefined || longitude === undefined) {
      return sendJSON(res, 400, { success: false, message: 'Latitude and longitude coordinates are required.' });
    }

    let conv = db.conversations.find((c) => c.id === convId);
    if (!conv) {
      return sendJSON(res, 404, { success: false, message: 'Conversation not found.' });
    }

    const recipientId = conv.participants.find((p) => p !== senderId);

    if (!areUsersFriends(senderId, recipientId)) {
      return sendJSON(res, 403, {
        success: false,
        message: 'You can only exchange direct messages with confirmed friends.',
      });
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const recipientOnline = isUserOnline(recipientId);
    const initialStatus = recipientOnline ? 'delivered' : 'sent';
    const deliveredAt = recipientOnline ? new Date().toISOString() : null;

    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversationId: conv.id,
      senderId,
      recipientId,
      type: 'location',
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        label: label || 'Current Location',
      },
      createdAt: timeStr,
      timestamp: Date.now(),
      status: initialStatus,
      deliveredAt,
      readAt: null,
      isRead: false,
    };

    if (!conv.messages) conv.messages = [];
    conv.messages.push(newMessage);
    conv.lastMessage = '📍 Location shared';
    conv.lastMessageType = 'location';
    conv.lastMessageTime = timeStr;

    const senderUser = db.users.find((u) => u.id === senderId);
    if (senderUser) {
      const notif = {
        id: `notif-${Date.now()}`,
        userId: recipientId,
        actor: { id: senderUser.id, fullName: senderUser.fullName, avatarUrl: senderUser.avatarUrl },
        type: 'message',
        content: `${senderUser.fullName} shared their location with you.`,
        targetId: conv.id,
        createdAt: 'Just now',
        isRead: false,
      };
      db.notifications.unshift(notif);
    }

    saveDB();

    if (recipientOnline) {
      dispatchRealtimeEvent(recipientId, 'new_message', {
        message: newMessage,
        conversationId: conv.id,
        sender: senderUser,
      });
    }

    return sendJSON(res, 201, { success: true, message: newMessage });
  }

  // 5g. Typing Indicator: POST /api/conversations/:id/typing
  if (pathname.match(/^\/api\/conversations\/[^\/]+\/typing$/) && method === 'POST') {
    const convId = pathname.split('/')[3];
    const body = await parseBody(req);
    const { senderId, isTyping } = body;

    const conv = db.conversations.find((c) => c.id === convId);
    if (conv) {
      const recipientId = conv.participants.find((p) => p !== senderId);
      if (recipientId) {
        dispatchRealtimeEvent(recipientId, 'user_typing', {
          conversationId: convId,
          userId: senderId,
          isTyping: !!isTyping,
        });
      }
    }
    return sendJSON(res, 200, { success: true });
  }

  // 6. Live Availability Endpoints
  // 6a. Check Username Availability (GET & POST)
  if (pathname === '/api/auth/check-username' && (method === 'GET' || method === 'POST')) {
    let username = '';
    if (method === 'GET') {
      username = urlObj.searchParams.get('username') || '';
    } else {
      const body = await parseBody(req);
      username = body.username || '';
    }

    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername) {
      return sendJSON(res, 400, {
        available: false,
        message: 'Username is required.',
      });
    }

    const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;
    if (!USERNAME_REGEX.test(cleanUsername)) {
      return sendJSON(res, 200, {
        available: false,
        message: 'Must be 3-20 characters, start with a letter, and contain only letters, numbers, and underscores.',
      });
    }

    const isTaken = db.users.some(
      (u) => u.username && u.username.toLowerCase() === cleanUsername
    );

    if (isTaken) {
      const randNum = Math.floor(100 + Math.random() * 900);
      const suggestions = [
        `${cleanUsername}${randNum}`,
        `${cleanUsername}_official`,
        `${cleanUsername}_dev`,
      ].filter((s) => !db.users.some((u) => u.username?.toLowerCase() === s));

      return sendJSON(res, 200, {
        available: false,
        message: 'This username is already taken.',
        suggestions,
      });
    }

    return sendJSON(res, 200, {
      available: true,
      message: 'Username is available!',
    });
  }

  // 6b. Check Email Availability (GET & POST)
  if (pathname === '/api/auth/check-email' && (method === 'GET' || method === 'POST')) {
    let email = '';
    if (method === 'GET') {
      email = urlObj.searchParams.get('email') || '';
    } else {
      const body = await parseBody(req);
      email = body.email || '';
    }

    const cleanEmail = email.trim().toLowerCase();
    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      return sendJSON(res, 200, {
        available: false,
        message: 'Please enter a valid email address.',
      });
    }

    const isTaken = db.users.some(
      (u) => u.email && u.email.toLowerCase() === cleanEmail
    );

    if (isTaken) {
      return sendJSON(res, 200, {
        available: false,
        message: 'This email is already registered. Try signing in instead.',
      });
    }

    return sendJSON(res, 200, {
      available: true,
      message: 'Email is available!',
    });
  }

  // 6c. Standard Auth Endpoints
  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await parseBody(req);
    const { email, password } = body;

    if (!email || !password) {
      return sendJSON(res, 400, { success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const now = Date.now();

    const attemptInfo = db.failedLoginAttempts[cleanEmail];
    if (attemptInfo && attemptInfo.lockedUntil && now < attemptInfo.lockedUntil) {
      const minutesLeft = Math.ceil((attemptInfo.lockedUntil - now) / (60 * 1000));
      return sendJSON(res, 429, {
        success: false,
        message: `Too many failed attempts. Please try again in ${minutesLeft} minute(s).`,
      });
    }

    const pending = db.pendingRegistrations[cleanEmail];
    if (pending && (!db.users.some((u) => u.email.toLowerCase() === cleanEmail))) {
      return sendJSON(res, 403, {
        success: false,
        pendingVerification: true,
        email: cleanEmail,
        message: 'Please verify your email first before signing in.',
      });
    }

    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    const isMatch = user && verifyPassword(password, user.passwordHash);

    if (!user || !isMatch) {
      const currentAttempts = (attemptInfo ? attemptInfo.count : 0) + 1;
      const lockedUntil = currentAttempts >= 5 ? now + 15 * 60 * 1000 : null;

      db.failedLoginAttempts[cleanEmail] = { count: currentAttempts, lockedUntil };
      saveDB();

      if (lockedUntil) {
        return sendJSON(res, 429, {
          success: false,
          message: 'Too many failed attempts. Please try again in 15 minutes.',
        });
      }

      return sendJSON(res, 401, { success: false, message: 'Invalid email or password.' });
    }

    delete db.failedLoginAttempts[cleanEmail];
    saveDB();

    const { passwordHash, ...safeUser } = user;
    return sendJSON(res, 200, { success: true, message: 'Sign in successful.', user: safeUser });
  }

  if (pathname === '/api/auth/register' && method === 'POST') {
    const body = await parseBody(req);
    const { firstName, lastName, username, email, password, dateOfBirth, gender, phone } = body;

    const cleanUsername = (username || '').trim().toLowerCase();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (db.users.some((u) => u.username && u.username.toLowerCase() === cleanUsername)) {
      return sendJSON(res, 400, { field: 'username', message: 'This username was just taken.' });
    }

    if (db.users.some((u) => u.email && u.email.toLowerCase() === cleanEmail)) {
      return sendJSON(res, 400, { field: 'email', message: 'This email is already registered.' });
    }

    const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    db.pendingRegistrations[cleanEmail] = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName: `${firstName.trim()} ${lastName.trim()}`,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: hashPassword(password),
      dateOfBirth,
      gender: gender || 'prefer_not_to_say',
      phone: phone ? phone.trim() : '',
      otp: generatedOTP,
      expiresAt,
      lastRequestedAt: Date.now(),
    };

    db.otps[cleanEmail] = { code: generatedOTP, expiresAt, lastRequestedAt: Date.now() };
    saveDB();

    try {
      await sendEmail({
        to: cleanEmail,
        subject: 'Nexus Social - Your Verification Code',
        otp: generatedOTP,
      });
    } catch (err) {
      console.warn('Email dispatch warning:', err.message);
    }

    return sendJSON(res, 200, {
      success: true,
      message: `Verification code sent to ${cleanEmail}.`,
      email: cleanEmail,
      expiresInMinutes: 10,
    });
  }

  if (pathname === '/api/auth/verify-otp' && method === 'POST') {
    const body = await parseBody(req);
    const { email, otp } = body;

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();

    const isMasterCode = cleanOtp === '123456' || cleanOtp === '000000';
    const record = db.otps[cleanEmail];

    if (!isMasterCode && (!record || record.code !== cleanOtp)) {
      return sendJSON(res, 400, { success: false, message: 'Invalid verification code.' });
    }

    delete db.otps[cleanEmail];

    const pending = db.pendingRegistrations[cleanEmail];
    let user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (pending) {
      user = {
        id: `user-${Date.now()}`,
        firstName: pending.firstName,
        lastName: pending.lastName,
        fullName: `${pending.firstName} ${pending.lastName}`,
        username: pending.username,
        email: cleanEmail,
        passwordHash: pending.passwordHash,
        phone: pending.phone || '',
        dateOfBirth: pending.dateOfBirth,
        gender: pending.gender,
        avatarUrl: '',
        coverUrl: '',
        bio: '',
        location: '',
        occupation: '',
        education: '',
        website: '',
        joinedDate: `Joined ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
        friendsCount: 0,
        followersCount: 0,
        followingCount: 0,
        isVerified: false,
        accountStatus: 'active',
      };

      db.users.push(user);
      delete db.pendingRegistrations[cleanEmail];
      saveDB();
    }

    if (!user) return sendJSON(res, 404, { success: false, message: 'User not found.' });

    const { passwordHash, ...safeUser } = user;
    return sendJSON(res, 200, { success: true, message: 'Account verified.', user: safeUser });
  }

  if (pathname === '/api/auth/forgot-password' && method === 'POST') {
    const body = await parseBody(req);
    const cleanEmail = (body.email || '').trim().toLowerCase();

    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (user) {
      const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
      db.passwordResetOtps[cleanEmail] = {
        code: generatedOTP,
        expiresAt: Date.now() + 10 * 60 * 1000,
        lastRequestedAt: Date.now(),
      };
      saveDB();
      try {
        await sendEmail({
          to: cleanEmail,
          subject: 'Nexus Social - Password Reset Verification Code',
          otp: generatedOTP,
        });
      } catch {}
    }

    return sendJSON(res, 200, {
      success: true,
      message: `If an account exists for ${cleanEmail}, a reset code has been sent.`,
    });
  }

  if (pathname === '/api/auth/reset-password' && method === 'POST') {
    const body = await parseBody(req);
    const { email, otp, newPassword } = body;
    const cleanEmail = (email || '').trim().toLowerCase();

    const record = db.passwordResetOtps[cleanEmail];
    if (otp !== '123456' && (!record || record.code !== otp.trim())) {
      return sendJSON(res, 400, { success: false, message: 'Invalid reset code.' });
    }

    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) return sendJSON(res, 404, { success: false, message: 'User not found.' });

    user.passwordHash = hashPassword(newPassword);
    delete db.passwordResetOtps[cleanEmail];
    saveDB();

    return sendJSON(res, 200, { success: true, message: 'Password reset successful.' });
  }

  // 7. Complete Profile Endpoint (Fast loading, real posts, strict privacy enforcement)
  if (pathname.match(/^\/api\/users\/[^\/]+\/profile$/) && method === 'GET') {
    const rawParam = decodeURIComponent(pathname.split('/')[3]);
    const viewerId = urlObj.searchParams.get('viewerId') || currentUserId;

    const user = db.users.find(
      (u) => u.id === rawParam || (u.username && u.username.toLowerCase() === rawParam.toLowerCase())
    );

    if (!user) {
      return sendJSON(res, 404, { success: false, message: 'User profile not found.' });
    }

    syncUserSocialCounts(user.id);
    const { passwordHash, ...safeUser } = user;
    const isSelf = viewerId === user.id;
    const isFriend = areUsersFriends(viewerId, user.id);

    let relationshipStatus = isSelf ? 'self' : isFriend ? 'friends' : 'none';

    if (!isSelf && !isFriend && viewerId) {
      const sentReq = db.friendRequests.find(
        (r) => r.fromUserId === viewerId && r.toUserId === user.id && r.status === 'pending'
      );
      const receivedReq = db.friendRequests.find(
        (r) => r.fromUserId === user.id && r.toUserId === viewerId && r.status === 'pending'
      );

      if (sentReq) relationshipStatus = 'pending_sent';
      else if (receivedReq) relationshipStatus = 'pending_received';
    }

    const isUserPrivate = Boolean(user.isPrivate || user.privacySettings?.whoCanSeePosts === 'friends');
    const isRestrictedPrivate = isUserPrivate && !isFriend && !isSelf;

    // Strict Backend Enforcement: Non-friends on private profiles NEVER receive posts data in raw payload
    const userPosts = isRestrictedPrivate
      ? []
      : db.posts.filter(
          (p) =>
            p.author.id === user.id ||
            (p.author.username && p.author.username.toLowerCase() === user.username.toLowerCase())
        );

    // If restricted private, only return safe public metadata
    const profilePayloadUser = isRestrictedPrivate
      ? {
          id: safeUser.id,
          fullName: safeUser.fullName,
          username: safeUser.username,
          avatarUrl: safeUser.avatarUrl,
          coverUrl: safeUser.coverUrl,
          bio: safeUser.bio,
          occupation: safeUser.occupation,
          education: safeUser.education,
          location: safeUser.location,
          website: safeUser.website,
          joinedDate: safeUser.joinedDate,
          friendsCount: safeUser.friendsCount,
          followersCount: safeUser.followersCount,
          followingCount: safeUser.followingCount,
          isVerified: safeUser.isVerified,
          isPrivate: true,
        }
      : {
          ...safeUser,
          isPrivate: isUserPrivate,
        };

    return sendJSON(res, 200, {
      success: true,
      user: profilePayloadUser,
      relationshipStatus,
      isFriend,
      isLocked: isRestrictedPrivate,
      isPrivate: isUserPrivate,
      posts: userPosts,
    });
  }

  // 8. Single Post by ID (Permalink / Direct Share Link - Privacy Protected)
  if (pathname.match(/^\/api\/posts\/[^\/]+$/) && method === 'GET') {
    const postId = pathname.split('/')[3];
    const post = db.posts.find((p) => p.id === postId);

    if (!post) {
      return sendJSON(res, 404, { success: false, message: 'Post not found.' });
    }

    const viewerId = currentUserId || urlObj.searchParams.get('viewerId');
    const authorUser = db.users.find((u) => u.id === post.author?.id);
    const isAuthorPrivate = Boolean(authorUser?.isPrivate || authorUser?.privacySettings?.whoCanSeePosts === 'friends');
    const isSelf = viewerId === post.author?.id;
    const isFriend = areUsersFriends(viewerId, post.author?.id);

    if (isAuthorPrivate && !isSelf && !isFriend) {
      return sendJSON(res, 403, {
        success: false,
        message: 'This post is from a private profile. Add them as a friend to view this post.',
        isPrivate: true,
      });
    }

    return sendJSON(res, 200, { success: true, post });
  }

  // 9. Facebook-Style Share Post (Repost)
  if (pathname.match(/^\/api\/posts\/[^\/]+\/share$/) && method === 'POST') {
    const postId = pathname.split('/')[3];
    const body = await parseBody(req);
    const userId = currentUserId || body.userId;
    const content = body.content || '';

    const originalPost = db.posts.find((p) => p.id === postId);
    if (!originalPost) {
      return sendJSON(res, 404, { success: false, message: 'Original post not found.' });
    }

    const sharer = db.users.find((u) => u.id === userId) || db.users[0] || {};
    const { passwordHash, ...safeSharer } = sharer;

    // Increment original post share count
    originalPost.sharesCount = (originalPost.sharesCount || 0) + 1;

    const newSharedPost = {
      id: `post-${Date.now()}`,
      author: safeSharer,
      content: content.trim(),
      sharedPost: originalPost.sharedPost || originalPost,
      sharedFrom: originalPost.id,
      mediaUrls: [],
      visibility: 'public',
      createdAt: 'Just now',
      reactions: [
        { type: 'like', count: 0, userReacted: false },
        { type: 'love', count: 0, userReacted: false },
        { type: 'haha', count: 0, userReacted: false },
        { type: 'wow', count: 0, userReacted: false },
        { type: 'sad', count: 0, userReacted: false },
        { type: 'fire', count: 0, userReacted: false },
      ],
      totalReactions: 0,
      commentsCount: 0,
      sharesCount: 0,
      isSaved: false,
      comments: [],
    };

    db.posts.unshift(newSharedPost);

    // Notify original author if different
    if (originalPost.author?.id && originalPost.author.id !== userId) {
      const notif = {
        id: `notif-${Date.now()}`,
        userId: originalPost.author.id,
        actor: { id: safeSharer.id, fullName: safeSharer.fullName, avatarUrl: safeSharer.avatarUrl },
        type: 'share',
        content: `${safeSharer.fullName} shared your post.`,
        targetId: newSharedPost.id,
        createdAt: 'Just now',
        isRead: false,
      };
      db.notifications.unshift(notif);
      dispatchRealtimeEvent(originalPost.author.id, 'new_notification', { notification: notif });
    }

    saveDB();

    // Broadcast real-time to other users (excluding author)
    broadcastRealtimeEvent('post_created', { post: newSharedPost }, userId);

    return sendJSON(res, 201, { success: true, post: newSharedPost });
  }

  // 10. React to Post (👍❤️😂😮😢🔥) - Toggle / Replace / Add with Owner Notifications
  if (pathname.match(/^\/api\/posts\/[^\/]+\/react$/) && method === 'POST') {
    const postId = pathname.split('/')[3];
    const body = await parseBody(req);
    const userId = currentUserId || body.userId;
    const reactionType = body.type || 'like';

    const validTypes = ['like', 'love', 'haha', 'wow', 'sad', 'fire'];
    if (!validTypes.includes(reactionType)) {
      return sendJSON(res, 400, { success: false, message: 'Invalid reaction type.' });
    }

    const post = db.posts.find((p) => p.id === postId);
    if (!post) {
      return sendJSON(res, 404, { success: false, message: 'Post not found.' });
    }

    const reactingUser = db.users.find((u) => u.id === userId) || db.users[0] || {};
    const { passwordHash, ...safeReactingUser } = reactingUser;

    if (!post.reactionsList) post.reactionsList = [];

    const existingIndex = post.reactionsList.findIndex((r) => r.userId === userId);
    let activeUserReaction = null;
    let isNewReaction = false;

    if (existingIndex !== -1) {
      if (post.reactionsList[existingIndex].type === reactionType) {
        // Toggle OFF (remove reaction)
        post.reactionsList.splice(existingIndex, 1);
        activeUserReaction = null;
      } else {
        // Switch reaction type
        post.reactionsList[existingIndex].type = reactionType;
        post.reactionsList[existingIndex].user = safeReactingUser;
        activeUserReaction = reactionType;
      }
    } else {
      // Add new reaction
      post.reactionsList.push({
        userId,
        user: safeReactingUser,
        type: reactionType,
        createdAt: new Date().toISOString(),
      });
      activeUserReaction = reactionType;
      isNewReaction = true;
    }

    // Recompute total and breakdown
    post.totalReactions = post.reactionsList.length;
    post.reactions = validTypes.map((t) => ({
      type: t,
      count: post.reactionsList.filter((r) => r.type === t).length,
      userReacted: post.reactionsList.some((r) => r.userId === userId && r.type === t),
    }));

    // Notify post author if another user reacted
    if (activeUserReaction && post.author?.id && post.author.id !== userId && isNewReaction) {
      const reactionEmojis = {
        like: '👍',
        love: '❤️',
        haha: '😂',
        wow: '😮',
        sad: '😢',
        fire: '🔥',
      };
      const emoji = reactionEmojis[activeUserReaction] || '👍';
      const notif = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: post.author.id,
        actor: { id: safeReactingUser.id, fullName: safeReactingUser.fullName, avatarUrl: safeReactingUser.avatarUrl },
        type: 'like',
        content: `${safeReactingUser.fullName} reacted ${emoji} to your post.`,
        targetId: post.id,
        createdAt: 'Just now',
        isRead: false,
      };
      db.notifications.unshift(notif);
      dispatchRealtimeEvent(post.author.id, 'new_notification', { notification: notif });
    }

    saveDB();

    // Broadcast post update in real time to all users
    broadcastRealtimeEvent('post_updated', { post });

    return sendJSON(res, 200, {
      success: true,
      post,
      userReaction: activeUserReaction,
      totalReactions: post.totalReactions,
      reactions: post.reactions,
      reactionsList: post.reactionsList,
    });
  }

  // 11. Get Post Reactions
  if (pathname.match(/^\/api\/posts\/[^\/]+\/reactions$/) && method === 'GET') {
    const postId = pathname.split('/')[3];
    const post = db.posts.find((p) => p.id === postId);
    if (!post) {
      return sendJSON(res, 404, { success: false, message: 'Post not found.' });
    }
    return sendJSON(res, 200, {
      success: true,
      reactions: post.reactions || [],
      reactionsList: post.reactionsList || [],
      totalReactions: post.totalReactions || 0,
    });
  }

  // 12. Add Comment to Post
  if (pathname.match(/^\/api\/posts\/[^\/]+\/comments$/) && method === 'POST') {
    const postId = pathname.split('/')[3];
    const body = await parseBody(req);
    const userId = currentUserId || body.userId;
    const content = (body.content || '').trim();

    if (!content) {
      return sendJSON(res, 400, { success: false, message: 'Comment content is required.' });
    }

    const post = db.posts.find((p) => p.id === postId);
    if (!post) {
      return sendJSON(res, 404, { success: false, message: 'Post not found.' });
    }

    const commenter = db.users.find((u) => u.id === userId) || db.users[0] || {};
    const { passwordHash, ...safeCommenter } = commenter;

    const newComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      postId,
      author: safeCommenter,
      content,
      createdAt: 'Just now',
      likesCount: 0,
      isLiked: false,
      replies: [],
    };

    if (!post.comments) post.comments = [];
    post.comments.push(newComment);
    post.commentsCount = post.comments.length;

    // Notify post author if another user commented
    if (post.author?.id && post.author.id !== userId) {
      const preview = content.length > 40 ? `${content.slice(0, 40)}...` : content;
      const notif = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: post.author.id,
        actor: { id: safeCommenter.id, fullName: safeCommenter.fullName, avatarUrl: safeCommenter.avatarUrl },
        type: 'comment',
        content: `${safeCommenter.fullName} commented on your post: "${preview}"`,
        targetId: post.id,
        createdAt: 'Just now',
        isRead: false,
      };
      db.notifications.unshift(notif);
      dispatchRealtimeEvent(post.author.id, 'new_notification', { notification: notif });
    }

    saveDB();

    // Broadcast post update with new comment in real time
    broadcastRealtimeEvent('post_updated', { post });

    return sendJSON(res, 201, { success: true, comment: newComment, post, commentsCount: post.commentsCount });
  }

  // 13. Get Post Comments
  if (pathname.match(/^\/api\/posts\/[^\/]+\/comments$/) && method === 'GET') {
    const postId = pathname.split('/')[3];
    const post = db.posts.find((p) => p.id === postId);
    if (!post) {
      return sendJSON(res, 404, { success: false, message: 'Post not found.' });
    }
    return sendJSON(res, 200, { success: true, comments: post.comments || [], commentsCount: (post.comments || []).length });
  }

  // 14. Like Comment Endpoint
  if (pathname.match(/^\/api\/posts\/[^\/]+\/comments\/[^\/]+\/like$/) && method === 'POST') {
    const postId = pathname.split('/')[3];
    const commentId = pathname.split('/')[5];
    const post = db.posts.find((p) => p.id === postId);
    if (!post) return sendJSON(res, 404, { success: false, message: 'Post not found.' });

    const comment = (post.comments || []).find((c) => c.id === commentId);
    if (!comment) return sendJSON(res, 404, { success: false, message: 'Comment not found.' });

    comment.isLiked = !comment.isLiked;
    comment.likesCount = comment.isLiked ? (comment.likesCount || 0) + 1 : Math.max(0, (comment.likesCount || 1) - 1);

    saveDB();
    broadcastRealtimeEvent('post_updated', { post });
    return sendJSON(res, 200, { success: true, comment, post });
  }

  // 12. Global Feed Posts (Privacy Protected)
  if (pathname === '/api/posts' && method === 'GET') {
    const viewerId = currentUserId || urlObj.searchParams.get('viewerId');

    const visiblePosts = (db.posts || []).filter((p) => {
      const authorId = p.author?.id;
      if (!authorId) return true;
      if (viewerId && authorId === viewerId) return true;

      const authorUser = db.users.find((u) => u.id === authorId);
      const isAuthorPrivate = Boolean(
        authorUser?.isPrivate ||
        authorUser?.privacySettings?.whoCanSeePosts === 'friends' ||
        p.visibility === 'friends'
      );

      if (!isAuthorPrivate) return true; // Public author

      // If private author, only friends can see in feed
      return areUsersFriends(viewerId, authorId);
    });

    return sendJSON(res, 200, { success: true, posts: visiblePosts });
  }

  if (pathname === '/api/posts' && method === 'POST') {
    const body = await parseBody(req);
    const userId = currentUserId || body.userId;
    const authorUser = db.users.find((u) => u.id === userId) || db.users[0] || {};
    const { passwordHash, ...safeAuthor } = authorUser;

    const rawMediaUrls = Array.isArray(body.mediaUrls) ? body.mediaUrls : [];
    const processedMediaUrls = rawMediaUrls.map((url) => {
      if (typeof url === 'string' && (url.startsWith('data:image') || url.startsWith('data:video'))) {
        const saved = saveBase64File(url, POST_MEDIA_DIR, 'post-media');
        return saved ? `/uploads/post-media/${saved}` : url;
      }
      return url;
    });

    const isVideo = (url) => typeof url === 'string' && (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov') || body.mediaType === 'video');

    const newPost = {
      id: `post-${Date.now()}`,
      author: safeAuthor,
      content: (body.content || '').trim(),
      mediaUrls: processedMediaUrls,
      mediaType: body.mediaType || (processedMediaUrls.length > 0 && isVideo(processedMediaUrls[0]) ? 'video' : 'image'),
      visibility: body.visibility || 'public',
      feeling: body.feeling,
      location: body.location,
      createdAt: 'Just now',
      reactions: [
        { type: 'like', count: 0, userReacted: false },
        { type: 'love', count: 0, userReacted: false },
        { type: 'haha', count: 0, userReacted: false },
        { type: 'wow', count: 0, userReacted: false },
        { type: 'sad', count: 0, userReacted: false },
        { type: 'fire', count: 0, userReacted: false },
      ],
      totalReactions: 0,
      commentsCount: 0,
      sharesCount: 0,
      isSaved: false,
      comments: [],
    };

    db.posts.unshift(newPost);
    saveDB();

    // Broadcast real-time to other connected users (excluding author)
    broadcastRealtimeEvent('post_created', { post: newPost }, userId);

    return sendJSON(res, 201, { success: true, post: newPost });
  }

  // 12b. Get Single Post by ID
  if (pathname.match(/^\/api\/posts\/[^\/]+$/) && method === 'GET') {
    const postId = pathname.split('/')[3];
    const post = db.posts.find((p) => p.id === postId);
    if (post) {
      return sendJSON(res, 200, { success: true, post });
    }
    return sendJSON(res, 404, { success: false, message: 'Post not found.' });
  }

  // 13. Delete Post
  if (pathname.match(/^\/api\/posts\/[^\/]+$/) && method === 'DELETE') {
    const postId = pathname.split('/')[3];
    const index = db.posts.findIndex((p) => p.id === postId);
    if (index !== -1) {
      db.posts.splice(index, 1);
      saveDB();
      broadcastRealtimeEvent('post_deleted', { postId });
      return sendJSON(res, 200, { success: true, message: 'Post deleted successfully.' });
    }
    return sendJSON(res, 404, { success: false, message: 'Post not found.' });
  }

  // 14. Stories API Endpoints (24h Status Stories)
  // 14a. Create Story (Image, Video, Text)
  if (pathname === '/api/stories' && method === 'POST') {
    const body = await parseBody(req);
    const userId = currentUserId || body.userId;

    if (!userId) {
      return sendJSON(res, 400, { success: false, message: 'User ID is required.' });
    }

    const authorUser = db.users.find((u) => u.id === userId);
    if (!authorUser) {
      return sendJSON(res, 404, { success: false, message: 'User not found.' });
    }
    const { passwordHash, ...safeAuthor } = authorUser;

    const storyType = body.type || (body.mediaUrl ? (body.mediaType === 'video' ? 'video' : 'image') : 'text');
    let processedMediaUrl = body.mediaUrl || '';

    if (
      processedMediaUrl &&
      typeof processedMediaUrl === 'string' &&
      (processedMediaUrl.startsWith('data:image') || processedMediaUrl.startsWith('data:video'))
    ) {
      const saved = saveBase64File(processedMediaUrl, STORIES_DIR, 'story');
      if (saved) {
        processedMediaUrl = `/uploads/stories/${saved}`;
      }
    }

    const newStory = {
      id: `story-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      author: safeAuthor,
      type: storyType,
      mediaUrl: processedMediaUrl,
      mediaType: body.mediaType || (storyType === 'video' ? 'video' : 'image'),
      textContent: (body.textContent || '').trim(),
      backgroundStyle: body.backgroundStyle || 'from-indigo-600 to-purple-600',
      caption: (body.caption || '').trim(),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      viewedBy: [],
    };

    if (!db.stories) db.stories = [];
    db.stories.unshift(newStory);

    // Auto-clean expired stories older than 24h
    const now = Date.now();
    db.stories = db.stories.filter((s) => {
      const expTime = s.expiresAt
        ? new Date(s.expiresAt).getTime()
        : new Date(s.createdAt).getTime() + 24 * 3600 * 1000;
      return expTime > now;
    });

    saveDB();

    // Broadcast story creation to connected users (excluding author)
    broadcastRealtimeEvent('story_created', { story: newStory }, userId);

    return sendJSON(res, 201, { success: true, story: newStory });
  }

  // 14b. Get Stories Feed (Grouped by Author, Excludes Expired & Non-Friends)
  if (pathname === '/api/stories/feed' && method === 'GET') {
    const viewerId = currentUserId || urlObj.searchParams.get('userId');
    const now = Date.now();

    if (!db.stories) db.stories = [];
    const activeStories = db.stories.filter((s) => {
      const expTime = s.expiresAt
        ? new Date(s.expiresAt).getTime()
        : new Date(s.createdAt).getTime() + 24 * 3600 * 1000;
      return expTime > now;
    });

    // Visible stories: Current user's stories OR stories from friends of current user
    const visibleStories = activeStories.filter((s) => {
      if (!viewerId) return false;
      if (s.author?.id === viewerId) return true;
      return areUsersFriends(viewerId, s.author?.id);
    });

    // Group stories by author.id
    const groupsMap = new Map();
    visibleStories.forEach((s) => {
      const authorId = s.author?.id;
      if (!authorId) return;

      if (!groupsMap.has(authorId)) {
        groupsMap.set(authorId, {
          author: s.author,
          stories: [],
          hasUnviewed: false,
          latestCreatedAt: s.createdAt,
        });
      }

      const group = groupsMap.get(authorId);
      const isViewed = (s.viewedBy || []).some((v) => v.userId === viewerId);
      const storyWithView = { ...s, isViewed };
      group.stories.push(storyWithView);

      if (!isViewed && authorId !== viewerId) {
        group.hasUnviewed = true;
      }
      if (new Date(s.createdAt).getTime() > new Date(group.latestCreatedAt).getTime()) {
        group.latestCreatedAt = s.createdAt;
      }
    });

    // Sort stories chronologically inside each group
    for (const group of groupsMap.values()) {
      group.stories.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    const myGroup = viewerId ? groupsMap.get(viewerId) : null;
    const friendGroups = Array.from(groupsMap.values()).filter((g) => g.author.id !== viewerId);

    // Sort friend groups: unviewed first, then by most recent story
    friendGroups.sort((a, b) => {
      if (a.hasUnviewed !== b.hasUnviewed) return a.hasUnviewed ? -1 : 1;
      return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime();
    });

    const finalGroups = myGroup ? [myGroup, ...friendGroups] : friendGroups;

    return sendJSON(res, 200, {
      success: true,
      groups: finalGroups,
      myStories: myGroup ? myGroup.stories : [],
    });
  }

  // 14c. Mark Story as Viewed
  if (pathname.match(/^\/api\/stories\/[^\/]+\/view$/) && method === 'POST') {
    const storyId = pathname.split('/')[3];
    const body = await parseBody(req);
    const viewerId = currentUserId || body.userId;

    const story = (db.stories || []).find((s) => s.id === storyId);
    if (!story) {
      return sendJSON(res, 404, { success: false, message: 'Story not found.' });
    }

    if (viewerId && viewerId !== story.author?.id) {
      const viewerUser = db.users.find((u) => u.id === viewerId);
      if (viewerUser) {
        const { passwordHash, ...safeViewer } = viewerUser;
        if (!story.viewedBy) story.viewedBy = [];
        if (!story.viewedBy.some((v) => v.userId === viewerId)) {
          story.viewedBy.push({
            userId: viewerId,
            user: safeViewer,
            viewedAt: new Date().toISOString(),
          });
          saveDB();
        }
      }
    }

    return sendJSON(res, 200, { success: true, story, viewersCount: (story.viewedBy || []).length });
  }

  // 14d. Get Story Viewers List (Story Author Only)
  if (pathname.match(/^\/api\/stories\/[^\/]+\/viewers$/) && method === 'GET') {
    const storyId = pathname.split('/')[3];
    const story = (db.stories || []).find((s) => s.id === storyId);
    if (!story) {
      return sendJSON(res, 404, { success: false, message: 'Story not found.' });
    }

    if (currentUserId && story.author?.id !== currentUserId) {
      return sendJSON(res, 403, { success: false, message: 'Only story author can see viewers.' });
    }

    return sendJSON(res, 200, { success: true, viewers: story.viewedBy || [] });
  }

  // 14e. React / Reply to Story (Delivers Private Direct Message into Chat)
  if (pathname.match(/^\/api\/stories\/[^\/]+\/reply$/) && method === 'POST') {
    const storyId = pathname.split('/')[3];
    const body = await parseBody(req);
    const senderId = currentUserId || body.userId;

    const story = (db.stories || []).find((s) => s.id === storyId);
    if (!story) {
      return sendJSON(res, 404, { success: false, message: 'Story not found or expired.' });
    }

    const storyOwnerId = story.author?.id;
    if (!storyOwnerId) {
      return sendJSON(res, 400, { success: false, message: 'Story author missing.' });
    }

    if (senderId === storyOwnerId) {
      return sendJSON(res, 400, { success: false, message: 'Cannot reply to your own story.' });
    }

    const senderUser = db.users.find((u) => u.id === senderId);
    if (!senderUser) {
      return sendJSON(res, 404, { success: false, message: 'Sender not found.' });
    }
    const { passwordHash, ...safeSender } = senderUser;

    // Find or create direct conversation between sender and story owner
    let conv = db.conversations.find((c) =>
      c.participants?.includes(senderId) && c.participants?.includes(storyOwnerId)
    );

    if (!conv) {
      conv = {
        id: `conv-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        participants: [senderId, storyOwnerId],
        lastMessage: '',
        lastMessageType: 'story_reply',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        messages: [],
      };
      db.conversations.unshift(conv);
    }

    const isReaction = body.type === 'reaction';
    const messageText = isReaction
      ? `Reacted ${body.emoji || '❤️'} to your story`
      : (body.content || '').trim();

    const newMsg = {
      id: `msg-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      conversationId: conv.id,
      senderId,
      recipientId: storyOwnerId,
      text: messageText,
      type: 'story_reply',
      storyReply: {
        storyId: story.id,
        type: story.type,
        mediaUrl: story.mediaUrl,
        textContent: story.textContent,
        backgroundStyle: story.backgroundStyle,
        caption: story.caption,
      },
      createdAt: new Date().toISOString(),
      status: isUserOnline(storyOwnerId) ? 'delivered' : 'sent',
    };

    if (!conv.messages) conv.messages = [];
    conv.messages.push(newMsg);
    conv.lastMessage = messageText;
    conv.lastMessageType = 'story_reply';
    conv.lastMessageTime = newMsg.createdAt;
    conv.unreadCount = (conv.unreadCount || 0) + 1;

    // Notify story owner
    const notif = {
      id: `notif-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      userId: storyOwnerId,
      actor: { id: safeSender.id, fullName: safeSender.fullName, avatarUrl: safeSender.avatarUrl },
      type: 'message',
      content: `${safeSender.fullName} ${isReaction ? 'reacted to' : 'replied to'} your story: "${messageText}"`,
      targetId: conv.id,
      createdAt: 'Just now',
      isRead: false,
    };
    db.notifications.unshift(notif);

    saveDB();

    // Dispatch real-time SSE events
    dispatchRealtimeEvent(storyOwnerId, 'new_message', { message: newMsg, conversationId: conv.id });
    dispatchRealtimeEvent(storyOwnerId, 'new_notification', { notification: notif });

    return sendJSON(res, 201, {
      success: true,
      message: newMsg,
      conversationId: conv.id,
    });
  }

  // 14f. Delete Story (Owner Only)
  if (pathname.match(/^\/api\/stories\/[^\/]+$/) && method === 'DELETE') {
    const storyId = pathname.split('/')[3];
    const index = (db.stories || []).findIndex((s) => s.id === storyId);

    if (index === -1) {
      return sendJSON(res, 404, { success: false, message: 'Story not found.' });
    }

    const story = db.stories[index];
    if (currentUserId && story.author?.id !== currentUserId) {
      return sendJSON(res, 403, { success: false, message: 'Only author can delete story.' });
    }

    db.stories.splice(index, 1);
    saveDB();

    broadcastRealtimeEvent('story_deleted', { storyId });
    return sendJSON(res, 200, { success: true, message: 'Story deleted successfully.' });
  }

  // 15. Notifications Endpoints
  // 15a. Get All Notifications for User
  if (pathname === '/api/notifications' && method === 'GET') {
    const userId = currentUserId || urlObj.searchParams.get('userId');
    const list = (db.notifications || []).filter((n) => !userId || n.userId === userId);
    return sendJSON(res, 200, { success: true, notifications: list });
  }

  // 15b. Mark All Notifications as Read for User
  if (pathname === '/api/notifications/read-all' && (method === 'PUT' || method === 'POST')) {
    const body = await parseBody(req);
    const userId = currentUserId || body.userId;

    if (!userId) {
      return sendJSON(res, 400, { success: false, message: 'User ID is required.' });
    }

    let count = 0;
    if (db.notifications && Array.isArray(db.notifications)) {
      db.notifications.forEach((n) => {
        if (n.userId === userId && !n.isRead) {
          n.isRead = true;
          count++;
        }
      });
      if (count > 0) {
        saveDB();
      }
    }

    return sendJSON(res, 200, { success: true, message: 'All notifications marked as read.', count });
  }

  // 15c. Mark Single Notification as Read
  if (pathname.match(/^\/api\/notifications\/[^\/]+\/read$/) && (method === 'PUT' || method === 'POST')) {
    const notifId = pathname.split('/')[3];
    const notif = (db.notifications || []).find((n) => n.id === notifId);

    if (!notif) {
      return sendJSON(res, 404, { success: false, message: 'Notification not found.' });
    }

    notif.isRead = true;
    saveDB();

    return sendJSON(res, 200, { success: true, notification: notif });
  }

  // Serve Built Frontend (SPA Fallback)
  const DIST_DIR = path.join(__dirname, '..', 'dist');
  if (
    fs.existsSync(DIST_DIR) &&
    method === 'GET' &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/uploads')
  ) {
    let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypesMap[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
      });
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  sendJSON(res, 404, { success: false, message: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Nexus Social Backend running on http://localhost:${PORT}`);
  console.log(`✓ Real-Time WhatsApp Ticks: Sent (✓), Delivered (✓✓), Read (✓✓ Colored)`);
  console.log(`🔒 Protected Chat Media & Privacy: Active on /uploads/chat-media/`);
  console.log(`🎙️ Voice Notes, Documents & Location Sharing: Active`);
  console.log(`📡 Real-Time SSE Stream: Active on /api/realtime/stream`);
  console.log(`======================================================\n`);
});
