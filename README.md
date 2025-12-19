# 🎵 CrowdBeat

> A crowd-sourced music creation platform where users collaborate to create songs through lyrics submission, voting, AI generation, and community feedback.

![CrowdBeat](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

## ✨ Features

### Core Features
- **Session-based Music Creation**: Create collaborative music sessions with multiple stages
- **Lyrics Submission & Voting**: Community submits and votes on lyrics
- **AI Song Generation**: Generate multiple song versions from winning lyrics
- **Granular Voting**: Vote on specific song elements (BPM, instruments, sections)
- **Real-time Collaboration**: Live updates via WebSocket

### Community Features
- **Reputation System**: Earn reputation through contributions
- **Badges & Rewards**: Unlock achievements and earn rewards
- **Tipping**: Support creators with tips
- **Leaderboards**: Compete for top contributor spots

### Live Features
- **Live Streaming Integration**: Host live sessions with Twitch/YouTube
- **Real-time Chat**: Engage with participants during sessions
- **Word Cloud Feedback**: Visual feedback aggregation
- **Hype Meter**: Track session energy levels

### Admin Features
- **Dashboard**: Platform analytics and metrics
- **User Management**: Moderate users and content
- **Report System**: Handle user reports
- **Announcements**: Platform-wide communications

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Cache**: Redis
- **Real-time**: Socket.io
- **Authentication**: JWT

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **State**: Zustand + React Query
- **Routing**: React Router v6
- **Animations**: Framer Motion
- **Icons**: Heroicons

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- MongoDB 7.0+
- Redis 7.0+ (optional)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/crowdbeat.git
cd crowdbeat
```

2. **Install dependencies**
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. **Set up environment variables**
```bash
# Server
cp server/.env.example server/.env
# Edit server/.env with your values

# Client
cp client/.env.example client/.env
# Edit client/.env with your values
```

4. **Start MongoDB and Redis**
```bash
# Using Docker (recommended)
docker-compose up -d mongo redis

# Or start manually
mongod --dbpath /your/data/path
redis-server
```

5. **Initialize the database**
```bash
cd server
npm run seed # If available
```

6. **Start the development servers**
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

7. **Open your browser**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- API Health: http://localhost:5000/api/health

## 📁 Project Structure

```
crowdbeat/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom hooks
│   │   ├── context/        # React contexts
│   │   ├── utils/          # Utility functions
│   │   └── styles/         # Global styles
│   ├── public/             # Static assets
│   └── package.json
│
├── server/                 # Express backend
│   ├── controllers/        # Route handlers
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── middleware/         # Express middleware
│   ├── services/           # Business logic
│   ├── utils/              # Utility functions
│   └── package.json
│
├── docker-compose.yml      # Docker services
├── Dockerfile              # Production image
└── README.md
```

## ⚙️ Environment Variables

### Server (.env)
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `CORS_ORIGINS` | Allowed origins | - |

### Client (.env)
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:5000/api` |
| `VITE_WS_URL` | WebSocket URL | `ws://localhost:5000` |

## 📖 API Documentation

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login user |
| `/api/auth/logout` | POST | Logout user |
| `/api/auth/me` | GET | Get current user |

### Sessions
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sessions` | GET | List all sessions |
| `/api/sessions` | POST | Create session |
| `/api/sessions/:id` | GET | Get session details |
| `/api/sessions/:id/lyrics` | POST | Submit lyrics |
| `/api/sessions/:id/lyrics/:id/vote` | POST | Vote on lyrics |

### Health
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Basic health check |
| `/api/health/full` | GET | Detailed health status |

## 🐳 Deployment

### Using Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Manual Deployment

1. Build the client:
```bash
cd client
npm run build
```

2. Start the server:
```bash
cd server
NODE_ENV=production node server.js
```

### Environment-specific Configs

- **Development**: Uses hot-reload, verbose logging
- **Staging**: Uses staging database, reduced logging
- **Production**: Optimized builds, minimal logging, caching

## 🧪 Testing

```bash
# Run server tests
cd server
npm test

# Run client tests
cd client
npm test

# Run E2E tests
npm run test:e2e
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- ESLint + Prettier for formatting
- Conventional Commits for commit messages
- Write tests for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Socket.io](https://socket.io/)

---

Built with ❤️ by the CrowdBeat Team
