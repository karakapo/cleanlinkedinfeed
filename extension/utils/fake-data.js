// Sahte LinkedIn post verileri
export const fakePosts = [
  {
    id: '1',
    author: 'John Doe',
    content: '🚀 Just launched my new startup! Check it out and let me know what you think. #entrepreneurship #startup #innovation',
    category: 'self-promo',
    timestamp: '2 hours ago'
  },
  {
    id: '2',
    author: 'Jane Smith',
    content: 'Another Monday, another opportunity to crush your goals! 💪 Remember: success is not final, failure is not fatal. Keep pushing forward! #motivation #mondaymotivation #success',
    category: 'motivational-trash',
    timestamp: '3 hours ago'
  },
  {
    id: '3',
    author: 'Tech Corp',
    content: '🎉 Limited time offer! Get 50% off on our premium software. Use code SAVE50 at checkout. Don\'t miss out! #deal #software #discount',
    category: 'advertisement',
    timestamp: '4 hours ago'
  },
  {
    id: '4',
    author: 'Sarah Johnson',
    content: 'Just finished reading an excellent article about machine learning in healthcare. The potential applications are fascinating. Here are my key takeaways: [article link]',
    category: 'genuine',
    timestamp: '5 hours ago'
  },
  {
    id: '5',
    author: 'Mike Wilson',
    content: 'CLICK HERE NOW!!! FREE MONEY!!! 💰💰💰 Make $5000 a day working from home!!! No experience needed!!!',
    category: 'spam',
    timestamp: '6 hours ago'
  },
  {
    id: '6',
    author: 'Emily Chen',
    content: 'Excited to share that I\'ll be speaking at the upcoming AI conference next month. I\'ll be discussing the future of NLP and transformer models. Looking forward to connecting with fellow researchers!',
    category: 'genuine',
    timestamp: '7 hours ago'
  },
  {
    id: '7',
    author: 'Robert Brown',
    content: 'Follow me for daily motivation! Like and share if you agree! 🙏✨ Remember: You are capable of amazing things! #motivation #inspiration #success #mindset #goals',
    category: 'motivational-trash',
    timestamp: '8 hours ago'
  },
  {
    id: '8',
    author: 'Marketing Pro',
    content: '🔥 HOT DEAL ALERT! Our new course "Master Digital Marketing in 30 Days" is now available. First 100 students get 80% off! Enroll now!',
    category: 'advertisement',
    timestamp: '9 hours ago'
  },
  {
    id: '9',
    author: 'David Lee',
    content: 'Interesting discussion in the comments about the trade-offs between model accuracy and inference speed. I think there\'s a sweet spot that many teams miss. What are your thoughts?',
    category: 'genuine',
    timestamp: '10 hours ago'
  },
  {
    id: '10',
    author: 'Spam Bot',
    content: 'URGENT!!! Your account will be suspended!!! Click here immediately!!! Verify your identity now!!!',
    category: 'spam',
    timestamp: '11 hours ago'
  },
  {
    id: '11',
    author: 'Lisa Anderson',
    content: 'Proud to announce that our team has successfully completed the migration to microservices architecture. The performance improvements are significant. Here\'s what we learned...',
    category: 'genuine',
    timestamp: '12 hours ago'
  },
  {
    id: '12',
    author: 'Motivation Guru',
    content: 'The only way to do great work is to love what you do! ❤️ If you haven\'t found it yet, keep looking! #quote #inspiration #motivation #monday',
    category: 'motivational-trash',
    timestamp: '13 hours ago'
  },
  {
    id: '13',
    author: 'Alex Taylor',
    content: 'Just published a detailed analysis of the latest trends in cloud computing. The shift towards serverless architectures is accelerating. Full report: [link]',
    category: 'genuine',
    timestamp: '14 hours ago'
  },
  {
    id: '14',
    author: 'Sales Expert',
    content: 'Want to 10x your sales? My new book reveals the secrets! Buy now and get exclusive bonuses worth $500! Limited time only!',
    category: 'advertisement',
    timestamp: '15 hours ago'
  },
  {
    id: '15',
    author: 'Tom Harris',
    content: 'I\'ve been working on a new open-source project for the past few months. It\'s a tool that helps developers manage API documentation more efficiently. Would love to get feedback from the community!',
    category: 'genuine',
    timestamp: '16 hours ago'
  }
];

// Kategori tanımları
export const categories = {
  'spam': { label: 'Spam', threshold: 0.7 },
  'self-promo': { label: 'Self-Promotion', threshold: 0.6 },
  'motivational-trash': { label: 'Motivational Trash', threshold: 0.65 },
  'advertisement': { label: 'Advertisement', threshold: 0.7 },
  'genuine': { label: 'Genuine', threshold: 0.5 }
};

