# 🎯 Ad Manager - Admin Panel

A modern, responsive admin panel for managing advertising campaigns, built with React 18, TypeScript, and Tailwind CSS.

## ✨ Features

- 🔐 **JWT Authentication** - Secure login with token-based auth
- 📊 **Real-time Dashboard** - View campaign stats, impressions, clicks, and CTR
- 👥 **Advertiser Management** - Full CRUD operations for advertiser accounts
- 📢 **Campaign Management** - Create and manage ad campaigns with targeting
- 🖼️ **Creative Management** - Upload and manage ad images
- 🎨 **Modern UI** - Beautiful, responsive design with Tailwind CSS
- ⚡ **Fast** - Built with Vite for lightning-fast development
- 🐳 **Docker Ready** - Production-ready containerization

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (for development)
- Docker (for production)
- Backend API running on port 8000

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open browser
# http://localhost:3000
```

### Production

```bash
# Build for production
npm run build

# Or use Docker
docker build -t ad-manager-frontend .
docker run -p 80:80 ad-manager-frontend
```

## 🔑 Default Credentials

- **Email:** admin@newstarsradio.com
- **Password:** changeme123

## 📁 Project Structure

```
src/
├── pages/              # Page components
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── AdvertisersPage.tsx
│   ├── CampaignsPage.tsx
│   └── CreativesPage.tsx
├── lib/                # Utilities
│   ├── api.ts         # Axios instance
│   └── utils.ts       # Helper functions
├── stores/            # State management
│   └── authStore.ts   # Authentication state
├── App.tsx            # Main app & routing
└── main.tsx           # Entry point
```

## 🛠 Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **TanStack Query** - Data fetching
- **Zustand** - State management
- **React Router v6** - Routing
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Axios** - HTTP client

## 📚 Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Docker
docker build -t ad-manager-frontend .
docker run -p 80:80 ad-manager-frontend
```

## 🌐 API Integration

The frontend expects the backend API to be available at:
- **Development:** http://localhost:8000
- **Production:** Configure via Nginx proxy or environment variable

All API calls are automatically authenticated with JWT tokens stored in localStorage.

## 🎨 Customization

### Change API URL

Edit `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': 'http://your-api-url:8000'
  }
}
```

### Change Theme Colors

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: '#your-color'
    }
  }
}
```

## 🔒 Security

- JWT token authentication
- Protected routes
- Automatic logout on token expiration
- CORS configured
- Security headers in production
- XSS protection

## 📊 Pages Overview

### Dashboard
- Campaign statistics overview
- Top performing campaigns table
- Quick action buttons
- Real-time metrics

### Advertisers
- List all advertisers
- Create/edit/delete operations
- Status management
- Contact information

### Campaigns
- Campaign grid view
- Budget progress tracking
- Pause/resume functionality
- Geographic targeting
- Priority levels
- Date range selection

### Creatives
- Image grid view
- Drag & drop upload
- Image preview
- Click URL management
- Alt text for accessibility

## 🐳 Docker Deployment

The project includes production-ready Docker configuration:

```yaml
# docker-compose.yml (in parent directory)
services:
  frontend:
    build: ./admin-panel
    ports:
      - "80:80"
    depends_on:
      - backend
```

Features:
- Multi-stage build (Node + Nginx)
- Optimized bundle size
- Gzip compression
- Security headers
- SPA routing support
- Asset caching
- Health checks

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

## 📝 Environment Variables

Create `.env.local` for development:

```env
VITE_API_URL=http://localhost:8000
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is part of the New Stars Radio Ad Manager system.

## 🆘 Support

For issues and questions:
- Check the [API Documentation](http://localhost:8000/docs)
- Review the [Backend README](../README.md)
- Check the completion guide: [QS_PROMPT_5_COMPLETE.md](./QS_PROMPT_5_COMPLETE.md)

## 🎯 Roadmap

Future enhancements:
- [ ] Advanced filtering & search
- [ ] Export reports to CSV/PDF
- [ ] Real-time notifications
- [ ] Dark mode
- [ ] User management
- [ ] Activity logs
- [ ] Charts & graphs
- [ ] Bulk operations

## ✅ Status

**Version:** 1.0.0  
**Status:** Production Ready ✅  
**Last Updated:** December 14, 2025

---

Built with ❤️ for New Stars Radio



