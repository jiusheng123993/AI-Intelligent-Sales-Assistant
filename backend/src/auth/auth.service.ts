import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponse } from './types/auth-response.type';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);
    const user = await this.usersService.createUser({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
    });

    return {
      accessToken: await this.signToken({ sub: user.id, email: user.email, role: user.role }),
      user,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailWithPassword(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const safeUser = this.usersService.toSafeUser(user);

    return {
      accessToken: await this.signToken({
        sub: safeUser.id,
        email: safeUser.email,
        role: safeUser.role,
      }),
      user: safeUser,
    };
  }

  async getCurrentUser(userId: string) {
    return this.usersService.findSafeById(userId);
  }

  private async signToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }
}
