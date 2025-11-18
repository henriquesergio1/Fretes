import { Veiculo, Carga, ParametroValor, ParametroTaxa, MotivoSubstituicao, Lancamento, NewLancamento } from '../types.ts';
import { API_MODE, API_URL } from '../api.config.ts';
import * as mockApi from '../api/mockData.ts';
import Papa from 'papaparse';

// --- API REAL (usada quando API_MODE = 'api') ---

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

// --- Funções de Leitura (GET) ---

export const getVeiculos = (): Promise<Veiculo[]> => {
    if (API_MODE === 'mock') return mockApi.getMockVeiculos();
    return fetch(`${API_URL}/veiculos`).then(handleResponse);
};

export const getCargas = async (params?: { veiculoCod?: string, data?: string }): Promise<Carga[]> => {
    if (API_MODE === 'mock') return mockApi.getMockCargas(params);
    
    // Na API real, esta função busca as cargas manuais/importadas para seleção no lançamento.
    let cargasManuais: Carga[] = await fetch(`${API_URL}/cargas-manuais`).then(handleResponse);
    
    // Aplicar filtros no frontend, pois a API simples não os suporta
    if (params) {
        if (params.data) {
            cargasManuais = cargasManuais.filter(c => c.DataCTE === params.data);
        }
        if (params.veiculoCod) {
            cargasManuais = cargasManuais.filter(c => c.COD_VEICULO === params.veiculoCod);
        }
    }
    return cargasManuais.filter(c => !c.Excluido); // Retornar apenas as ativas
};

export const getCargasManuais = (): Promise<Carga[]> => {
    if (API_MODE === 'mock') return mockApi.getMockCargasManuais();
    return fetch(`${API_URL}/cargas-manuais`).then(handleResponse);
};

export const getParametrosValores = (): Promise<ParametroValor[]> => {
    if (API_MODE === 'mock') return mockApi.getMockParametrosValores();
    return fetch(`${API_URL}/parametros-valores`).then(handleResponse);
};

export const getParametrosTaxas = (): Promise<ParametroTaxa[]> => {
    if (API_MODE === 'mock') return mockApi.getMockParametrosTaxas();
    return fetch(`${API_URL}/parametros-taxas`).then(handleResponse);
};

export const getMotivosSubstituicao = (): Promise<MotivoSubstituicao[]> => {
    return mockApi.getMockMotivosSubstituicao();
};

export const getLancamentos = (): Promise<Lancamento[]> => {
    if (API_MODE === 'mock') return mockApi.getMockLancamentos();
    return fetch(`${API_URL}/lancamentos`).then(handleResponse);
};


// --- Funções de Escrita (POST, PUT, DELETE) ---

export const createLancamento = (lancamento: NewLancamento): Promise<Lancamento> => {
    if (API_MODE === 'mock') return mockApi.createMockLancamento(lancamento);
    return apiRequest(`${API_URL}/lancamentos`, 'POST', lancamento);
};

export const deleteLancamento = (id: number, motivo: string): Promise<void> => {
    if (API_MODE === 'mock') return mockApi.deleteMockLancamento(id, motivo);
    return apiRequest(`${API_URL}/lancamentos/${id}`, 'PUT', { motivo });
};

export const createVeiculo = (veiculo: Omit<Veiculo, 'ID_Veiculo'>): Promise<Veiculo> => {
    if (API_MODE === 'mock') return mockApi.createMockVeiculo(veiculo);
    return apiRequest(`${API_URL}/veiculos`, 'POST', veiculo);
};

export const updateVeiculo = (id: number, veiculo: Veiculo): Promise<Veiculo> => {
    if (API_MODE === 'mock') return mockApi.updateMockVeiculo(id, veiculo);
    return apiRequest(`${API_URL}/veiculos/${id}`, 'PUT', veiculo);
};

export const createCarga = (carga: Omit<Carga, 'ID_Carga'>): Promise<Carga> => {
    if (API_MODE === 'mock') return mockApi.createMockCarga(carga);
    return apiRequest(`${API_URL}/cargas-manuais`, 'POST', carga);
};

export const updateCarga = (id: number, carga: Carga): Promise<Carga> => {
    if (API_MODE === 'mock') return mockApi.updateMockCarga(id, carga);
    return apiRequest(`${API_URL}/cargas-manuais/${id}`, 'PUT', carga);
};

export const deleteCarga = (id: number, motivo: string): Promise<void> => {
    if (API_MODE === 'mock') return mockApi.deleteMockCarga(id, motivo);
    const body = { Excluido: true, MotivoExclusao: motivo };
    return apiRequest(`${API_URL}/cargas-manuais/${id}`, 'PUT', body);
};

export const createParametroValor = (param: Omit<ParametroValor, 'ID_Parametro'>): Promise<ParametroValor> => {
    if (API_MODE === 'mock') return mockApi.createMockParametroValor(param);
    return apiRequest(`${API_URL}/parametros-valores`, 'POST', param);
};

export const updateParametroValor = (id: number, param: ParametroValor): Promise<ParametroValor> => {
    if (API_MODE === 'mock') return mockApi.updateMockParametroValor(id, param);
    return apiRequest(`${API_URL}/parametros-valores/${id}`, 'PUT', param);
};

export const deleteParametroValor = (id: number): Promise<void> => {
    if (API_MODE === 'mock') return mockApi.deleteMockParametroValor(id);
    return apiRequest(`${API_URL}/parametros-valores/${id}`, 'DELETE');
};

export const createParametroTaxa = (param: Omit<ParametroTaxa, 'ID_Taxa'>): Promise<ParametroTaxa> => {
    if (API_MODE === 'mock') return mockApi.createMockParametroTaxa(param);
    return apiRequest(`${API_URL}/parametros-taxas`, 'POST', param);
};

export const updateParametroTaxa = (id: number, param: ParametroTaxa): Promise<ParametroTaxa> => {
    if (API_MODE === 'mock') return mockApi.updateMockParametroTaxa(id, param);
    return apiRequest(`${API_URL}/parametros-taxas/${id}`, 'PUT', param);
};

export const deleteParametroTaxa = (id: number): Promise<void> => {
    if (API_MODE === 'mock') return mockApi.deleteMockParametroTaxa(id);
    return apiRequest(`${API_URL}/parametros-taxas/${id}`, 'DELETE');
};


// --- Importação ---

export const importCargasFromERP = async (startDate: string, endDate:string): Promise<{ message: string; count: number }> => {
    if (API_MODE === 'mock') return mockApi.importMockCargasFromERP(startDate, endDate);
    
    const body = { sIni: startDate, sFim: endDate };
    return apiRequest(`${API_URL}/cargas-erp/import`, 'POST', body);
};

export const importData = async (file: File, type: 'veiculos' | 'cargas' | 'parametros-valores' | 'parametros-taxas'): Promise<{ message: string; count: number }> => {
    if (API_MODE === 'api') {
        alert("A importação via CSV para a API ainda não foi implementada. Use a importação do ERP.");
    }

    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: { data: any[] }) => {
                console.log(`Dados para importar para '${type}':`, results.data);
                // Aqui você pode chamar as funções de mock para adicionar os dados
                // Ex: results.data.forEach(item => mockApi.createMockCarga(item));
                resolve({ message: `Arquivo CSV processado localmente.`, count: results.data.length });
            },
            error: (error: any) => reject(new Error('Erro ao ler o arquivo CSV: ' + error.message))
        });
    });
};