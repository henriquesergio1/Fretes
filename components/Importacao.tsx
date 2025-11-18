import React, { useState, useContext, ChangeEvent } from 'react';
import { DataContext } from '../context/DataContext';
import * as api from '../services/apiService';
import { CloudUploadIcon, CheckCircleIcon, XCircleIcon, SpinnerIcon, TruckIcon } from './icons';

type ImportType = 'veiculos' | 'cargas' | 'parametros-valores' | 'parametros-taxas';

interface ImportResult {
    success: boolean;
    message: string;
    count?: number;
}

// --- Card para Importação do ERP ---
const ERPImportCard: React.FC = () => {
    const { reloadData } = useContext(DataContext);
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleImport = async () => {
        setResult(null);
        setIsImporting(true);
        try {
            const apiResult = await api.importCargasFromERP(startDate, endDate);
             setResult({ 
                success: true, 
                message: apiResult.message, 
                count: apiResult.count 
            });
            if (apiResult.count > 0) {
                await reloadData('cargas');
            }
        } catch (error: any) {
            setResult({ success: false, message: error.message || 'Falha na importação.' });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-sky-500/30">
            <div className="flex items-center mb-4">
                <TruckIcon className="w-8 h-8 text-sky-400 mr-4" />
                <div>
                    <h3 className="text-lg font-semibold text-white">Importar Cargas do ERP</h3>
                    <p className="text-sm text-slate-400">Busque e importe novas cargas diretamente do banco de dados do ERP.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end mt-4">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-slate-300 mb-1">Data Início</label>
                    <input type="date" name="startDate" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500" />
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-slate-300 mb-1">Data Fim</label>
                    <input type="date" name="endDate" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 text-sm focus:ring-sky-500 focus:border-sky-500" />
                </div>
                 <button 
                    onClick={handleImport}
                    disabled={isImporting}
                    className="bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200 w-full inline-flex items-center justify-center"
                 >
                     {isImporting ? (
                        <>
                            <SpinnerIcon className="w-5 h-5 mr-2" />
                            <span>Buscando...</span>
                        </>
                    ) : (
                       <span>Buscar e Importar</span>
                    )}
                 </button>
            </div>
             {result && (
                <div className={`mt-4 p-3 rounded-md text-sm flex items-center ${result.success ? 'bg-green-900/50 text-green-200 border border-green-700/50' : 'bg-red-900/50 text-red-200 border border-red-700/50'}`}>
                    {result.success ? <CheckCircleIcon className="w-5 h-5 mr-2" /> : <XCircleIcon className="w-5 h-5 mr-2" />}
                    {result.message}
                </div>
            )}
        </div>
    );
};


// --- Card para Importação via CSV ---
const CSVImportCard: React.FC<{
    title: string;
    description: string;
    headers: string;
    importType: ImportType;
}> = ({ title, description, headers, importType }) => {
    const { reloadData } = useContext(DataContext);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    
    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setResult(null);
        setIsImporting(true);

        try {
            const apiResult = await api.importData(file, importType);
            setResult({ 
                success: true, 
                message: `${apiResult.message} ${apiResult.count} registros processados.`, 
                count: apiResult.count 
            });
            // Reload relevant data after mock processing
            if (importType === 'veiculos') await reloadData('veiculos');
            else if (importType === 'cargas') await reloadData('cargas');
            else if (importType === 'parametros-valores') await reloadData('parametrosValores');
            else if (importType === 'parametros-taxas') await reloadData('parametrosTaxas');

        } catch (error: any) {
            setResult({ success: false, message: error.message || 'Falha no upload do arquivo.', count: 0 });
        } finally {
            setIsImporting(false);
            e.target.value = '';
        }
    };

    return (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <div className="flex items-center mb-4">
                <CloudUploadIcon className="w-8 h-8 text-slate-400 mr-4" />
                <div>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <p className="text-sm text-slate-400">{description}</p>
                </div>
            </div>
            <div className="mt-4 bg-slate-900 p-3 rounded-md">
                <p className="text-xs text-slate-400">Colunas esperadas (CSV):</p>
                <p className="text-xs font-mono text-sky-300 mt-1">{headers}</p>
            </div>
            <div className="mt-6">
                <label htmlFor={`file-upload-${importType}`} className={`relative cursor-pointer text-white font-bold py-2 px-4 rounded-md transition duration-200 w-full text-center inline-flex items-center justify-center ${isImporting ? 'bg-slate-500 cursor-not-allowed' : 'bg-slate-600 hover:bg-slate-500'}`}>
                    {isImporting ? (
                        <><SpinnerIcon className="w-5 h-5 mr-2" /><span>Importando...</span></>
                    ) : (
                       <span>Selecionar Arquivo CSV</span>
                    )}
                    <input id={`file-upload-${importType}`} name={`file-upload-${importType}`} type="file" className="sr-only" accept=".csv" onChange={handleFileChange} disabled={isImporting} />
                </label>
            </div>
            {result && (
                <div className={`mt-4 p-3 rounded-md text-sm flex items-center ${result.success ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'}`}>
                    {result.success ? <CheckCircleIcon className="w-5 h-5 mr-2" /> : <XCircleIcon className="w-5 h-5 mr-2" />}
                    {result.message}
                </div>
            )}
        </div>
    );
};

// --- Componente Principal ---
export const Importacao: React.FC = () => {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Importação de Dados</h2>
                <p className="text-slate-400">Importe cargas do ERP ou carregue outros dados via arquivos CSV.</p>
            </div>

            <ERPImportCard />
            
            <div className="border-t border-slate-700 pt-8">
                 <h3 className="text-xl font-bold text-white mb-2">Importação Manual via CSV</h3>
                <p className="text-slate-400 mb-6">Para cadastros em massa, utilize os templates abaixo.</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <CSVImportCard
                        title="Importar Veículos"
                        description="Faça o upload da sua frota de veículos."
                        headers="COD_Veiculo,Placa,TipoVeiculo,Motorista,CapacidadeKG,Ativo"
                        importType="veiculos"
                    />
                     <CSVImportCard
                        title="Importar Cargas Manuais"
                        description="Carregue cargas que não estão no ERP."
                        headers="NumeroCarga,Cidade,ValorCTE,DataCTE,COD_VEICULO"
                        importType="cargas"
                    />
                    <CSVImportCard
                        title="Importar Parâmetros de Valores"
                        description="Defina os valores base por cidade e tipo de veículo."
                        headers="Cidade,TipoVeiculo,ValorBase,KM"
                        importType="parametros-valores"
                    />
                     <CSVImportCard
                        title="Importar Parâmetros de Taxas"
                        description="Defina as taxas (pedágio, balsa, etc.) por cidade."
                        headers="Cidade,Pedagio,Balsa,Ambiental,Chapa,Outras"
                        importType="parametros-taxas"
                    />
                </div>
            </div>
        </div>
    );
};