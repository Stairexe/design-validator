import { MemoryObjectStorage } from '@design-validator/storage';

import { DocumentAuditRepository } from '../src';
import { repositoryContract } from './repository-contract';

repositoryContract(
  'DocumentAuditRepository',
  () => new DocumentAuditRepository(new MemoryObjectStorage()),
);
