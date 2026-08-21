import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'social.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');
const COVERS_DIR = path.join(UPLOADS_DIR, 'covers');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload directories exist
[DATA_DIR, UPLOADS_DIR, AVATARS_DIR, COVERS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve uploaded static assets
app.use('/uploads', express.static(UPLOADS_DIR));

// Initial Database Loader
let db = {
  users: [],
  posts: [],
  stories: [],
  friends: [],
  conversations: [],
  notifications: []
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
      db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading DB:', err);
  }
};

loadDB();

// 1. Auth & Current User
app.get('/api/auth/me', (req, res) => {
  res.json({ success: true, user: db.users[0] || {} });
});

app.put('/api/auth/me', (req, res) => {
  if (db.users.length > 0) {
    db.users[0] = { ...db.users[0], ...req.body };
    saveDB();
    return res.json({ success: true, user: db.users[0] });
  }
  res.status(404).json({ success: false, message: 'User not found' });
});

// 2. Avatar & Cover Upload Endpoints
const saveBase64Image = (base64String, targetDir, prefix, oldUrl) => {
  // Delete old file if it was locally uploaded
  if (oldUrl && oldUrl.startsWith('/uploads/')) {
    const oldFilePath = path.join(__dirname, oldUrl);
    if (fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath);
      } catch (e) {
        console.warn('Could not remove old file:', e.message);
      }
    }
  }

  // Extract base64 payload
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image data');
  }

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');

  // Validate size (max 5MB)
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('File size exceeds 5MB limit');
  }

  let ext = 'jpg';
  if (mimeType.includes('png')) ext = 'png';
  else if (mimeType.includes('webp')) ext = 'webp';

  const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const filePath = path.join(targetDir, filename);

  fs.writeFileSync(filePath, buffer);
  const relativeDir = path.basename(targetDir);
  return `/uploads/${relativeDir}/${filename}`;
};

// Avatar Upload
app.post(['/api/users/:id/avatar', '/api/users/avatar'], (req, res) => {
  try {
    const { imageBase64, oldAvatarUrl } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'No image data provided' });
    }

    const savedUrl = saveBase64Image(imageBase64, AVATARS_DIR, 'avatar', oldAvatarUrl);

    if (db.users.length > 0) {
      db.users[0].avatarUrl = savedUrl;
      saveDB();
    }

    res.json({ success: true, avatarUrl: savedUrl });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Cover Upload
app.post(['/api/users/:id/cover', '/api/users/cover'], (req, res) => {
  try {
    const { imageBase64, oldCoverUrl } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'No image data provided' });
    }

    const savedUrl = saveBase64Image(imageBase64, COVERS_DIR, 'cover', oldCoverUrl);

    if (db.users.length > 0) {
      db.users[0].coverUrl = savedUrl;
      saveDB();
    }

    res.json({ success: true, coverUrl: savedUrl });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 3. Posts & Feed
app.get('/api/posts', (req, res) => {
  res.json({ success: true, posts: db.posts });
});

app.post('/api/posts', (req, res) => {
  const newPost = {
    id: `post-${Date.now()}`,
    author: db.users[0],
    content: req.body.content || '',
    mediaUrls: req.body.mediaUrls || [],
    mediaType: req.body.mediaType || 'image',
    visibility: req.body.visibility || 'public',
    feeling: req.body.feeling,
    location: req.body.location,
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
    comments: []
  };

  db.posts.unshift(newPost);
  saveDB();
  res.status(201).json({ success: true, post: newPost });
});

app.delete('/api/posts/:id', (req, res) => {
  db.posts = db.posts.filter((p) => p.id !== req.params.id);
  saveDB();
  res.json({ success: true });
});

// Post Reactions (Like, Love, Haha, Wow, Sad, Fire)
app.post('/api/posts/:id/react', (req, res) => {
  const { type } = req.body;
  const post = db.posts.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ success: false });

  const existingReaction = post.reactions.find((r) => r.type === type);
  if (existingReaction) {
    if (existingReaction.userReacted) {
      existingReaction.userReacted = false;
      existingReaction.count = Math.max(0, existingReaction.count - 1);
      post.totalReactions = Math.max(0, post.totalReactions - 1);
    } else {
      post.reactions.forEach((r) => {
        if (r.userReacted) {
          r.userReacted = false;
          r.count = Math.max(0, r.count - 1);
          post.totalReactions = Math.max(0, post.totalReactions - 1);
        }
      });
      existingReaction.userReacted = true;
      existingReaction.count += 1;
      post.totalReactions += 1;
    }
  }

  saveDB();
  res.json({ success: true, post });
});

