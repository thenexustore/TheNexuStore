import { ConfigService } from '@nestjs/config';
import { InfortisaService } from './infortisa.service';

describe('InfortisaService catalog contract handling', () => {
  let service: InfortisaService;
  let getMock: jest.Mock;

  beforeEach(() => {
    service = new InfortisaService(
      {
        get: jest.fn(),
      } as unknown as ConfigService,
      {
        supplierIntegration: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      } as any,
    );
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

  describe('probe mode pagination', () => {
    beforeEach(() => {
      (service as any).catalogPageSizeOverride = 2;
    });

    it('activates probe mode when first page is full and no pagination signals are present', async () => {
      getMock
        .mockResolvedValueOnce({
          data: {
            items: [
              { SKU: 'SKU-1', ProductDescription: 'One' },
              { SKU: 'SKU-2', ProductDescription: 'Two' },
            ],
          },
        })
        .mockResolvedValueOnce({
          data: {
            items: [
              { SKU: 'SKU-3', ProductDescription: 'Three' },
              { SKU: 'SKU-4', ProductDescription: 'Four' },
            ],
          },
        })
        .mockResolvedValueOnce({
          data: {
            items: [{ SKU: 'SKU-5', ProductDescription: 'Five' }],
          },
        });

      const result = await service.getAllProductsPaged();

      expect(result.items.map((item) => item.SKU)).toEqual([
        'SKU-1',
        'SKU-2',
        'SKU-3',
        'SKU-4',
        'SKU-5',
      ]);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.totalReceived).toBe(5);
      expect(result.meta.raw).toMatchObject({ probeMode: true });
      expect(getMock).toHaveBeenCalledTimes(3);
      expect(getMock).toHaveBeenNthCalledWith(1, '/api/Product/Get', {
        params: { page: 1, pageSize: 2 },
      });
      expect(getMock).toHaveBeenNthCalledWith(2, '/api/Product/Get', {
        params: { page: 2, pageSize: 2 },
      });
      expect(getMock).toHaveBeenNthCalledWith(3, '/api/Product/Get', {
        params: { page: 3, pageSize: 2 },
      });
    });

    it('stops probing when an empty page is returned', async () => {
      getMock
        .mockResolvedValueOnce({
          data: {
            items: [
              { SKU: 'SKU-1', ProductDescription: 'One' },
              { SKU: 'SKU-2', ProductDescription: 'Two' },
            ],
          },
        })
        .mockResolvedValueOnce({
          data: { items: [] },
        });

      const result = await service.getAllProductsPaged();

      expect(result.items.map((item) => item.SKU)).toEqual(['SKU-1', 'SKU-2']);
      expect(result.meta.totalPages).toBe(1);
      expect(getMock).toHaveBeenCalledTimes(2);
    });

    it('does not activate probe mode when first page is partial', async () => {
      getMock.mockResolvedValueOnce({
        data: {
          items: [{ SKU: 'SKU-1', ProductDescription: 'One' }],
        },
      });

      const result = await service.getAllProductsPaged();

      expect(result.items.map((item) => item.SKU)).toEqual(['SKU-1']);
      expect(result.meta.totalReceived).toBe(1);
      expect(getMock).toHaveBeenCalledTimes(1);
    });

    it('does not activate probe mode when totalExpected is provided', async () => {
      getMock.mockResolvedValueOnce({
        data: {
          items: [
            { SKU: 'SKU-1', ProductDescription: 'One' },
            { SKU: 'SKU-2', ProductDescription: 'Two' },
          ],
          total: 2,
        },
      });

      const result = await service.getAllProductsPaged();

      expect(result.items).toHaveLength(2);
      expect(getMock).toHaveBeenCalledTimes(1);
    });
  });
});
