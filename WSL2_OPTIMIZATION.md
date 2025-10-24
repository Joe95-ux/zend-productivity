# WSL2 Performance Optimization Guide

## 🐌 WSL2 Performance Issues

WSL2 is known for slow file I/O operations, especially with:
- Database operations (MongoDB/Prisma)
- Node.js development
- File system operations
- Docker containers

## 🚀 WSL2 Optimization Solutions

### **1. Move Project to WSL2 File System**

**Current Issue**: You're likely running from Windows file system (`/mnt/c/...`)
**Solution**: Move project to WSL2 native file system

```bash
# Check current location
pwd
# If it shows /mnt/c/... you're on Windows file system

# Move to WSL2 home directory
cd ~
mkdir -p ~/projects
cp -r /mnt/c/Users/USER/Desktop/Projects/zend-productivity ~/projects/
cd ~/projects/zend-productivity

# Update your development environment
code .  # Open in WSL2
```

### **2. Database Optimization for WSL2**

#### **Option A: Use MongoDB Atlas (Cloud)**
```bash
# Replace local MongoDB with Atlas
# Update .env.local
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/zend-productivity?retryWrites=true&w=majority"
```

#### **Option B: Optimize Local MongoDB for WSL2**
```bash
# Install MongoDB in WSL2 (not Windows)
sudo apt update
sudo apt install -y mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Update .env.local
DATABASE_URL="mongodb://localhost:27017/zend-productivity"
```

### **3. WSL2 Memory & CPU Optimization**

#### **Create `.wslconfig` in Windows**
```ini
# C:\Users\USER\.wslconfig
[wsl2]
memory=8GB
processors=4
swap=2GB
localhostForwarding=true
```

#### **Restart WSL2**
```bash
# In Windows PowerShell (as Administrator)
wsl --shutdown
wsl
```

### **4. Node.js Performance Optimization**

#### **Update `.env.local`**
```bash
# Add these environment variables
NODE_OPTIONS="--max-old-space-size=4096"
UV_THREADPOOL_SIZE=16
```

#### **Use Node.js in WSL2 (not Windows)**
```bash
# Install Node.js in WSL2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### **5. Development Server Optimization**

#### **Update `next.config.ts`**
```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Optimize for WSL2
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  // Optimize build performance
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Optimize for development
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig
```

### **6. Database Connection Pooling**

#### **Update `lib/db.ts`**
```typescript
import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Optimize for WSL2
    __internal: {
      engine: {
        connectTimeout: 60000,
        queryTimeout: 60000,
      },
    },
  });
};

// ... rest of the code
```

### **7. Alternative: Use Docker for Database**

#### **Create `docker-compose.yml`**
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6
    container_name: zend-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db
    command: mongod --bind_ip_all

volumes:
  mongodb_data:
```

#### **Start Database**
```bash
docker-compose up -d
```

### **8. VS Code WSL2 Optimization**

#### **Install WSL Extension**
```bash
# In VS Code, install:
# - WSL extension
# - Remote - WSL extension
```

#### **Open Project in WSL2**
```bash
# From WSL2 terminal
code .
# This opens VS Code in WSL2 mode
```

### **9. Performance Monitoring**

#### **Check WSL2 Performance**
```bash
# Monitor system resources
htop

# Check disk I/O
iostat -x 1

# Monitor network
netstat -tulpn
```

#### **Database Performance**
```bash
# Monitor MongoDB
mongosh --eval "db.serverStatus()"

# Check slow queries
mongosh --eval "db.setProfilingLevel(2, { slowms: 100 })"
```

## 🎯 Recommended Setup for Best Performance

### **Option 1: Full WSL2 Setup (Recommended)**
1. Move project to WSL2 file system (`~/projects/`)
2. Use MongoDB Atlas (cloud database)
3. Install Node.js in WSL2
4. Use VS Code with WSL2 extension

### **Option 2: Hybrid Setup**
1. Keep project in WSL2 file system
2. Use local MongoDB in WSL2
3. Use Docker for database
4. Optimize WSL2 memory settings

### **Option 3: Windows Native (If WSL2 is too slow)**
1. Move back to Windows file system
2. Use Windows MongoDB
3. Use Windows Node.js
4. Accept slower development experience

## 🔧 Quick Fixes to Try Now

### **1. Immediate Performance Boost**
```bash
# Add to .env.local
NODE_OPTIONS="--max-old-space-size=4096"
UV_THREADPOOL_SIZE=16

# Restart development server
npm run dev
```

### **2. Database Connection Timeout**
```bash
# Add to .env.local
DATABASE_URL="mongodb://localhost:27017/zend-productivity?connectTimeoutMS=60000&socketTimeoutMS=60000"
```

### **3. Reduce API Calls**
```bash
# Update notification refetch interval
# In components/navbar/Navbar.tsx
refetchInterval: 60000, // Change from 30s to 60s
```

## 📊 Expected Performance Improvements

| Optimization | Before | After |
|--------------|--------|-------|
| **File I/O** | 20-80s | 2-5s |
| **Database** | 10-30s | 1-3s |
| **Build Time** | 2-5min | 30-60s |
| **Hot Reload** | 5-10s | 1-2s |

Try the immediate fixes first, then consider moving to WSL2 file system for the best performance!
