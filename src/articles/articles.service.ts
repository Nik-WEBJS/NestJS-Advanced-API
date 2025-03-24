import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../entities/article.entity';
import { User } from '../entities/user.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { ArticleFilterDto } from './dto/article-filter.dto';
import { RedisService } from '../cache/redis.service';

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    private redisService: RedisService,
  ) {}

  async findAll(filterDto: ArticleFilterDto): Promise<[Article[], number]> {
    const cacheKey = `articles:${JSON.stringify(filterDto)}`;
    
    try {
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        this.logger.log('Data found in cache');
        return JSON.parse(cachedData);
      }

      this.logger.log('Data not found in cache, fetching from database');

      const { search, fromDate, toDate, authorId, page = 1, limit = 10 } = filterDto;
      const query = this.articleRepository.createQueryBuilder('article')
        .leftJoinAndSelect('article.author', 'author');

      if (search) {
        query.andWhere('(article.title LIKE :search OR article.description LIKE :search)', 
          { search: `%${search}%` });
      }

      if (fromDate && toDate) {
        query.andWhere('article.publishDate BETWEEN :fromDate AND :toDate', 
          { fromDate, toDate });
      }

      if (authorId) {
        query.andWhere('author.id = :authorId', { authorId });
      }

      query
        .skip((page - 1) * limit)
        .take(limit)
        .orderBy('article.publishDate', 'DESC');

      const result = await query.getManyAndCount();
      
      await this.redisService.set(cacheKey, JSON.stringify(result));
      this.logger.log('Data saved to cache');

      return result;
    } catch (error) {
      this.logger.error('Error in findAll:', error);
      throw error;
    }
  }

  async create(createArticleDto: CreateArticleDto, user: User): Promise<Article> {
    const article = this.articleRepository.create({
      ...createArticleDto,
      author: user,
      publishDate: createArticleDto.publishDate || new Date(),
    });

    const savedArticle = await this.articleRepository.save(article);
    
    await this.invalidateCache();
    
    return savedArticle;
  }

  async findOne(id: string): Promise<Article> {
    const cacheKey = `article:${id}`;
    
    try {
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        this.logger.log('Article found in cache');
        return JSON.parse(cachedData);
      }

      this.logger.log('Article not found in cache, fetching from database');

      const article = await this.articleRepository.findOne({
        where: { id },
        relations: ['author'],
      });

      if (!article) {
        throw new NotFoundException(`Article with ID "${id}" not found`);
      }

      await this.redisService.set(cacheKey, JSON.stringify(article));
      this.logger.log('Article saved to cache');

      return article;
    } catch (error) {
      this.logger.error('Error in findOne:', error);
      throw error;
    }
  }

  async update(id: string, updateArticleDto: Partial<CreateArticleDto>, user: User): Promise<Article> {
    const article = await this.findOne(id);
    
    if (article.author.id !== user.id) {
      throw new NotFoundException('You can only update your own articles');
    }

    Object.assign(article, updateArticleDto);
    const updatedArticle = await this.articleRepository.save(article);
    
    await this.invalidateCache();
    
    return updatedArticle;
  }

  async remove(id: string, user: User): Promise<void> {
    const article = await this.findOne(id);
    
    if (article.author.id !== user.id) {
      throw new NotFoundException('You can only delete your own articles');
    }

    await this.articleRepository.remove(article);
    
    await this.invalidateCache();
  }

  private async invalidateCache(): Promise<void> {
    try {
      await this.redisService.deletePattern('articles:*');
      await this.redisService.deletePattern('article:*');
      this.logger.log('Cache invalidated successfully');
    } catch (error) {
      this.logger.error('Error invalidating cache:', error);
    }
  }
} 