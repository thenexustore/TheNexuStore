import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RmaStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class RmaService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly allowedStatuses = new Set<RmaStatus>([
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'RECEIVED',
    'REFUNDED',
    'CLOSED',
  ]);

  async list(status?: string) {
    const normalizedStatus = status?.trim();

    if (
      normalizedStatus &&
      normalizedStatus !== 'all' &&
      !this.allowedStatuses.has(normalizedStatus as RmaStatus)
    ) {
      throw new BadRequestException('Invalid RMA status');
    }

    const where =
      normalizedStatus && normalizedStatus !== 'all'
        ? { status: normalizedStatus as RmaStatus }
        : undefined;

    const rmas = await this.prisma.rma.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            order_number: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
        items: {
          include: {
            order_item: {
              include: {
                sku: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return rmas;
  }

  async getById(id: string) {
    const rma = await this.prisma.rma.findUnique({
      where: { id },
      include: {
        order: true,
        customer: true,
        refunds: true,
        items: {
          include: {
            order_item: {
              include: {
                sku: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!rma) {
      throw new NotFoundException('RMA not found');
    }

    return rma;
  }

  async updateStatus(id: string, status: RmaStatus) {
    const exists = await this.prisma.rma.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('RMA not found');
    }

    return this.prisma.rma.update({
      where: { id },
      data: { status },
    });
  }
}
