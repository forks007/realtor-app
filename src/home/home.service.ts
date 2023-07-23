import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { HomeResponseDto } from './dtos/home.dto';
import { PropertyType } from '@prisma/client';
import { UserInfo } from 'src/user/decorators/user.decorator';

interface GetHomesParam {
  city?: string;
  price?: {
    gte?: number;
    lte?: number;
  };
  property_type?: PropertyType;
}

interface CreateHomeParams {
  address: string;
  numberOfBedrooms: number;
  numberOfBathrooms: number;
  city: string;
  price: number;
  landSize: number;
  propertyType: PropertyType;
  images: { url: string }[];
}
interface updateHomeParams {
  address?: string;
  numberOfBedrooms?: number;
  numberOfBathrooms?: number;
  city?: string;
  price?: number;
  landSize?: number;
  propertyType?: PropertyType;
}

@Injectable()
export class HomeService {
  constructor(private readonly prismaService: PrismaService) {}

  async getHomes(filter: GetHomesParam): Promise<HomeResponseDto[]> {
    const homes = await this.prismaService.home.findMany({
      select: {
        id: true,
        address: true,
        city: true,
        price: true,
        property_type: true,
        land_size: true,
        number_of_bathrooms: true,
        number_of_bedrooms: true,
        images: {
          select: {
            url: true,
          },
          take: 1,
        },
      },
      where: filter,
    });
    if (!homes.length) {
      throw new NotFoundException();
    }

    return homes.map((home) => {
      const fetchHome = { ...home, image: home.images[0].url };
      delete fetchHome.images;
      return new HomeResponseDto(fetchHome);
    });
  }

  async getHomeById(id: number): Promise<HomeResponseDto> {
    const home = await this.prismaService.home.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        address: true,
        city: true,
        price: true,
        property_type: true,
        land_size: true,
        number_of_bathrooms: true,
        number_of_bedrooms: true,
        images: {
          select: {
            url: true,
          },
        },
        realtor: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!home) {
      throw new NotFoundException();
    }

    return new HomeResponseDto(home);
  }

  async createHome(
    {
      address,
      city,
      images,
      landSize,
      numberOfBathrooms,
      numberOfBedrooms,
      price,
      propertyType,
    }: CreateHomeParams,
    usedId: number,
  ) {
    const newHome = await this.prismaService.home.create({
      data: {
        address,
        city,
        land_size: landSize,
        number_of_bathrooms: numberOfBathrooms,
        number_of_bedrooms: numberOfBedrooms,
        price,
        property_type: propertyType,
        realtor_id: usedId,
      },
    });

    const homeImages = images.map((image) => {
      return { ...image, home_id: newHome.id };
    });

    await this.prismaService.image.createMany({
      data: homeImages,
    });

    return new HomeResponseDto(newHome);
  }

  async updateHome(id: number, data: updateHomeParams) {
    const home = this.prismaService.home.findUnique({
      where: {
        id,
      },
    });
    if (!home) {
      throw new NotFoundException();
    }
    const updatedHome = await this.prismaService.home.update({
      where: {
        id,
      },
      data,
    });

    return updatedHome;
  }

  async deleteHome(id: number) {
    await this.prismaService.image.deleteMany({
      where: {
        home_id: id,
      },
    });
    await this.prismaService.home.delete({
      where: { id },
    });
  }

  async getRealtorByHomeID(id: number) {
    const home = await this.prismaService.home.findUnique({
      where: {
        id,
      },
      select: {
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!home) {
      throw new NotFoundException();
    }

    return home.realtor;
  }

  async inquire(homeId: number, message: string, user: UserInfo) {
    const realtor = await this.getRealtorByHomeID(homeId);

    return await this.prismaService.message.create({
      data: {
        message,
        home_id: homeId,
        realtor_id: realtor.id,
        buyer_id: user.id,
      },
    });
  }

  async getHomeMessages(homeId: number) {
    return this.prismaService.message.findMany({
      where: {
        home_id: homeId,
      },
      select: {
        home_id: true,
        message: true,
        buyer: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });
  }
}
