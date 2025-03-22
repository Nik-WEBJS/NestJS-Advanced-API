import { IsNotEmpty, IsString, MinLength, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateArticleDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  description: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  publishDate?: Date;
} 