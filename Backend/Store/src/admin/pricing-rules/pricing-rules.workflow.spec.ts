import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { PricingService } from '../../pricing/pricing.service';
import { PricingRulesService } from './pricing-rules.service';

describe('PricingRulesService workflow', () => {
  const prisma = {
    pricingRule: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  const pricing = {} as PricingService;

  let service: PricingRulesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PricingRulesService(prisma, pricing);
  });

  it('moves DRAFT to PENDING', async () => {
    (prisma.pricingRule.findUnique as jest.Mock).mockResolvedValue({ id: 'r1', approval_status: 'DRAFT' });
    (prisma.pricingRule.update as jest.Mock).mockResolvedValue({ id: 'r1', approval_status: 'PENDING' });

    const result = await service.transitionStatus('r1', 'PENDING' as any, 'u1');

    expect(result.approval_status).toBe('PENDING');
    expect(prisma.pricingRule.update).toHaveBeenCalled();
  });

  it('applies 4-eyes rule for approval', async () => {
    (prisma.pricingRule.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1',
      approval_status: 'PENDING',
      created_by_actor_id: 'u1',
    });

    await expect(service.transitionStatus('r1', 'APPROVED' as any, 'u1')).rejects.toThrow(BadRequestException);
  });
});
