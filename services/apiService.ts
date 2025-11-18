import { Veiculo, Carga, ParametroValor, ParametroTaxa, MotivoSubstituicao, Lancamento, NewLancamento } from '../types.ts';
import * as mockApi from '../api/mockData.ts';
import Papa from 'papaparse';

// =============================================================================
// CONFIGURAÇÃO DE MODO (DEFINITIVA)
// =============================================================================

// A variável process.env.IS_MOCK é substituída por uma string ('true' ou 'false')
// durante o build pelo esbuild (veja package.json).
// Se por algum motivo não for substituída (ex: IDE), assume false (Produção) por segurança.
const IS_MOCK_ENV = process.env.IS_MOCK;
const USE_MOCK = IS_MOCK_ENV === 'true';

const API_BASE_URL = '/api';

console.log(`[API SERVICE] Inicializado.`);
console.log(`[API SERVICE] Configuração de Build (IS_MOCK): ${IS_MOCK_ENV}`);
console.log(`[API SERVICE] Modo Ativo Final: ${USE_MOCK ? 'MOCK (Dados Falsos)' : 'API REAL (Backend)'}`);

// =============================================================================
// UTILITÁRIOS API REAL
// =============================================================================

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        let errorMessage = response.statusText;
        try {
            const errorData = await response.json();
            if (errorData && errorData.message) errorMessage = errorData.message;
        } catch (e) {}
        
        throw new Error(`Erro na API (${response.status}): ${errorMessage}`);
    }
    if (response.status === 204) return;
    return response.json();
};

const apiRequest = async (endpoint: string, method: 'POST' | 'PUT' | 'DELETE', body?: any) => {
    const cleanUrl = API_BASE_URL.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    const url = `${cleanUrl}/${cleanEndpoint}`;
    
    const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    };
    
    try {
        const response = await fetch(url, options);
        return handleResponse(response);
    } catch (error: any) {
        console.error(`[API ERROR] Falha ao conectar em ${url}:`, error);
        throw error; 
    }
};

const apiGet = async (endpoint: string) => {
    const cleanUrl = API_BASE_URL.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    const url = `${cleanUrl}/${cleanEndpoint}`;

    try {
        const response = await fetch(url);
        return handleResponse(response);
    } catch (error: any) {
        console.error(`[API ERROR] Falha ao buscar dados de ${url}:`, error);
        throw error;
    }
};

// =============================================================================
// IMPLEMENTAÇÃO DA API REAL
// =============================================================================

const RealService = {
    getVeiculos: (): Promise<Veiculo[]> => apiGet('/veiculos'),
    
    getCargas: async (params?: { veiculoCod?: string, data?: string }): Promise<Carga[]> => {
        let cargas: Carga[] = await apiGet('/cargas-manuais');
        if (params) {
            if (params.data) cargas = cargas.filter(c => c.DataCTE === params.data);
            if (params.veiculoCod) cargas = cargas.filter(c => c.COD_VEICULO === params.veiculoCod);
        }
        return cargas.filter(c => !c.Excluido);
    },
    
    getCargasManuais: (): Promise<Carga[]> => apiGet('/cargas-manuais'),
    getParametrosValores: (): Promise<ParametroValor[]> => apiGet('/parametros-valores'),
    getParametrosTaxas: (): Promise<ParametroTaxa[]> => apiGet('/parametros-taxas'),
    getMotivosSubstituicao: (): Promise<MotivoSubstituicao[]> => apiGet('/motivos-substituicao'),
    getLancamentos: (): Promise<Lancamento[]> => apiGet('/lancamentos'),

    createLancamento: (l: NewLancamento): Promise<Lancamento> => apiRequest('/lancamentos', 'POST', l),
    deleteLancamento: (id: number, motivo: string): Promise<void> => apiRequest(`/lancamentos/${id}`, 'PUT', { motivo }),
    
    createVeiculo: (v: Omit<Veiculo, 'ID_Veiculo'>): Promise<Veiculo> => apiRequest('/veiculos', 'POST', v),
    updateVeiculo: (id: number, v: Veiculo): Promise<Veiculo> => apiRequest(`/veiculos/${id}`, 'PUT', v),
    
    createCarga: (c: Omit<Carga, 'ID_Carga'>): Promise<Carga> => apiRequest('/cargas-manuais', 'POST', c),
    updateCarga: (id: number, c: Carga): Promise<Carga> => apiRequest(`/cargas-manuais/${id}`, 'PUT', c),
    deleteCarga: (id: number, motivo: string): Promise<void> => apiRequest(`/cargas-manuais/${id}`, 'PUT', { Excluido: true, MotivoExclusao: motivo }),
    
    createParametroValor: (p: Omit<ParametroValor, 'ID_Parametro'>): Promise<ParametroValor> => apiRequest('/parametros-valores', 'POST', p),
    updateParametroValor: (id: number, p: ParametroValor): Promise<ParametroValor> => apiRequest(`/parametros-valores/${id}`, 'PUT', p),
    deleteParametroValor: (id: number): Promise<void> => apiRequest(`/parametros-valores/${id}`, 'DELETE'),
    
    createParametroTaxa: (p: Omit<ParametroTaxa, 'ID_Taxa'>): Promise<ParametroTaxa> => apiRequest('/parametros-taxas', 'POST', p),
    updateParametroTaxa: (id: number, p: ParametroTaxa): Promise<ParametroTaxa> => apiRequest(`/parametros-taxas/${id}`, 'PUT', p),
    deleteParametroTaxa: (id: number): Promise<void> => apiRequest(`/parametros-taxas/${id}`, 'DELETE'),
    
    importCargasFromERP: async (sIni: string, sFim: string): Promise<{ message: string; count: number }> => {
        return apiRequest('/cargas-erp/import', 'POST', { sIni, sFim });
    },
    
    importData: async (file: File, type: string): Promise<any> => {
        throw new Error("A importação de CSV ainda não está implementada no backend real.");
    }
};

