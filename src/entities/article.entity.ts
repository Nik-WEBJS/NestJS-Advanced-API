import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { User } from './user.entity';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  title: string;

  @Column('text')
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  description: string;

  @Column({ type: 'timestamp' })
  publishDate: Date;

  @ManyToOne(() => User, user => user.articles)
  author: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 