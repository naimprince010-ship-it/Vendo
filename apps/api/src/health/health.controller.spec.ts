import { HealthController } from './health.controller';

describe('HealthController', () => {
  const database = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
  const controller = new HealthController(database as never);

  it('reports API health', () => {
    expect(controller.getHealth()).toEqual({ status: 'ok', service: 'vendo-api' });
  });

  it('reports dependency readiness separately from liveness', async () => {
    await expect(controller.getReadiness()).resolves.toEqual({
      status: 'ready',
      service: 'vendo-api',
      database: 'ready',
    });

    database.$queryRaw.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(controller.getReadiness()).rejects.toThrow('Service is not ready');
  });
});
