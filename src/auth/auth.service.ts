import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async signUp(createUserDto: any): Promise<{ token: string }> {
    const { email, password, firstName, lastName } = createUserDto;

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });

    try {
      await this.userRepository.save(user);
      const token = this.jwtService.sign({ userId: user.id });
      return { token };
    } catch (error) {
      if (error.code === '23505') {
        throw new UnauthorizedException('Email already exists');
      }
      throw error;
    }
  }

  async signIn(credentials: any): Promise<{ token: string }> {
    const { email, password } = credentials;
    const user = await this.userRepository.findOne({ where: { email } });

    if (user && (await bcrypt.compare(password, user.password))) {
      const token = this.jwtService.sign({ userId: user.id });
      return { token };
    }

    throw new UnauthorizedException('Invalid credentials');
  }
} 