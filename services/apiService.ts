
import { Veiculo, Carga, ParametroValor, ParametroTaxa, MotivoSubstituicao, Lancamento, NewLancamento } from '../types.ts';
import * as mockApi from '../api/mockData.ts';
import Papa from 'papaparse';

// --- CONFIGURAÇÃO GLOBAL VIA WINDOW (INJETADA PELO HTML) ---

declare global {
    interface Window {
        APP_CONFIG: {
            mode: 'api' | 'mock';
            apiUrl: string;
        }
    }
}

// Função auxiliar para pegar a configuração atual em TEMPO DE EXECUÇÃO
const getConfig = () => {
    if (typeof window !== 'undefined' && window.APP_CONFIG) {
        return window.APP_CONFIG;
    }
    
    // MUDANÇA CRÍTICA: O padrão agora é PRODUÇÃO (API)
    // Se a config não existir (erro de injeção ou cache), tentamos bater na API via proxy.
    // Isso previne que o Docker caia silenciosamente em modo Mock.
    console.warn("[API] Configuração global não detectada. Assumindo ambiente de PRODUÇÃO (Proxy Nginx).");
    return { mode: 'api', apiUrl: '/api' };
};

// Helper para logs (opcional, pode ser removido em prod final)
const logMode = () => {
    const { mode, apiUrl } = getConfig();
    // console.log(`[API] Executando em modo: ${mode.toUpperCase()} (${apiUrl})`);
};

// --- UTILITÁRIOS ---

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Erro HTTP ${response.status}`);
    }
    if (response.status === 204) return;
    return response.json();
};

const apiRequest = async (endpoint: string, method: 'POST' | 'PUT' | 'DELETE', body?: any) => {
    const { apiUrl } = getConfig();
    // Remove barra final da apiUrl e barra inicial do endpoint para evitar //
    const cleanUrl = apiUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    const url = `${cleanUrl}/${cleanEndpoint}`;
    
    const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    };
    const response = await fetch(url, options);
    return handleResponse(response);
};

const apiGet = async (endpoint: string) => {
    const { apiUrl } = getConfig();
    // Remove barra final da apiUrl e barra inicial do endpoint para evitar //
    const cleanUrl = apiUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    const url = `${cleanUrl}/${cleanEndpoint}`;

    const response = await fetch(url);
    return handleResponse(response);
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
// EXPORTAÇÕES DINÂMICAS
// =============================================================================

// Esta função decide qual serviço usar NO MOMENTO DA CHAMADA
const getService = () => {
    const config = getConfig();
    // Log simples na primeira chamada para debug
    if (!(window as any).hasLoggedApiMode) {
        console.log(`[API Service] Inicializado em modo: ${config.mode?.toUpperCase()}, URL: ${config.apiUrl}`);
        (window as any).hasLoggedApiMode = true;
    }
    // Só usa o MockService se EXPLICITAMENTE configurado como 'mock'
    return config.mode === 'mock' ? MockService : RealService;
};

export const getVeiculos = () => getService().getVeiculos();
export const getCargas = (params?: { veiculoCod?: string, data?: string }) => getService().getCargas(params);
export const getCargasManuais = () => getService().getCargasManuais();
export const getParametrosValores = () => getService().getParametrosValores();
export const getParametrosTaxas = () => getService().getParametrosTaxas();
export const getMotivosSubstituicao = () => getService().getMotivosSubstituicao();
export const getLancamentos = () => getService().getLancamentos();

export const createLancamento = (data: NewLancamento) => getService().createLancamento(data);
export const deleteLancamento = (id: number, motivo: string) => getService().deleteLancamento(id, motivo);

export const createVeiculo = (data: Omit<Veiculo, 'ID_Veiculo'>) => getService().createVeiculo(data);
export const updateVeiculo = (id: number, data: Veiculo) => getService().updateVeiculo(id, data);

export const createCarga = (data: Omit<Carga, 'ID_Carga'>) => getService().createCarga(data);
export const updateCarga = (id: number, data: Carga) => getService().updateCarga(id, data);
export const deleteCarga = (id: number, motivo: string) => getService().deleteCarga(id, motivo);

export const createParametroValor = (data: Omit<ParametroValor, 'ID_Parametro'>) => getService().createParametroValor(data);
export const updateParametroValor = (id: number, data: ParametroValor) => getService().updateParametroValor(id, data);
export const deleteParametroValor = (id: number) => getService().deleteParametroValor(id);

export const createParametroTaxa = (data: Omit<ParametroTaxa, 'ID_Taxa'>) => getService().createParametroTaxa(data);
export const updateParametroTaxa = (id: number, data: ParametroTaxa) => getService().updateParametroTaxa(id, data);
export const deleteParametroTaxa = (id: number) => getService().deleteParametroTaxa(id);

export const importCargasFromERP = (sIni: string, sFim: string) => getService().importCargasFromERP(sIni, sFim);
export const importData = (file: File, type: any) => getService().importData(file, type);
