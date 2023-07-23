import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  ParseIntPipe,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { HomeService } from './home.service';
import {
  CreateHomeDto,
  HomeResponseDto,
  InquireDto,
  UpdateHomeDto,
} from './dtos/home.dto';
import { PropertyType, UserType } from '@prisma/client';
import { User, UserInfo } from 'src/user/decorators/user.decorator';
import { Roles } from 'src/decorators/roles.decorator';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  getHomes(
    @Query('city') city?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('propertyType') propertyType?: PropertyType,
  ): Promise<HomeResponseDto[]> {
    const price =
      minPrice || maxPrice
        ? {
            ...(minPrice && { gte: parseFloat(minPrice) }),
            ...(maxPrice && { lte: parseFloat(maxPrice) }),
          }
        : undefined;

    const filter = {
      ...(city && { city }),
      ...(price && { price }),
      ...(propertyType && { property_type: propertyType }),
    };
    return this.homeService.getHomes(filter);
  }

  @Get(':id')
  getHome(@Param('id', ParseIntPipe) id: number): Promise<HomeResponseDto> {
    return this.homeService.getHomeById(id);
  }

  @Roles(UserType.REALTOR)
  @Post('')
  createHome(@Body() body: CreateHomeDto, @User() user: UserInfo) {
    return this.homeService.createHome(body, user.id);
  }

  @Roles(UserType.ADMIN, UserType.REALTOR)
  @Put(':id')
  async updateHome(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateHomeDto,
    @User() user: UserInfo,
  ) {
    const realtor = await this.homeService.getRealtorByHomeID(id);
    if (realtor.id !== user.id) {
      throw new UnauthorizedException();
    }

    return await this.homeService.updateHome(id, body);
  }

  @Roles(UserType.ADMIN, UserType.REALTOR)
  @Delete(':id')
  async deleteHome(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserInfo,
  ) {
    const realtor = await this.homeService.getRealtorByHomeID(id);
    if (realtor.id !== user.id) {
      throw new UnauthorizedException();
    }
    return await this.homeService.deleteHome(id);
  }

  @Roles(UserType.BUYER)
  @Post(':homeId/inquire')
  async inquire(
    @Param('homeId', ParseIntPipe) homeId: number,
    @Body() { message }: InquireDto,
    @User() user: UserInfo,
  ) {
    return this.homeService.inquire(homeId, message, user);
  }

  @Roles(UserType.REALTOR)
  @Get(':id/messages')
  async getHomeMessages(
    @Param('id', ParseIntPipe) homeId: number,
    @User() user: UserInfo,
  ) {
    const realtor = await this.homeService.getRealtorByHomeID(homeId);
    if (realtor.id !== user.id) {
      throw new UnauthorizedException();
    }
    return this.homeService.getHomeMessages(homeId);
  }
}

// Admin  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiZmFyaGFuIiwiaWQiOjEwLCJpYXQiOjE2OTAxMTUwMjcsImV4cCI6MjA1MDExNTAyN30.z_lUz87mIczsphMjV71bTJAhX0GcII4nUUENdatiJ4k

//realtor eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoic2FkaW0iLCJpZCI6OSwiaWF0IjoxNjkwMTExMjYyLCJleHAiOjIwNTAxMTEyNjJ9.5w_CsR-wOs1BRjyR2MkSTNfH9O5be561OqiOHB4CuEE

//buyer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiYXJtYW4iLCJpZCI6MTEsImlhdCI6MTY5MDExNTM4OCwiZXhwIjoyMDUwMTE1Mzg4fQ.d2_nT2beuwh6WuRrKr0pcYoybohcMEaNF67py7sUhZo
