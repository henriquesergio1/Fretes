
import React, { useState, useContext, ChangeEvent, useEffect } from 'react';
import { DataContext } from '../context/DataContext.tsx';
import * as api from '../services/apiService.ts';
import { CloudUploadIcon, CheckCircleIcon, XCircleIcon, SpinnerIcon, TruckIcon, ExclamationIcon } from './icons.tsx';
import { Veiculo, VehicleConflict } from '../types.ts';

type ImportType = 'veiculos' | 'cargas' | 'parametros-valores' | 'parametros-taxas';

interface ImportResult {
    success: boolean;
    message: string;
    count?: number;
}

// --- Modal de Resolução de Conflitos ---
const ConflictModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    conflicts: VehicleConflict[];
    newVehiclesCount: number;
    onConfirm: (conflicts: VehicleConflict[]) => void;
}> = ({ isOpen, onClose, conflicts, newVehiclesCount, onConfirm }) => {
    const [localConflicts, setLocalConflicts] = useState<VehicleConflict[]>([]);

    useEffect(() => {
        setLocalConflicts(conflicts);
    }, [conflicts]);

    if (!isOpen) return null;

    const updateAction = (index: number, action: 'overwrite' | 'skip') => {
        setLocalConflicts(prev => {
            const newArr = [...prev];
            newArr[index].action = action;
            return newArr;
        });
    };

    const setAll = (action: 'overwrite' | 'skip') => {
        setLocalConflicts(prev => prev.map(c => ({ ...c, action })));
    };

    const handleConfirm = () => {
        onConfirm(localConflicts);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center">
                        <ExclamationIcon className="w-8 h-8 text-yellow-500 mr-3" />
                        <div>
                            <h2 className="text-xl font-bold text-white">Veículos Duplicados Encontrados</h2>
                            <p className="text-sm text-slate-400">
                                {conflicts.length} veículos já existem no sistema. Escolha se deseja sobrescrever os dados locais com os do ERP.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose}><XCircleIcon className="w-8 h-8 text-slate-500 hover:text-slate-300" /></button>
                </div>

                <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                    <span className="text-sky-400 font-bold text-sm">Novos veículos a importar automaticamente: {newVehiclesCount}</span>
                    <div className="space-x-3">
                        <button onClick={() => setAll('overwrite')} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded border border-slate-600">Sobrescrever Todos (Sim)</button>
                        <button onClick={() => setAll('skip')} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded border border-slate-600">Manter Locais (Não)</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-700 sticky top-0">
                            <tr>
                                <th className="p-3">Código</th>
                                <th className="p-3">Placa (Local / ERP)</th>
                                <th className="p-3">Tipo (Local / ERP)</th>
                                <th className="p-3 text-center">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {localConflicts.map((conflict, index) => (
                                <tr key={index} className="hover:bg-slate-700/50">
                                    <td className="p-3 font-mono text-white">{conflict.local.COD_Veiculo}</td>
                                    <td className="p-3">
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 text-xs">Local: {conflict.local.Placa}</span>
                                            <span className={`text-xs ${conflict.local.Placa !== conflict.erp.Placa ? 'text-yellow-400 font-bold' : 'text-slate-300'}`}>
                                                ERP: {conflict.erp.Placa}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 text-xs">Local: {conflict.local.TipoVeiculo}</span>
                                            <span className={`text-xs ${conflict.local.TipoVeiculo !== conflict.erp.TipoVeiculo ? 'text-yellow-400 font-bold' : 'text-slate-300'}`}>
                                                ERP: {conflict.erp.TipoVeiculo}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center space-x-2">
                                            <button 
                                                onClick={() => updateAction(index, 'overwrite')} 
                                                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${conflict.action === 'overwrite' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                                            >
                                                Sim (Sobrescrever)
                                            </button>
                                            <button 
                                                onClick={() => updateAction(index, 'skip')} 
                                                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${conflict.action === 'skip' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                                            >
                                                Não (Manter)
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 border-t border-slate-700 flex justify-end space-x-3 bg-slate-800 rounded-b-lg">
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition duration-200">Cancelar</button>
                    <button onClick={handleConfirm} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition duration-200">
                        Confirmar Importação
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Card para Importação de Veículos do ERP ---
const ERPVeiculosImportCard: React.FC = () => {
    const { reloadData } = useContext(DataContext);
    const [isChecking, setIsChecking] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    
    const [conflictData, setConflictData] = useState<{ conflicts: VehicleConflict[], newVehicles: Veiculo[] } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleCheck = async () => {
        setIsChecking(true);
        setResult(null);
        try {
            const checkResult = await api.checkVeiculosERP();
            
            if (checkResult.newVehicles.length === 0 && checkResult.conflicts.length === 0) {
                setResult({ success: true, message: "O sistema já está sincronizado. Nenhum veículo novo ou alterado encontrado." });
                return;
            }

            // Se houver conflitos, abre modal. Se só houver novos, importa direto (mas vamos usar a mesma lógica de confirmação para consistência ou auto-importar)
            if (checkResult.conflicts.length > 0) {
                setConflictData({ conflicts: checkResult.conflicts, newVehicles: checkResult.newVehicles });
                setIsModalOpen(true);
            } else {
                // Apenas novos veículos, sem conflitos. Importar direto? Vamos confirmar.
                await executeSync(checkResult.newVehicles, []);
            }

        } catch (error: any) {
            setResult({ success: false, message: error.message || "Erro ao verificar veículos no ERP." });
        } finally {
            setIsChecking(false);
        }
    };

    const executeSync = async (newVehicles: Veiculo[], vehiclesToUpdate: Veiculo[]) => {
        setIsSyncing(true);
        try {
            const syncResult = await api.syncVeiculosERP(newVehicles, vehiclesToUpdate);
            setResult({ success: true, message: syncResult.message, count: syncResult.count });
            await reloadData('veiculos');
            setIsModalOpen(false);
            setConflictData(null);
        } catch (error: any) {
            setResult({ success: false, message: error.message || "Erro ao sincronizar veículos." });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleModalConfirm = (resolvedConflicts: VehicleConflict[]) => {
        if (!conflictData) return;
        
        const vehiclesToUpdate = resolvedConflicts
            .filter(c => c.action === 'overwrite')
            .map(c => c.erp);
        
        executeSync(conflictData.newVehicles, vehiclesToUpdate);
    };

    return (
        <>
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-sky-500/30">
                 <div className="flex items-center mb-4">
                    <TruckIcon className="w-8 h-8 text-sky-400 mr-4" />
                    <div>
                        <h3 className="text-lg font-semibold text-white">Sincronizar Veículos do ERP</h3>
                        <p className="text-sm text-slate-400">Atualize sua frota buscando novos cadastros e alterações diretamente do ERP.</p>
                    </div>
                </div>
                <div className="mt-4">
                    <button 
                        onClick={handleCheck}
                        disabled={isChecking || isSyncing}
                        className="bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-md transition duration-200 w-full sm:w-auto inline-flex items-center justify-center"
                    >
                        {isChecking || isSyncing ? <SpinnerIcon className="w-5 h-5 mr-2" /> : null}
                        {isChecking ? 'Verificando...' : (isSyncing ? 'Sincronizando...' : 'Verificar Atualizações')}
                    </button>
                </div>
                {result && (
                    <div className={`mt-4 p-3 rounded-md text-sm flex items-center ${result.success ? 'bg-green-900/50 text-green-200 border border-green-700/50' : 'bg-red-900/50 text-red-200 border border-red-700/50'}`}>
                        {result.success ? <CheckCircleIcon className="w-5 h-5 mr-2" /> : <XCircleIcon className="w-5 h-5 mr-2" />}
                        {result.message}
                    </div>
                )}
            </div>

            {conflictData && (
                <ConflictModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    conflicts={conflictData.conflicts}
                    newVehiclesCount={conflictData.newVehicles.length}
                    onConfirm={handleModalConfirm}
                />
            )}
        </>
    );
};


// --- Card para Importação do ERP (Cargas) ---
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ERPImportCard />
                <ERPVeiculosImportCard />
            </div>
            
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
