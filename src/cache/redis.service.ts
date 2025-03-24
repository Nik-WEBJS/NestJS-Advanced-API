import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private readonly client = createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
    socket: {
      connectTimeout: 10000,
    },
    pingInterval: 1000,
  });

  async onModuleInit() {
    try {
      this.logger.log('Attempting to connect to Redis...');
      await this.client.connect();
      this.logger.log('Successfully connected to Redis');
      
      this.logger.log('Setting test key...');
      await this.set('test-key', 'test-value');
      this.logger.log('Test key set successfully');
      
      const value = await this.get('test-key');
      this.logger.log('Test value from Redis:', value);
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      this.logger.log(`Setting key ${key} with value:`, value);
      await this.client.set(key, value, {
        EX: 3600,
      });
      this.logger.log(`Key ${key} set successfully`);
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      this.logger.log(`Getting key ${key}`);
      const value = await this.client.get(key);
      this.logger.log(`Value for key ${key}:`, value);
      return value;
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      this.logger.log(`Deleting key ${key}`);
      await this.client.del(key);
      this.logger.log(`Key ${key} deleted successfully`);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
      throw error;
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      this.logger.log(`Deleting keys matching pattern: ${pattern}`);
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        this.logger.log(`Deleted ${keys.length} keys matching pattern ${pattern}`);
      } else {
        this.logger.log(`No keys found matching pattern ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting keys matching pattern ${pattern}:`, error);
      throw error;
    }
  }
} 