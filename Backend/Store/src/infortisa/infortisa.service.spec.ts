import { ConfigService } from '@nestjs/config';
import { InfortisaService } from './infortisa.service';

describe('InfortisaService catalog contract handling', () => {
  let service: InfortisaService;
  let getMock: jest.Mock;

  beforeEach(() => {
    service = new InfortisaService({
      get: jest.fn(),
    } as unknown as ConfigService);
    getMock = jest.fn();
    (service as any).client = { get: getMock };
  });

  it('accumulates all pages when provider exposes pagination metadata', async () => {
    getMock
      .mockResolvedValueOnce({
        data: {
          items: [{ SKU: 'SKU-1', ProductDescription: 'One' }],
          page: 1,
          pageSize: 1,
          total: 2,
          totalPages: 2,
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [{ SKU: 'SKU-2', ProductDescription: 'Two' }],
          page: 2,
          pageSize: 1,
          total: 2,
          totalPages: 2,
        },
      });

    const result = await service.getAllProductsPaged();

    expect(result.items.map((item) => item.SKU)).toEqual(['SKU-1', 'SKU-2']);
    expect(result.meta.totalPages).toBe(2);
    expect(result.meta.totalReceived).toBe(2);
    expect(getMock).toHaveBeenNthCalledWith(1, '/api/Product/Get');
    expect(getMock).toHaveBeenNthCalledWith(2, '/api/Product/Get', {
      params: { page: 2, pageSize: 1 },
    });
  });

  it('throws an explicit error when provider signals truncation', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        items: [{ SKU: 'SKU-1', ProductDescription: 'One' }],
        total: 10,
        truncated: true,
      },
    });

    await expect(service.getAllProductsPaged()).rejects.toThrow(/truncated/i);
  });

  it('throws when provider does not return a valid items array', async () => {
    getMock.mockResolvedValueOnce({
      data: { items: { SKU: 'not-an-array' } },
    });

    await expect(service.getAllProductsPaged()).rejects.toThrow(
      /no valid items array/i,
    );
  });

  it('throws when non-paginated metadata shows fewer items than total', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        items: [{ SKU: 'SKU-1', ProductDescription: 'One' }],
        total: 2,
        limit: 1,
      },
    });

    await expect(service.getAllProductsPaged()).rejects.toThrow(
      /truncated|count mismatch/i,
    );
  });
});
