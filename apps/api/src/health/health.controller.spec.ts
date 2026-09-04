import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports API health', () => {
    expect(new HealthController().getHealth()).toEqual({ status: 'ok', service: 'vendo-api' });
  });
});
