import { env } from '../config/env.js';
import { SqlRepository } from './sqlRepository.js';
import { DemoRepository } from './demoRepository.js';

class RepositoryFactory {
  constructor() {
    this.instances = {};
  }

  getDashboardRepository() {
    if (!this.instances.dashboardRepository) {
      if (env.demoMode) {
        console.log('🔌 [RepositoryFactory] Resolvendo: DemoRepository (Dados Sintéticos)');
        this.instances.dashboardRepository = new DemoRepository();
      } else {
        console.log('🔌 [RepositoryFactory] Resolvendo: SqlRepository (MySQL Produção)');
        this.instances.dashboardRepository = new SqlRepository();
      }
    }
    return this.instances.dashboardRepository;
  }
}

export const repositoryFactory = new RepositoryFactory();
export { BaseRepository } from './baseRepository.js';
export { SqlRepository } from './sqlRepository.js';
export { DemoRepository } from './demoRepository.js';
