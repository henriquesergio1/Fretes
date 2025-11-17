// api.config.ts

// Mude esta variável para 'api' para usar o backend real.
// Mude para 'mock' para usar os dados fictícios para desenvolvimento da interface.
export const API_MODE: 'api' | 'mock' = 'api';

// URL base para o backend. Com o reverse proxy do Nginx, usamos um caminho relativo.
// O Nginx irá encaminhar qualquer requisição para /api para o serviço de backend.
export const API_URL = '/api';