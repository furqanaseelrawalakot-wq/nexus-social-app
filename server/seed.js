import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'social.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Copy seed data into social.json
const currentUser = {
  id: 'user-faseeh',
  username: 'faseeh_rehman',
  fullName: 'Faseeh-ur-Rehman',
  email: 'faseeh@example.com',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
  coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
  bio: 'Software Engineering (8th Sem) @ CUST Islamabad 🎓 | Software Engineering Intern @ 07B Arch Technologies 💻 | Full-Stack & AI Builder',
  location: 'Islamabad, Pakistan',
  occupation: 'Software Engineering Intern @ 07B Arch Technologies',
  education: 'Capital University of Science and Technology (CUST)',
  website: 'https://github.com/faseeh',
  joinedDate: 'Joined January 2024',
  friendsCount: 428,
  followersCount: 1250,
  followingCount: 380,
  isVerified: true,
  privacySettings: {
    whoCanSeePosts: 'public',
    whoCanSendRequests: 'everyone',
    showOnlineStatus: true,
  },
};

const initialUsers = [
  currentUser,
  {
    id: 'user-sarah',
    username: 'sarah_ai',
    fullName: 'Dr. Sarah Jenkins',
    email: 'sarah@ai.org',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&auto=format&fit=crop&q=80',
    bio: 'Senior AI Research Scientist @ Stanford AI Lab. Exploring LLM alignment & reasoning.',
    location: 'San Francisco, CA',
    occupation: 'Senior AI Researcher',
    education: 'Stanford University',
    joinedDate: 'Joined March 2023',
    friendsCount: 680,
    followersCount: 8900,
    followingCount: 410,
    isVerified: true,
  },
  {
    id: 'user-ahmad',
    username: 'ahmad_dev',
    fullName: 'Ahmad Tariq',
    email: 'ahmad@careem.com',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&auto=format&fit=crop&q=80',
    bio: 'Lead Full-Stack Engineer @ Careem | CUST Alum | React & Node Architect 🚀',
    location: 'Islamabad, Pakistan',
    occupation: 'Lead Full-Stack Engineer @ Careem',
    education: 'CUST Islamabad',
    joinedDate: 'Joined June 2022',
    friendsCount: 512,
    followersCount: 2300,
    followingCount: 300,
    isVerified: true,
  },
  {
    id: 'user-elena',
    username: 'elena_design',
    fullName: 'Elena Rostova',
    email: 'elena@figma.com',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop&q=80',
    bio: 'Design Systems Lead @ Figma | Minimalist UI / UX advocate ✨',
    location: 'London, UK',
    occupation: 'Product Design Lead',
    education: 'Royal College of Art',
    joinedDate: 'Joined September 2023',
    friendsCount: 390,
    followersCount: 6400,
    followingCount: 520,
    isVerified: true,
  }
];

const initialPosts = [
  {
    id: 'post-1',
    author: currentUser,
    content: "Thrilled to share that we just completed our final sprint for the 8th semester capstone and internship deliverables! Built full-stack microservices with real-time WebSockets and optimized React architectures. Big thanks to the team at 07B Arch Technologies and my mentors at CUST! 🚀💻✨\n\nWhat tech stack are you most excited about this year?",
    mediaUrls: [
      'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80'
    ],
    mediaType: 'image',
    visibility: 'public',
    feeling: 'celebrating 🎓',
    location: 'Islamabad, Pakistan',
    createdAt: '25m ago',
    reactions: [
      { type: 'like', count: 34, userReacted: false },
      { type: 'love', count: 48, userReacted: true },
      { type: 'fire', count: 22, userReacted: false },
      { type: 'haha', count: 0, userReacted: false },
      { type: 'wow', count: 5, userReacted: false },
      { type: 'sad', count: 0, userReacted: false },
    ],
    totalReactions: 109,
    commentsCount: 2,
    sharesCount: 8,
    isSaved: false,
    comments: [
      {
        id: 'comm-1',
        postId: 'post-1',
        author: initialUsers[2],
        content: 'MashaAllah, huge congratulations Faseeh! Outstanding work on the real-time engineering components. Keep soaring! 🔥',
        createdAt: '18m ago',
        likesCount: 6,
        isLiked: true,
        replies: []
      }
    ]
  },
  {
    id: 'post-2',
    author: initialUsers[1],
    content: "Published our new preprint on Multi-Agent Reasoning Chains! We observed a 34% reduction in hallucinations when combining iterative self-correction with structured verification passes. Link to the paper in bio! 📄🤖 #ArtificialIntelligence #MachineLearning #Research",
    mediaUrls: [
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&auto=format&fit=crop&q=80'
    ],
    mediaType: 'image',
    visibility: 'public',
    feeling: 'excited 🧠',
    location: 'Stanford, California',
    createdAt: '2h ago',
    reactions: [
      { type: 'like', count: 180, userReacted: true },
      { type: 'love', count: 95, userReacted: false },
      { type: 'wow', count: 42, userReacted: false },
      { type: 'fire', count: 68, userReacted: false },
      { type: 'haha', count: 0, userReacted: false },
      { type: 'sad', count: 0, userReacted: false },
    ],
    totalReactions: 385,
    commentsCount: 1,
    sharesCount: 45,
    isSaved: true,
    comments: []
  }
];

const initialData = {
  users: initialUsers,
  posts: initialPosts,
  stories: [
    {
      id: 'story-1',
      author: currentUser,
      mediaUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
      mediaType: 'image',
      caption: 'Late night coding session at the office ☕💻',
      createdAt: '1h ago',
      isViewed: false,
    }
  ],
  friends: [
    { ...initialUsers[1], mutualFriends: 18, status: 'friends' },
    { ...initialUsers[2], mutualFriends: 42, status: 'friends' },
    { ...initialUsers[3], mutualFriends: 7, status: 'friends' }
  ],
  conversations: [
    {
      id: 'conv-ahmad',
      participant: initialUsers[2],
      lastMessage: 'Let me know whenever you want to do a code review on the microservices!',
      lastMessageTime: '10m ago',
      unreadCount: 1,
      isOnline: true,
      messages: [
        {
          id: 'msg-1',
          conversationId: 'conv-ahmad',
          senderId: 'user-ahmad',
          text: 'Hey Faseeh! How is the internship project going?',
          createdAt: '15m ago',
          isRead: true,
        },
        {
          id: 'msg-2',
          conversationId: 'conv-ahmad',
          senderId: 'user-faseeh',
          text: 'Going great Ahmad Bhai! Just added WebSocket live notifications and optimized the state cache.',
          createdAt: '12m ago',
          isRead: true,
        }
      ]
    }
  ],
  notifications: [
    {
      id: 'notif-1',
      type: 'like',
      actor: initialUsers[1],
      content: 'reacted ❤️ to your post: "Thrilled to share that we just completed our final sprint..."',
      targetId: 'post-1',
      createdAt: '22m ago',
      isRead: false,
    }
  ]
};

fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
console.log('Seed data successfully generated in server/data/social.json');
