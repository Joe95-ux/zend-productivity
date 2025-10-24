# WSL2 Quick Setup for Better Performance

## 🚀 Immediate Fixes (5 minutes)

### **1. Run WSL2 Optimization Script**
```bash
node scripts/wsl2-optimize.js
```

### **2. Add to .env.local**
```bash
# Add these lines to your .env.local file
NODE_OPTIONS="--max-old-space-size=4096"
UV_THREADPOOL_SIZE=16
NEXT_TELEMETRY_DISABLED=1
WATCHPACK_POLLING=false
```

### **3. Optimize Database URL**
```bash
# Update your DATABASE_URL in .env.local
# Add these parameters to the end:
?connectTimeoutMS=60000&socketTimeoutMS=60000&maxPoolSize=10&minPoolSize=1

# Example:
DATABASE_URL="mongodb://localhost:27017/zend-productivity?connectTimeoutMS=60000&socketTimeoutMS=60000&maxPoolSize=10&minPoolSize=1"
```

### **4. Restart Development Server**
```bash
npm run dev
```

## 🎯 Better Performance (15 minutes)

### **Option A: Move to WSL2 File System**
```bash
# 1. Move project to WSL2
cd ~
mkdir -p ~/projects
cp -r /mnt/c/Users/USER/Desktop/Projects/zend-productivity ~/projects/
cd ~/projects/zend-productivity

# 2. Install dependencies in WSL2
npm install

# 3. Open in VS Code WSL2
code .
```

### **Option B: Use MongoDB Atlas (Cloud)**
```bash
# 1. Create free MongoDB Atlas account
# 2. Create cluster
# 3. Get connection string
# 4. Update .env.local
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/zend-productivity?retryWrites=true&w=majority"
```

## 🔧 Advanced Optimizations (30 minutes)

### **1. WSL2 Memory Configuration**
Create `C:\Users\USER\.wslconfig` in Windows:
```ini
[wsl2]
memory=8GB
processors=4
swap=2GB
localhostForwarding=true
```

Then restart WSL2:
```bash
# In Windows PowerShell (as Administrator)
wsl --shutdown
wsl
```

### **2. Install MongoDB in WSL2**
```bash
# Install MongoDB in WSL2 (not Windows)
sudo apt update
sudo apt install -y mongodb

# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Update DATABASE_URL
DATABASE_URL="mongodb://localhost:27017/zend-productivity"
```

### **3. Use Docker for Database**
Create `docker-compose.yml`:
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

volumes:
  mongodb_data:
```

Start database:
```bash
docker-compose up -d
```

## 📊 Expected Performance Improvements

| Optimization | Before | After |
|--------------|--------|-------|
| **API Response** | 20-80s | 2-5s |
| **Database Queries** | 10-30s | 1-3s |
| **Hot Reload** | 5-10s | 1-2s |
| **Build Time** | 2-5min | 30-60s |

## 🎯 Recommended Path

1. **Start with immediate fixes** (5 min)
2. **Move to WSL2 file system** (15 min)
3. **Use MongoDB Atlas** (15 min)
4. **Apply advanced optimizations** (30 min)

This should give you a 10-20x performance improvement!
