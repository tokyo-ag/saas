import { Injectable, NotFoundException } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class UpdateTenantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() lineChannelId?: string;
  @IsOptional() @IsString() lineChannelSecret?: string;
  @IsOptional() @IsString() lineChannelAccessToken?: string;
  @IsOptional() @IsString() liffId?: string;
}

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async findOne(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(tenantId: string, dto: UpdateTenantDto) {
    await this.findOne(tenantId);
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.lineChannelId !== undefined && { lineChannelId: dto.lineChannelId }),
        ...(dto.lineChannelSecret !== undefined && { lineChannelSecret: dto.lineChannelSecret }),
        ...(dto.lineChannelAccessToken !== undefined && { lineChannelAccessToken: dto.lineChannelAccessToken }),
        ...(dto.liffId !== undefined && { liffId: dto.liffId }),
      },
    });
  }

  async getMemberCount(tenantId: string) {
    return this.prisma.member.count({ where: { tenantId } });
  }
}
