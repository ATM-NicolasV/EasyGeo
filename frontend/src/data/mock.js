// Mock data for news application

export const mockNews = [
  {
    id: 1,
    title: "De Blasio pulled in a cash cushion from unusual campaign finance setup",
    category: "Politics",
    author: "Sarah Johnson",
    source: "NewsSource",
    publishedAt: "2025-01-15T10:30:00Z",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=300&fit=crop",
    content: "New York: As Montana Gov. Steve Bullock stood on the debate stage last week and listened to his 2020 rivals bicker and criticize one another, visions of a second term of President Donald Trump kept flashing through his mind. I saw this re-election becoming more likely with each passing minute, Bullock said Wednesday at the National Press Club, continuing his post-debate critique.",
    featured: true
  },
  {
    id: 2,
    title: "Stars fires back at Anderson and England despite injury setback",
    category: "Sports",
    author: "Mike Wilson",
    source: "SportsTimes",
    publishedAt: "2025-01-15T09:15:00Z",
    readTime: "3 min read",
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=300&fit=crop",
    content: "The cricket star responded to criticism from former England captain with a series of impressive performances despite dealing with a shoulder injury that has plagued him for weeks.",
    featured: false
  },
  {
    id: 3,
    title: "How San Francisco's Wealthiest Families Launched Kamala Harris",
    category: "Politics",
    author: "David Chen",
    source: "Political Weekly",
    publishedAt: "2025-01-15T08:45:00Z",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&h=300&fit=crop",
    content: "A deep dive into the financial backing and political connections that helped shape the Vice President's early career in California politics.",
    featured: false
  },
  {
    id: 4,
    title: "Indian Prime Minister Modi to visit White House June 20",
    category: "Politics",
    author: "Rachel Martinez",
    source: "Global News",
    publishedAt: "2025-01-15T07:20:00Z",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1524230659092-07f99a75c013?w=400&h=300&fit=crop",
    content: "The upcoming bilateral meeting is expected to focus on trade relations, climate change initiatives, and regional security in the Indo-Pacific.",
    featured: false
  },
  {
    id: 5,
    title: "Obama Foundation draws high dollar, international donations",
    category: "Politics",
    author: "Jennifer Adams",
    source: "Foundation Watch",
    publishedAt: "2025-01-15T06:30:00Z",
    readTime: "6 min read",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop",
    content: "The former president's foundation continues to attract significant funding from international donors and major corporations for its Chicago-based initiatives.",
    featured: true
  },
  {
    id: 6,
    title: "Tech Giants Face New Regulatory Challenges in 2025",
    category: "Tech",
    author: "Alex Thompson",
    source: "TechDaily",
    publishedAt: "2025-01-15T05:45:00Z",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop",
    content: "Major technology companies are preparing for increased scrutiny as new legislation targeting data privacy and market competition takes effect.",
    featured: false
  },
  {
    id: 7,
    title: "Hollywood Studios Resume Production After Strike Resolution",
    category: "Movies",
    author: "Emma Rodriguez",
    source: "Entertainment Weekly",
    publishedAt: "2025-01-15T04:15:00Z",
    readTime: "4 min read",
    image: "https://images.unsplash.com/photo-1489599096090-da4875c49a2d?w=400&h=300&fit=crop",
    content: "Film and television production is set to resume across major studios following the successful resolution of the writers' and actors' strikes.",
    featured: false
  }
];

export const categories = [
  { id: 'all', name: 'All', color: '#6366f1' },
  { id: 'politics', name: 'Politics', color: '#ef4444' },
  { id: 'sports', name: 'Sports', color: '#10b981' },
  { id: 'movies', name: 'Movies', color: '#f59e0b' },
  { id: 'tech', name: 'Tech', color: '#8b5cf6' }
];

export const mockUsers = [
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    role: "user",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    joinDate: "2024-10-15",
    isActive: true
  },
  {
    id: 2,
    name: "Sarah Admin",
    email: "admin@example.com",
    role: "admin",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
    joinDate: "2024-01-10",
    isActive: true
  }
];

export const mockGlossary = [
  {
    id: 1,
    term: "API",
    definition: "Application Programming Interface - un ensemble de règles et de protocoles qui permettent à différentes applications de communiquer entre elles.",
    category: "Tech"
  },
  {
    id: 2,
    term: "Blockchain",
    definition: "Une technologie de stockage et de transmission d'informations sans organe de contrôle central.",
    category: "Tech"
  },
  {
    id: 3,
    term: "Géopolitique",
    definition: "L'étude des relations internationales sous l'angle géographique, politique et stratégique.",
    category: "Politics"
  }
];

export const mockSources = [
  {
    id: 1,
    name: "NewsSource",
    url: "https://newsource.com",
    category: "General",
    isActive: true,
    credibilityScore: 8.5,
    lastUpdated: "2025-01-15T12:00:00Z"
  },
  {
    id: 2,
    name: "SportsTimes",
    url: "https://sportstimes.com",
    category: "Sports",
    isActive: true,
    credibilityScore: 7.8,
    lastUpdated: "2025-01-15T11:30:00Z"
  }
];

export const mockAIModels = [
  {
    id: 1,
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    modelId: "gpt-4-turbo-preview",
    apiKey: "sk-proj-*********************",
    costPerToken: 0.00003,
    maxTokens: 4096,
    temperature: 0.7,
    isActive: true,
    features: ["text-analysis", "sentiment", "summarization"],
    addedDate: "2024-12-01T10:00:00Z",
    lastUsed: "2025-01-15T14:30:00Z",
    usageCount: 1247
  },
  {
    id: 2,
    name: "Claude-3 Sonnet",
    provider: "Anthropic",
    modelId: "claude-3-sonnet-20240229",
    apiKey: "sk-ant-*********************",
    costPerToken: 0.000025,
    maxTokens: 4096,
    temperature: 0.5,
    isActive: true,
    features: ["text-analysis", "fact-checking", "classification"],
    addedDate: "2024-11-15T09:15:00Z",
    lastUsed: "2025-01-15T13:45:00Z",
    usageCount: 892
  },
  {
    id: 3,
    name: "Gemini Pro",
    provider: "Google",
    modelId: "gemini-pro",
    apiKey: "AIzaSy*********************",
    costPerToken: 0.00002,
    maxTokens: 2048,
    temperature: 0.8,
    isActive: false,
    features: ["text-analysis", "translation"],
    addedDate: "2024-10-20T16:20:00Z",
    lastUsed: "2024-12-10T11:20:00Z",
    usageCount: 156
  }
];