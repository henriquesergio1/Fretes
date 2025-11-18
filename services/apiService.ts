
import { Veiculo, Carga, ParametroValor, ParametroTaxa, MotivoSubstituicao, Lancamento, NewLancamento } from '../types.ts';
import * as mockApi from '../api/mockData.ts';
import Papa from 'papaparse';

// --- CONFIGURAÇÃO E AUDITORIA ---

// Lógica de Fallback: Se as variáveis de ambiente não forem injetadas corretamente pelo build,
// usamos valores padrão baseados no ambiente provável (localhost vs produção).
const getEnvMode = () => {
    if (process.env.API_MODE !== undefined) return process.env.API_MODE;
    // Se estiver undefined, verifica se é localhost (desenvolvimento) ou não
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port !== '8080') {
        return 'mock';
    }
    return 'api'; // Padrão seguro: Produção
};

const getEnvUrl = () => {
    if (process.env.API_URL !== undefined) return process.env.API_URL;
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        return 'http://localhost:3030';
    }
    return 'http://fretes-api:3000';
};

const API_MODE = getEnvMode();
const API_URL = getEnvUrl();

console.log(`%c[SISTEMA] Configuração Carregada`, 'background: #333; color: #fff; padding: 4px; font-weight: bold;');
console.log(`> Modo: ${API_MODE?.toUpperCase()}`);
console.log(`> URL: ${API_URL}`);

