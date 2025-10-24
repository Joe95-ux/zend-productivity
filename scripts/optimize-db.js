#!/usr/bin/env node

/**
 * Database optimization script
 * This script helps identify and fix common database performance issues
 */

const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function optimizeDatabase() {
  console.log('🔍 Starting database optimization...\n');

  try {
    // Check for orphaned records
    console.log('1. Checking for orphaned records...');
    
    const orphanedWatches = await db.watch.findMany({
      where: {
        OR: [
          { boardId: { not: null }, board: null },
          { listId: { not: null }, list: null },
          { cardId: { not: null }, card: null },
        ]
      },
      select: { id: true, boardId: true, listId: true, cardId: true }
    });

    if (orphanedWatches.length > 0) {
      console.log(`   Found ${orphanedWatches.length} orphaned watch records`);
      console.log('   Cleaning up orphaned watches...');
      await db.watch.deleteMany({
        where: {
          OR: [
            { boardId: { not: null }, board: null },
            { listId: { not: null }, list: null },
            { cardId: { not: null }, card: null },
          ]
        }
      });
      console.log('   ✅ Cleaned up orphaned watches');
    } else {
      console.log('   ✅ No orphaned records found');
    }

    // Check for orphaned notifications
    console.log('\n2. Checking for orphaned notifications...');
    
    const orphanedNotifications = await db.notification.findMany({
      where: {
        OR: [
          { boardId: { not: null }, board: null },
          { cardId: { not: null }, card: null },
        ]
      },
      select: { id: true, boardId: true, cardId: true }
    });

    if (orphanedNotifications.length > 0) {
      console.log(`   Found ${orphanedNotifications.length} orphaned notification records`);
      console.log('   Cleaning up orphaned notifications...');
      await db.notification.deleteMany({
        where: {
          OR: [
            { boardId: { not: null }, board: null },
            { cardId: { not: null }, card: null },
          ]
        }
      });
      console.log('   ✅ Cleaned up orphaned notifications');
    } else {
      console.log('   ✅ No orphaned notifications found');
    }

    // Check database indexes
    console.log('\n3. Checking database performance...');
    
    const slowQueries = await db.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE schemaname = 'public' 
      AND tablename IN ('Watch', 'Notification', 'User', 'Board', 'List', 'Card')
      ORDER BY n_distinct DESC;
    `;

    console.log('   Database statistics:');
    console.log(slowQueries);

    console.log('\n✅ Database optimization complete!');
    
  } catch (error) {
    console.error('❌ Error during optimization:', error);
  } finally {
    await db.$disconnect();
  }
}

// Run the optimization
optimizeDatabase();
