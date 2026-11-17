import { createRepository } from '@fitforge/shared/storage';
import { API_URL } from '@fitforge/shared/gateway';
import { createServerRepository } from '@fitforge/shared/server-repository';
import { validSession } from '@fitforge/shared/domain';
export const key = 'fitforge.sessions.v1';
export const event = 'fitforge:sessions-updated';
export const repository = API_URL
  ? createServerRepository({ path: '/api/sessoes', event, validate: validSession })
  : createRepository({ key, event, validate: validSession });
export const listSessions = repository.read;
