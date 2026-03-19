import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RmaService } from './rma.service';

describe('RmaService', () => {
  const prisma = {
    rma: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  let service: RmaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RmaService(prisma);
  });

  it('throws on invalid status filter', async () => {
    await expect(service.list('INVALID')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.rma.findMany).not.toHaveBeenCalled();
  });

  it('throws when updating unknown rma', async () => {
    (prisma.rma.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.updateStatus('missing-id', 'APPROVED'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.rma.update).not.toHaveBeenCalled();
  });
});
