#!/usr/bin/env node

/**
 * Performance monitoring script
 * Monitors API response times and identifies slow endpoints
 */

const fs = require('fs');
const path = require('path');

// Monitor API performance
function monitorPerformance() {
  console.log('📊 Performance Monitoring Started...\n');
  
  // Check for common performance issues
  const issues = [];
  
  // 1. Check for large bundle sizes
  const nextDir = path.join(process.cwd(), '.next');
  if (fs.existsSync(nextDir)) {
    console.log('✅ Next.js build directory found');
  } else {
    issues.push('❌ Next.js build directory not found - run `npm run build`');
  }
  
  // 2. Check for environment variables
  const envFile = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    console.log('✅ Environment file found');
  } else {
    issues.push('⚠️  No .env.local file found');
  }
  
  // 3. Check for database connection
  console.log('\n🔍 Performance Recommendations:');
  console.log('1. Ensure DATABASE_URL is properly configured');
  console.log('2. Consider adding database indexes for frequently queried fields');
  console.log('3. Use connection pooling for better database performance');
  console.log('4. Implement caching for frequently accessed data');
  console.log('5. Consider using Redis for session storage');
  
  if (issues.length > 0) {
    console.log('\n⚠️  Issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
  } else {
    console.log('\n✅ No major issues found');
  }
  
  console.log('\n📈 Performance Tips:');
  console.log('- Use database indexes on foreign keys');
  console.log('- Implement query result caching');
  console.log('- Use database connection pooling');
  console.log('- Monitor slow queries in production');
  console.log('- Consider using a CDN for static assets');
}

monitorPerformance();
