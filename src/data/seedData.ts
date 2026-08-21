import { User, Post, Story, Friend, Conversation, NotificationItem } from '../types';

export const currentUser: User = {
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

export const initialUsers: User[] = [
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
  },
  {
    id: 'user-hamza',
    username: 'hamza_mobile',
    fullName: 'Hamza Malik',
    email: 'hamza@flutter.dev',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80',
    bio: 'Mobile App Developer | Flutter & iOS enthusiast | Building cross-platform wonders 📱',
    location: 'Lahore, Pakistan',
    occupation: 'Senior Mobile Engineer',
    education: 'NUST Islamabad',
    joinedDate: 'Joined February 2024',
    friendsCount: 310,
    followersCount: 1450,
    followingCount: 280,
  },
  {
    id: 'user-zainab',
    username: 'zainab_cloud',
    fullName: 'Zainab Khan',
    email: 'zainab@microsoft.com',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80',
    coverUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&auto=format&fit=crop&q=80',
    bio: 'Cloud Architect @ Microsoft Azure | Kubernetes & DevOps Speaker ☁️',
    location: 'Seattle, WA',
    occupation: 'Cloud Solutions Architect',
    education: 'MIT',
    joinedDate: 'Joined August 2022',
    friendsCount: 740,
    followersCount: 5100,
    followingCount: 460,
    isVerified: true,
  }
];

export const initialStories: Story[] = [];

export const initialPosts: Post[] = [
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
    commentsCount: 14,
    sharesCount: 8,
    isSaved: false,
    comments: [
      {
        id: 'comm-1',
        postId: 'post-1',
        author: initialUsers[2], // Ahmad
        content: 'MashaAllah, huge congratulations Faseeh! Outstanding work on the real-time engineering components. Keep soaring! 🔥',
        createdAt: '18m ago',
        likesCount: 6,
        isLiked: true,
        replies: [
          {
            id: 'comm-1-rep-1',
            postId: 'post-1',
            author: currentUser,
            content: 'Thank you so much Ahmad Bhai! Looking forward to your mentorship always! 🙏',
            createdAt: '12m ago',
            likesCount: 2,
            isLiked: false,
          }
        ]
      },
      {
        id: 'comm-2',
        postId: 'post-1',
        author: initialUsers[1], // Dr. Sarah
        content: 'Impressive progress Faseeh! The clean architectural modularity is evident. Great job!',
        createdAt: '10m ago',
        likesCount: 4,
        isLiked: false,
      }
    ]
  },
  {
    id: 'post-2',
    author: initialUsers[1], // Dr. Sarah Jenkins
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
    commentsCount: 38,
    sharesCount: 45,
    isSaved: true,
    comments: [
      {
        id: 'comm-3',
        postId: 'post-2',
        author: initialUsers[5], // Zainab
        content: 'Fascinating findings Sarah! How does this scale with multi-modal inputs?',
        createdAt: '1h ago',
        likesCount: 8,
        isLiked: false,
      }
    ]
  },
  {
    id: 'post-3',
    author: initialUsers[3], // Elena
    content: "Design tip of the day: Clean whitespace and subtle 1px border contrast make complex enterprise apps feel 10x lighter and faster to navigate than heavy gradients. Here is a preview of our updated component library! ✨🖌️",
    mediaUrls: [
      'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&auto=format&fit=crop&q=80'
    ],
    mediaType: 'image',
    visibility: 'public',
    feeling: 'inspired 🎨',
    location: 'London Design Studio',
    createdAt: '4h ago',
    reactions: [
      { type: 'like', count: 85, userReacted: false },
      { type: 'love', count: 62, userReacted: true },
      { type: 'fire', count: 31, userReacted: false },
      { type: 'haha', count: 0, userReacted: false },
      { type: 'wow', count: 12, userReacted: false },
      { type: 'sad', count: 0, userReacted: false },
    ],
    totalReactions: 190,
    commentsCount: 19,
    sharesCount: 12,
    isSaved: false,
  }
];

export const initialFriends: Friend[] = [
  {
    ...initialUsers[1],
    mutualFriends: 18,
    status: 'friends',
  },
  {
    ...initialUsers[2],
    mutualFriends: 42,
    status: 'friends',
  },
  {
    ...initialUsers[3],
    mutualFriends: 7,
    status: 'friends',
  },
  {
    ...initialUsers[4],
    mutualFriends: 24,
    status: 'pending_received', // Incoming friend request
  },
  {
    ...initialUsers[5],
    mutualFriends: 15,
    status: 'suggested', // Suggested connection
  }
];

export const initialConversations: Conversation[] = [
  {
    id: 'conv-ahmad',
    participant: initialUsers[2], // Ahmad
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
      },
      {
        id: 'msg-3',
        conversationId: 'conv-ahmad',
        senderId: 'user-ahmad',
        text: 'Let me know whenever you want to do a code review on the microservices!',
        createdAt: '10m ago',
        isRead: false,
      }
    ]
  },
  {
    id: 'conv-sarah',
    participant: initialUsers[1], // Dr. Sarah
    lastMessage: 'Sent over the research notes on LLM agents!',
    lastMessageTime: '1h ago',
    unreadCount: 0,
    isOnline: false,
    messages: [
      {
        id: 'msg-4',
        conversationId: 'conv-sarah',
        senderId: 'user-sarah',
        text: 'Sent over the research notes on LLM agents!',
        createdAt: '1h ago',
        isRead: true,
      }
    ]
  },
  {
    id: 'conv-elena',
    participant: initialUsers[3], // Elena
    lastMessage: 'The new UI design system tokens look super clean! ✨',
    lastMessageTime: '3h ago',
    unreadCount: 0,
    isOnline: true,
    messages: [
      {
        id: 'msg-5',
        conversationId: 'conv-elena',
        senderId: 'user-elena',
        text: 'The new UI design system tokens look super clean! ✨',
        createdAt: '3h ago',
        isRead: true,
      }
    ]
  }
];

export const initialNotifications: NotificationItem[] = [];
