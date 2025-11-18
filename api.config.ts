// api.config.ts

// Mude esta variável para 'api' para usar o backend real.
// Mude para 'mock' para usar os dados fictícios para desenvolvimento da interface.
export const API_MODE: 'api' | 'mock' = 'api';

// URL base para o backend. Só é usada quando API_MODE é 'api'.
// Altere para o IP do seu servidor Docker em produção.
export const API_URL = 'http://10.10.10.10:3030';
