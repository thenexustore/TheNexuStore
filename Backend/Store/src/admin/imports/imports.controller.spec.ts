import { ImportsController } from './imports.controller';
import { PrismaService } from '../../common/prisma.service';
import { InfortisaSyncService } from '../../infortisa/infortisa.sync';
import { AuditLogService } from '../audit-log.service';

describe('ImportsController', () => {
  const prisma = {
    syncLog: {
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
  } as unknown as PrismaService;

  const infortisaSync = {
    fullSync: jest.fn(),
    syncStockRealTime: jest.fn(),
    syncImages: jest.fn(),
    listImportRuns: jest.fn(),
    getImportRunById: jest.fn(),
    getImportRunErrors: jest.fn(),
    getProviderStats: jest.fn(),
  } as unknown as InfortisaSyncService;

  const auditLogService = {
    logAction: jest.fn(),
  } as unknown as AuditLogService;

  let controller: ImportsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ImportsController(prisma, infortisaSync, auditLogService);
  });

  it('returns import history with pagination metadata', async () => {
    (prisma.syncLog.findMany as jest.Mock).mockResolvedValue([{ id: 1 }]);
    (prisma.syncLog.count as jest.Mock).mockResolvedValue(1);

    const result = await controller.history({ page: 2, limit: 10, type: 'manual_full' });

    expect(prisma.syncLog.findMany).toHaveBeenCalledWith({
      where: { type: 'manual_full' },
      orderBy: { last_sync: 'desc' },
      skip: 10,
      take: 10,
    });
    expect(result).toEqual({
      success: true,
      data: {
        items: [{ id: 1 }],
        total: 1,
        page: 2,
        totalPages: 1,
      },
    });
  });

  it('returns structured import runs', async () => {
    (infortisaSync.listImportRuns as jest.Mock).mockResolvedValue([{ id: 'run-1' }]);

    await expect(controller.runs()).resolves.toEqual({
      success: true,
      data: [{ id: 'run-1' }],
    });
  });

  it('returns provider stats', async () => {
    (infortisaSync.getProviderStats as jest.Mock).mockResolvedValue({ provider: 'infortisa' });

    await expect(controller.providerStats()).resolves.toEqual({
      success: true,
      data: { provider: 'infortisa' },
    });
  });

  it('triggers stock sync and logs execution', async () => {
    (infortisaSync.syncStockRealTime as jest.Mock).mockResolvedValue({ id: 'run-2' });

    const req = {
      user: { id: 'staff-1', email: 'admin@test.com', role: 'ADMIN' },
      method: 'POST',
      originalUrl: '/admin/imports/run',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('jest'),
    } as any;

    const result = await controller.run({ mode: 'stock' }, req);

    expect(infortisaSync.syncStockRealTime).toHaveBeenCalledTimes(1);
    expect(prisma.syncLog.upsert).toHaveBeenCalledWith({
      where: { type: 'manual_stock' },
      update: expect.objectContaining({ details: expect.stringContaining('mode=stock') }),
      create: expect.objectContaining({ type: 'manual_stock' }),
    });
    expect(auditLogService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'IMPORT_TRIGGERED',
        resource: 'IMPORT_JOB',
        metadata: expect.objectContaining({ mode: 'stock', run: { id: 'run-2' } }),
      }),
    );
    expect(result.success).toBe(true);
    expect(result.data.mode).toBe('stock');
  });

  it('retries import with reason and emits retry audit action', async () => {
    const req = {
      user: { id: 'staff-1', email: 'admin@test.com', role: 'ADMIN' },
      method: 'POST',
      originalUrl: '/admin/imports/retry',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('jest'),
    } as any;

    const result = await controller.retry(
      { mode: 'images', reason: 'Previous run failed due to provider timeout' },
      req,
    );

    expect(infortisaSync.syncImages).toHaveBeenCalledTimes(1);
    expect(prisma.syncLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: 'manual_images' },
        update: expect.objectContaining({
          details: expect.stringContaining('retry=true'),
        }),
      }),
    );
    expect(auditLogService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'IMPORT_RETRY_TRIGGERED',
        metadata: expect.objectContaining({
          mode: 'images',
          reason: 'Previous run failed due to provider timeout',
        }),
      }),
    );
    expect(result.success).toBe(true);
  });
});
