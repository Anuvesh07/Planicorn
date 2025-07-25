<div align="center">

# ✨ Task Manager

*A modern, minimalist task management application*

[![React](https://img.shields.io/badge/React-18.2.0-blue?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green?logo=mongodb)](https://mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Demo](#) • [Features](#features) • [Quick Start](#quick-start) • [API](#api)

</div>

---

## ✨ Features

🔐 **Secure Authentication** - JWT-based login & registration  
📋 **Drag & Drop Tasks** - Intuitive Kanban-style board  
⚡ **Real-time Updates** - Live sync across devices  
📱 **Responsive Design** - Works on all screen sizes  
🚀 **Performance Optimized** - Lazy loading & caching  
🛡️ **Security First** - Rate limiting & input validation  

## 🚀 Quick Start

```bash
# Clone & install
git clone <your-repo-url>
cd task-manager

# Backend setup
cd backend && npm install
cp .env.example .env  # Configure your MongoDB URI

# Frontend setup  
cd ../frontend && npm install
cp .env.example .env

# Start development servers
cd ../backend && npm run dev    # Terminal 1
cd ../frontend && npm run dev   # Terminal 2
```

**Open** → `http://localhost:5173`

## 🛠️ Tech Stack

**Frontend**  
React • Vite • React DnD • Axios • CSS Modules

**Backend**  
Node.js • Express • MongoDB • Socket.IO • JWT

**DevOps**  
PM2 • Docker Ready • Automated Deployment

## 📁 Project Structure

```
task-manager/
├── 🎨 frontend/          # React app
├── ⚙️  backend/           # Node.js API  
├── 📜 scripts/           # Deployment tools
└── 📚 docs/              # Documentation
```

## 🔧 Environment Setup

**Backend** (`.env`)
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/taskmanager
JWT_SECRET=your-super-secret-key
PORT=5000
```

**Frontend** (`.env`)
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## 📡 API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | User registration |
| `POST` | `/api/auth/login` | User login |
| `GET` | `/api/tasks` | Get user tasks |
| `POST` | `/api/tasks` | Create task |
| `PUT` | `/api/tasks/:id` | Update task |
| `DELETE` | `/api/tasks/:id` | Delete task |

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests  
cd frontend && npm test

# Integration tests
cd frontend && npm test -- --run CompleteUserJourney
```

## 🚀 Deployment

**Quick Deploy**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**Production with PM2**
```bash
cd backend
pm2 start ecosystem.config.js --env production
```

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by [Your Name]**

[⭐ Star this repo](https://github.com/yourusername/task-manager) • [🐛 Report Bug](https://github.com/yourusername/task-manager/issues) • [💡 Request Feature](https://github.com/yourusername/task-manager/issues)

</div>