// --- UTILITÁRIOS ---

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Erro HTTP ${response.status}`);
    }
    if (response.status === 204) return;
    return response.json();
};

const apiRequest = async (url: string, method: 'POST' | 'PUT' | 'DELETE', body?: any) => {
    const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    };
    const response = await fetch(url, options);
    return handleResponse(response);
};

// =============================================================================
// IMPLEMENTAÇÃO DA API REAL (Produção / Docker)
// =============================================================================

const RealService = {
    // GET
    getVeiculos: (): Promise<Veiculo[]> => {
        return fetch(`${API_URL}/veiculos`).then(handleResponse);
    },
    getCargas: async (params?: { veiculoCod?: string, data?: string }): Promise<Carga[]> => {
        // Na API real, buscamos as cargas no endpoint /cargas-manuais (que inclui as importadas do ERP)
        let cargas: Carga[] = await fetch(`${API_URL}/cargas-manuais`).then(handleResponse);
        
        // Filtragem no Client-Side (pois a API atual retorna tudo)
        if (params) {
            if (params.data) {
                cargas = cargas.filter(c => c.DataCTE === params.data);
            }
            if (params.veiculoCod) {
                cargas = cargas.filter(c => c.COD_VEICULO === params.veiculoCod);
            }
        }
        return cargas.filter(c => !c.Excluido);
    },
    getCargasManuais: (): Promise<Carga[]> => {
        return fetch(`${API_URL}/cargas-manuais`).then(handleResponse);
    },
    getParametrosValores: (): Promise<ParametroValor[]> => {
        return fetch(`${API_URL}/parametros-valores`).then(handleResponse);
    },
    getParametrosTaxas: (): Promise<ParametroTaxa[]> => {
        return fetch(`${API_URL}/parametros-taxas`).then(handleResponse);
    },
    getMotivosSubstituicao: (): Promise<MotivoSubstituicao[]> => {
        return fetch(`${API_URL}/motivos-substituicao`).then(handleResponse);
    },
    getLancamentos: (): Promise<Lancamento[]> => {
        return fetch(`${API_URL}/lancamentos`).then(handleResponse);
    },

    // POST / PUT / DELETE
    createLancamento: (lancamento: NewLancamento): Promise<Lancamento> => {
        return apiRequest(`${API_URL}/lancamentos`, 'POST', lancamento);
    },
    deleteLancamento: (id: number, motivo: string): Promise<void> => {
        return apiRequest(`${API_URL}/lancamentos/${id}`, 'PUT', { motivo });
    },
    createVeiculo: (veiculo: Omit<Veiculo, 'ID_Veiculo'>): Promise<Veiculo> => {
        return apiRequest(`${API_URL}/veiculos`, 'POST', veiculo);
    },
    updateVeiculo: (id: number, veiculo: Veiculo): Promise<Veiculo> => {
        return apiRequest(`${API_URL}/veiculos/${id}`, 'PUT', veiculo);
    },
    createCarga: (carga: Omit<Carga, 'ID_Carga'>): Promise<Carga> => {
        return apiRequest(`${API_URL}/cargas-manuais`, 'POST', carga);
    },
    updateCarga: (id: number, carga: Carga): Promise<Carga> => {
        return apiRequest(`${API_URL}/cargas-manuais/${id}`, 'PUT', carga);
    },
    deleteCarga: (id: number, motivo: string): Promise<void> => {
        const body = { Excluido: true, MotivoExclusao: motivo };
        return apiRequest(`${API_URL}/cargas-manuais/${id}`, 'PUT', body);
    },
    createParametroValor: (param: Omit<ParametroValor, 'ID_Parametro'>): Promise<ParametroValor> => {
        return apiRequest(`${API_URL}/parametros-valores`, 'POST', param);
    },
    updateParametroValor: (id: number, param: ParametroValor): Promise<ParametroValor> => {
        return apiRequest(`${API_URL}/parametros-valores/${id}`, 'PUT', param);
    },
    deleteParametroValor: (id: number): Promise<void> => {
        return apiRequest(`${API_URL}/parametros-valores/${id}`, 'DELETE');
    },
    createParametroTaxa: (param: Omit<ParametroTaxa, 'ID_Taxa'>): Promise<ParametroTaxa> => {
        return apiRequest(`${API_URL}/parametros-taxas`, 'POST', param);
    },
    updateParametroTaxa: (id: number, param: ParametroTaxa): Promise<ParametroTaxa> => {
        return apiRequest(`${API_URL}/parametros-taxas/${id}`, 'PUT', param);
    },
    deleteParametroTaxa: (id: number): Promise<void> => {
        return apiRequest(`${API_URL}/parametros-taxas/${id}`, 'DELETE');
    },

    // Importação
    importCargasFromERP: async (startDate: string, endDate:string): Promise<{ message: string; count: number }> => {
        const body = { sIni: startDate, sFim: endDate };
        return apiRequest(`${API_URL}/cargas-erp/import`, 'POST', body);
    },
    importData: async (file: File, type: 'veiculos' | 'cargas' | 'parametros-valores' | 'parametros-taxas'): Promise<{ message: string; count: number }> => {
        return new Promise((_, reject) => {
            reject(new Error("A importação de CSV ainda não está implementada no backend real. Use o cadastro manual ou importação via ERP."));
        });
    }
};

// =============================================================================
// IMPLEMENTAÇÃO DA API MOCK (Apenas para Desenvolvimento)
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
    
    importData: async (file: File, type: 'veiculos' | 'cargas' | 'parametros-valores' | 'parametros-taxas'): Promise<{ message: string; count: number }> => {
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
// SELEÇÃO DE IMPLEMENTAÇÃO
// =============================================================================

const isMockMode = API_MODE === 'mock';
const SelectedService = isMockMode ? MockService : RealService;

if (!isMockMode) {
    console.log("⚠️ Usando API REAL. Dados Mock foram desativados.");
} else {
    console.log("⚠️ Usando MOCK DATA. Dados reais não serão acessados.");
}

export const {
    getVeiculos,
    getCargas,
    getCargasManuais,
    getParametrosValores,
    getParametrosTaxas,
    getMotivosSubstituicao,
    getLancamentos,
    createLancamento,
    deleteLancamento,
    createVeiculo,
    updateVeiculo,
    createCarga,
    updateCarga,
    deleteCarga,
    createParametroValor,
    updateParametroValor,
    deleteParametroValor,
    createParametroTaxa,
    updateParametroTaxa,
    deleteParametroTaxa,
    importCargasFromERP,
    importData
} = SelectedService;
