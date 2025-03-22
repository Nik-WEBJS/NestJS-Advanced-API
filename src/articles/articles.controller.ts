import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { ArticleFilterDto } from './dto/article-filter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../entities/user.entity';

interface RequestWithUser extends Request {
  user: User;
}

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createArticleDto: CreateArticleDto, @Req() req: RequestWithUser) {
    return this.articlesService.create(createArticleDto, req.user);
  }

  @Get()
  findAll(@Query() filterDto: ArticleFilterDto) {
    return this.articlesService.findAll(filterDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.articlesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateArticleDto: Partial<CreateArticleDto>,
    @Req() req: RequestWithUser,
  ) {
    return this.articlesService.update(id, updateArticleDto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.articlesService.remove(id, req.user);
  }
} 