// Post Comments
app.post('/api/posts/:id/comments', (req, res) => {
  const post = db.posts.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ success: false });

  const newComment = {
    id: `comm-${Date.now()}`,
    postId: post.id,
    author: db.users[0],
    content: req.body.content || '',
    createdAt: 'Just now',
    likesCount: 0,
    isLiked: false,
    replies: []
  };

  if (!post.comments) post.comments = [];
  post.comments.push(newComment);
  post.commentsCount = (post.commentsCount || 0) + 1;

  saveDB();
  res.status(201).json({ success: true, comment: newComment, post });
});

// Bookmark / Save Post
app.post('/api/posts/:id/save', (req, res) => {
  const post = db.posts.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ success: false });

  post.isSaved = !post.isSaved;
  saveDB();
  res.json({ success: true, isSaved: post.isSaved });
});

// 4. Stories
app.get('/api/stories', (req, res) => {
  res.json({ success: true, stories: db.stories });
});

app.post('/api/stories', (req, res) => {
  const newStory = {
    id: `story-${Date.now()}`,
    author: db.users[0],
    mediaUrl: req.body.mediaUrl,
    mediaType: req.body.mediaType || 'image',
    caption: req.body.caption || '',
    createdAt: 'Just now',
    isViewed: false
  };

  db.stories.unshift(newStory);
  saveDB();
  res.status(201).json({ success: true, story: newStory });
});

// 5. Friends & Social Graph
app.get('/api/friends', (req, res) => {
  res.json({ success: true, friends: db.friends });
});

app.post('/api/friends/request/:id', (req, res) => {
  const friend = db.friends.find((f) => f.id === req.params.id);
  if (friend) {
    friend.status = 'pending_sent';
    saveDB();
  }
  res.json({ success: true, friend });
});

app.post('/api/friends/accept/:id', (req, res) => {
  const friend = db.friends.find((f) => f.id === req.params.id);
  if (friend) {
    friend.status = 'friends';
    saveDB();
  }
  res.json({ success: true, friend });
});

app.post('/api/friends/reject/:id', (req, res) => {
  const friend = db.friends.find((f) => f.id === req.params.id);
  if (friend) {
    friend.status = 'suggested';
    saveDB();
  }
  res.json({ success: true, friend });
});

// 6. Conversations & Messages
app.get('/api/conversations', (req, res) => {
  res.json({ success: true, conversations: db.conversations });
});

app.post('/api/conversations/:id/messages', (req, res) => {
  const conv = db.conversations.find((c) => c.id === req.params.id);
  if (!conv) return res.status(404).json({ success: false });

  const newMsg = {
    id: `msg-${Date.now()}`,
    conversationId: conv.id,
    senderId: db.users[0]?.id || 'user-faseeh',
    text: req.body.text || '',
    mediaUrl: req.body.mediaUrl,
    createdAt: 'Just now',
    isRead: true
  };

  if (!conv.messages) conv.messages = [];
  conv.messages.push(newMsg);
  conv.lastMessage = newMsg.text;
  conv.lastMessageTime = 'Just now';

  saveDB();
  res.status(201).json({ success: true, message: newMsg, conversation: conv });
});

// 7. Notifications
app.get('/api/notifications', (req, res) => {
  res.json({ success: true, notifications: db.notifications });
});

app.put('/api/notifications/read-all', (req, res) => {
  db.notifications.forEach((n) => (n.isRead = true));
  saveDB();
  res.json({ success: true });
});

// 8. Search Users & Posts
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  if (!q) return res.json({ success: true, users: [], posts: [] });

  const matchedUsers = db.users.filter(
    (u) => u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.bio.toLowerCase().includes(q)
  );

  const matchedPosts = db.posts.filter((p) => p.content.toLowerCase().includes(q));

  res.json({ success: true, users: matchedUsers, posts: matchedPosts });
});

app.listen(PORT, () => {
  console.log(`Nexus Social Backend running on http://localhost:${PORT}`);
});
