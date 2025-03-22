import { IsOptional, IsString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class ArticleFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fromDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  toDate?: Date;

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
} 