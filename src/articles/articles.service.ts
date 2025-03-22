import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '../entities/article.entity';
import { User } from '../entities/user.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { ArticleFilterDto } from './dto/article-filter.dto';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
  ) {}

  async create(createArticleDto: CreateArticleDto, user: User): Promise<Article> {
    const article = this.articleRepository.create({
      ...createArticleDto,
      author: user,
      publishDate: createArticleDto.publishDate || new Date(),
    });

    return this.articleRepository.save(article);
  }

  async findAll(filterDto: ArticleFilterDto): Promise<[Article[], number]> {
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

    return query.getManyAndCount();
  }

  async findOne(id: string): Promise<Article> {
    const article = await this.articleRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!article) {
      throw new NotFoundException(`Article with ID "${id}" not found`);
    }

    return article;
  }

  async update(id: string, updateArticleDto: Partial<CreateArticleDto>, user: User): Promise<Article> {
    const article = await this.findOne(id);
    
    if (article.author.id !== user.id) {
      throw new NotFoundException('You can only update your own articles');
    }

    Object.assign(article, updateArticleDto);
    return this.articleRepository.save(article);
  }

  async remove(id: string, user: User): Promise<void> {
    const article = await this.findOne(id);
    
    if (article.author.id !== user.id) {
      throw new NotFoundException('You can only delete your own articles');
    }

    await this.articleRepository.remove(article);
  }
} 