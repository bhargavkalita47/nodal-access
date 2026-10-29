import { apiAccessService } from './api';
import { mockAccessService } from './mock';

export const isDemoMode = import.meta.env.VITE_DATA_MODE !== 'api';
export const accessService = isDemoMode ? mockAccessService : apiAccessService;
