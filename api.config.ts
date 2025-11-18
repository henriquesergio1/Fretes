// api.config.ts

// Mude esta variável para 'api' para usar o backend real.
// Mude para 'mock' para usar os dados fictícios para desenvolvimento da interface.
export const API_MODE: 'api' | 'mock' = 'api';

// URL base para o backend. Só é usada quando API_MODE é 'api'.
// Em produção com Docker Compose, usamos o nome do serviço ('fretes-api') como hostname.
// Para desenvolvimento local com a API rodando, use 'http://localhost:3030' (ou a porta que você mapeou).
export const API_URL = 'http://fretes-api:3000';