import redis from './config/redis.config';

async function testRedis() {
  try {
    await redis.set('test-key', 'Hello Redis!');
    const value = await redis.get('test-key');
    console.log('✅ Redis test passed:', value);

    await redis.setex('test-ttl', 10, 'This will self-destruct');
    console.log('✅ TTL test passed');

    await redis.del('test-key');
    await redis.del('test-ttl');

    console.log('🎉 Redis is ready to use!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Redis test failed:', error);
    process.exit(1);
  }
}

testRedis();