// =============================================================================
// IMPLEMENTAÇÃO DA API MOCK
// =============================================================================

const MockService = {
    getVeiculos: mockApi.getMockVeiculos,
    getCargas: mockApi.getMockCargas,
    getCargasManuais: mockApi.getMockCargasManuais,
    getParametrosValores: mockApi.getMockParametrosValores,
    getParametrosTaxas: mockApi.getMockParametrosTaxas,
    getMotivosSubstituicao: mockApi.getMockMotivosSubstituicao,
    getLancamentos: mockApi.getMockLancamentos,
    
    createLancamento: mockApi.createMockLancamento,
    deleteLancamento: mockApi.deleteMockLancamento,
    
    createVeiculo: mockApi.createMockVeiculo,
    updateVeiculo: mockApi.updateMockVeiculo,
    
    createCarga: mockApi.createMockCarga,
    updateCarga: mockApi.updateMockCarga,
    deleteCarga: mockApi.deleteMockCarga,
    
    createParametroValor: mockApi.createMockParametroValor,
    updateParametroValor: mockApi.updateMockParametroValor,
    deleteParametroValor: mockApi.deleteMockParametroValor,
    
    createParametroTaxa: mockApi.createMockParametroTaxa,
    updateParametroTaxa: mockApi.updateMockParametroTaxa,
    deleteParametroTaxa: mockApi.deleteMockParametroTaxa,
    
    importCargasFromERP: mockApi.importMockCargasFromERP,
    
    importData: async (file: File, type: string): Promise<{ message: string; count: number }> => {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results: { data: any[] }) => {
                    console.log(`MOCK IMPORT ${type}:`, results.data);
                    resolve({ message: `(MOCK) Arquivo CSV processado.`, count: results.data.length });
                },
                error: (error: any) => reject(new Error('Erro ao ler o arquivo CSV: ' + error.message))
            });
        });
    }
};

// =============================================================================
// EXPORTAÇÕES
// =============================================================================

export const getVeiculos = USE_MOCK ? MockService.getVeiculos : RealService.getVeiculos;
export const getCargas = USE_MOCK ? MockService.getCargas : RealService.getCargas;
export const getCargasManuais = USE_MOCK ? MockService.getCargasManuais : RealService.getCargasManuais;
export const getParametrosValores = USE_MOCK ? MockService.getParametrosValores : RealService.getParametrosValores;
export const getParametrosTaxas = USE_MOCK ? MockService.getParametrosTaxas : RealService.getParametrosTaxas;
export const getMotivosSubstituicao = USE_MOCK ? MockService.getMotivosSubstituicao : RealService.getMotivosSubstituicao;
export const getLancamentos = USE_MOCK ? MockService.getLancamentos : RealService.getLancamentos;

export const createLancamento = USE_MOCK ? MockService.createLancamento : RealService.createLancamento;
export const deleteLancamento = USE_MOCK ? MockService.deleteLancamento : RealService.deleteLancamento;

export const createVeiculo = USE_MOCK ? MockService.createVeiculo : RealService.createVeiculo;
export const updateVeiculo = USE_MOCK ? MockService.updateVeiculo : RealService.updateVeiculo;

export const createCarga = USE_MOCK ? MockService.createCarga : RealService.createCarga;
export const updateCarga = USE_MOCK ? MockService.updateCarga : RealService.updateCarga;
export const deleteCarga = USE_MOCK ? MockService.deleteCarga : RealService.deleteCarga;

export const createParametroValor = USE_MOCK ? MockService.createParametroValor : RealService.createParametroValor;
export const updateParametroValor = USE_MOCK ? MockService.updateParametroValor : RealService.updateParametroValor;
export const deleteParametroValor = USE_MOCK ? MockService.deleteParametroValor : RealService.deleteParametroValor;

export const createParametroTaxa = USE_MOCK ? MockService.createParametroTaxa : RealService.createParametroTaxa;
export const updateParametroTaxa = USE_MOCK ? MockService.updateParametroTaxa : RealService.updateParametroTaxa;
export const deleteParametroTaxa = USE_MOCK ? MockService.deleteParametroTaxa : RealService.deleteParametroTaxa;

export const importCargasFromERP = USE_MOCK ? MockService.importCargasFromERP : RealService.importCargasFromERP;
export const importData = USE_MOCK ? MockService.importData : RealService.importData;
