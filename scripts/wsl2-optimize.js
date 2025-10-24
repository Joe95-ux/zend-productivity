#!/usr/bin/env node

/**
 * WSL2 Performance Optimization Script
 * Applies WSL2-specific optimizations to improve development performance
 */

const fs = require('fs');
const path = require('path');

function optimizeForWSL2() {
  console.log('🚀 Applying WSL2 Performance Optimizations...\n');

  // 1. Check if running in WSL2
  const isWSL2 = process.env.WSL_DISTRO_NAME || process.env.WSLENV;
  if (!isWSL2) {
    console.log('⚠️  Not running in WSL2. Some optimizations may not apply.');
  } else {
    console.log('✅ Running in WSL2 environment');
  }

  // 2. Create optimized .env.local
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Add WSL2 optimizations if not already present
  const optimizations = [
    '# WSL2 Performance Optimizations',
    'NODE_OPTIONS="--max-old-space-size=4096"',
    'UV_THREADPOOL_SIZE=16',
    'NEXT_TELEMETRY_DISABLED=1',
    'WATCHPACK_POLLING=false',
    ''
  ];

  let needsUpdate = false;
  optimizations.forEach(opt => {
    if (opt.startsWith('#') || opt === '') {
      if (!envContent.includes(opt)) {
        needsUpdate = true;
      }
    } else {
      const key = opt.split('=')[0];
      if (!envContent.includes(key)) {
        needsUpdate = true;
      }
    }
  });

  if (needsUpdate) {
    console.log('📝 Adding WSL2 optimizations to .env.local...');
    const newContent = envContent + '\n' + optimizations.join('\n');
    fs.writeFileSync(envPath, newContent);
    console.log('✅ .env.local updated with WSL2 optimizations');
  } else {
    console.log('✅ .env.local already has WSL2 optimizations');
  }

  // 3. Check database URL optimization
  console.log('\n🔍 Checking database configuration...');
  
  if (envContent.includes('DATABASE_URL')) {
    const dbUrl = envContent.match(/DATABASE_URL="([^"]+)"/)?.[1];
    if (dbUrl) {
      if (dbUrl.includes('connectTimeoutMS') && dbUrl.includes('socketTimeoutMS')) {
        console.log('✅ Database URL already optimized for WSL2');
      } else {
        console.log('⚠️  Consider adding connection timeouts to DATABASE_URL:');
        console.log('   ?connectTimeoutMS=60000&socketTimeoutMS=60000&maxPoolSize=10');
      }
    }
  } else {
    console.log('⚠️  DATABASE_URL not found in .env.local');
  }

  // 4. Check Next.js configuration
  console.log('\n🔍 Checking Next.js configuration...');
  
  const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
  if (fs.existsSync(nextConfigPath)) {
    const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
    if (nextConfig.includes('swcMinify') && nextConfig.includes('turbo')) {
      console.log('✅ Next.js config already optimized');
    } else {
      console.log('⚠️  Consider adding WSL2 optimizations to next.config.ts');
    }
  }

  // 5. Performance recommendations
  console.log('\n📊 WSL2 Performance Recommendations:');
  console.log('1. Move project to WSL2 file system (~/projects/)');
  console.log('2. Use MongoDB Atlas instead of local MongoDB');
  console.log('3. Increase WSL2 memory in .wslconfig');
  console.log('4. Use VS Code with WSL2 extension');
  console.log('5. Consider using Docker for database');

  // 6. Check current performance
  console.log('\n🔍 Current Environment:');
  console.log(`Node.js: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB used`);

  console.log('\n✅ WSL2 optimization complete!');
  console.log('\n🚀 Next steps:');
  console.log('1. Restart your development server');
  console.log('2. Monitor performance improvements');
  console.log('3. Consider moving to WSL2 file system for better performance');
}

// Run optimization
optimizeForWSL2();
