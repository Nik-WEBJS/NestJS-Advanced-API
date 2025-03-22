import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/signup')
  signUp(@Body(ValidationPipe) createUserDto: any) {
    return this.authService.signUp(createUserDto);
  }

  @Post('/signin')
  signIn(@Body(ValidationPipe) credentials: any) {
    return this.authService.signIn(credentials);
  }
} 