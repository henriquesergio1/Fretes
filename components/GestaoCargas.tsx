import React, { useState, useMemo, useContext, useEffect } from 'react';
import { Carga } from '../types.ts';
import { DataContext } from '../context/DataContext.tsx';
import { PlusCircleIcon, PencilIcon, XCircleIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, ExclamationIcon } from './icons.tsx';

// --- Tag Component for Carga Origin ---
const OrigemTag: React.FC<{ origem?: 'ERP' | 'CSV' | 'Manual' }> = ({ origem }) => {
    if (!origem) return null;

    const styles = {
        ERP: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
        CSV: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
        Manual: 'bg-green-500/20 text-green-300 border border-green-500/30',
    };

    return (
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${styles[origem]}`}>
            {origem}
        </span>
    );
};

// --- Modal Component for Deletion ---
const DeletionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (motivo: string) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    const [motivo, setMotivo] = useState('');

    useEffect(() => {
        if (isOpen) {
            setMotivo(''); // Reset motivo when modal opens
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (motivo.trim()) {
            onConfirm(motivo);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex items-start mb-4">
                    <ExclamationIcon className="w-8 h-8 text-yellow-400 mr-3 shrink-0" />
                    <div>
                        <h2 className="text-xl font-bold text-white">Confirmar Exclusão</h2>
                        <p className="text-slate-300 mt-1">Esta carga será marcada como excluída. Por favor, informe o motivo para fins de auditoria.</p>
                    </div>
                </div>
                <textarea
                    className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-red-500 focus:border-red-500"
                    rows={3}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Digite o motivo da exclusão..."
                />
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition duration-200">
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!motivo.trim()}
                        className="bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200"
                    >
                        Excluir Carga
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Modal Component for Editing/Creating Cargas ---
const CargaModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (carga: Carga) => void;
    carga: Carga | null;
}> = ({ isOpen, onClose, onSave, carga }) => {
    
    const { cidades, veiculos, parametrosValores } = useContext(DataContext);
    const [formData, setFormData] = useState<Carga | null>(null);
    const isEditing = formData && formData.ID_Carga !== 0;

    useEffect(() => {
        setFormData(carga);
    }, [carga]);

    // Automatically find and set KM when Cidade or Veiculo changes
    useEffect(() => {
        if (!formData?.Cidade || !formData.COD_VEICULO) {
            return;
        }

        const veiculo = veiculos.find(v => v.COD_Veiculo === formData.COD_VEICULO);
        if (!veiculo) {
            return;
        }

        const tipoVeiculo = veiculo.TipoVeiculo;
        const parametroValor =
            parametrosValores.find(p => p.Cidade === formData.Cidade && p.TipoVeiculo === tipoVeiculo) ||
            parametrosValores.find(p => p.Cidade === 'Qualquer' && p.TipoVeiculo === tipoVeiculo);

        const km = parametroValor ? parametroValor.KM : 0;
        
        setFormData(prev => {
            if (prev && prev.KM !== km) {
                return { ...prev, KM: km };
            }
            return prev;
        });

    }, [formData?.Cidade, formData?.COD_VEICULO, veiculos, parametrosValores]);


    if (!isOpen || !formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSaveClick = () => {
        const processedData: Carga = {
            ...formData,
            ValorCTE: parseFloat(String(formData.ValorCTE)) || 0,
            KM: parseFloat(String(formData.KM)) || 0,
        };

        if (!processedData.NumeroCarga || !processedData.Cidade || !processedData.COD_VEICULO) {
            alert("Por favor, preencha todos os campos obrigatórios: Nº Carga, Cidade e Veículo.");
            return;
        }

        // Validação de Auditoria: Se for edição, Motivo é obrigatório
        if (isEditing && (!processedData.MotivoAlteracao || processedData.MotivoAlteracao.trim() === "")) {
            alert("Para fins de auditoria, é obrigatório informar o Motivo da Edição.");
            return;
        }

        onSave(processedData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">
                        {isEditing ? 'Editar Carga' : 'Cadastrar Nova Carga'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <XCircleIcon className="w-8 h-8"/>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Auditoria Field - Only visible when Editing */}
                    {isEditing && (
                        <div className="bg-yellow-900/20 border border-yellow-600/30 p-3 rounded-md mb-4">
                            <label htmlFor="MotivoAlteracao" className="block text-sm font-bold text-yellow-400 mb-1">
                                Motivo da Edição (Obrigatório)
                            </label>
                            <textarea
                                name="MotivoAlteracao"
                                id="MotivoAlteracao"
                                rows={2}
                                value={formData.MotivoAlteracao || ''}
                                onChange={handleChange}
                                className="w-full bg-slate-700 text-white border border-yellow-500/50 rounded-md p-2 focus:ring-yellow-500 focus:border-yellow-500 placeholder-slate-500"
                                placeholder="Descreva por que esta carga está sendo alterada..."
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="NumeroCarga" className="block text-sm font-medium text-slate-300 mb-1">Nº Carga</label>
                            <input type="text" name="NumeroCarga" id="NumeroCarga" value={formData.NumeroCarga} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500" />
                        </div>
                        <div>
                           <label htmlFor="COD_VEICULO" className="block text-sm font-medium text-slate-300 mb-1">Veículo</label>
                           <select name="COD_VEICULO" id="COD_VEICULO" value={formData.COD_VEICULO} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500">
                                <option value="">Selecione um veículo</option>
                                {veiculos.filter(v => v.Ativo).map(v => (
                                    <option key={v.COD_Veiculo} value={v.COD_Veiculo}>{v.Placa} ({v.COD_Veiculo})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="Cidade" className="block text-sm font-medium text-slate-300 mb-1">Cidade</label>
                        <select name="Cidade" id="Cidade" value={formData.Cidade} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500">
                             <option value="">Selecione uma cidade</option>
                            {cidades.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="DataCTE" className="block text-sm font-medium text-slate-300 mb-1">Data CTE</label>
                            <input type="date" name="DataCTE" id="DataCTE" value={formData.DataCTE} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500" />
                        </div>
                        <div>
                            <label htmlFor="ValorCTE" className="block text-sm font-medium text-slate-300 mb-1">Valor CTE (R$)</label>
                            <input type="number" name="ValorCTE" id="ValorCTE" value={formData.ValorCTE} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500" />
                        </div>
                        <div>
                            <label htmlFor="KM" className="block text-sm font-medium text-slate-300 mb-1">KM</label>
                            <input type="number" name="KM" id="KM" value={formData.KM} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500" />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end space-x-3">
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition duration-200">
                        Cancelar
                    </button>
                    <button onClick={handleSaveClick} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition duration-200">
                        {isEditing ? 'Confirmar Alteração' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
    );
};


export const GestaoCargas: React.FC = () => {
    const { cargas, addCarga, updateCarga, deleteCarga } = useContext(DataContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCarga, setEditingCarga] = useState<Carga | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Carga; direction: 'ascending' | 'descending' } | null>({ key: 'DataCTE', direction: 'descending' });
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [cargaToDelete, setCargaToDelete] = useState<Carga | null>(null);
    const [showOnlyExcluded, setShowOnlyExcluded] = useState(false);

    const filteredAndSortedCargas = useMemo(() => {
        let result = cargas.filter(c => showOnlyExcluded ? c.Excluido : !c.Excluido);

        if (searchTerm) {
             result = result.filter(c =>
                c.NumeroCarga.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.Cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.COD_VEICULO.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (sortConfig !== null) {
            result.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return result;
    }, [cargas, searchTerm, sortConfig, showOnlyExcluded]);

    const requestSort = (key: keyof Carga) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Carga) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' 
            ? <ChevronUpIcon className="inline ml-1 w-4 h-4" /> 
            : <ChevronDownIcon className="inline ml-1 w-4 h-4" />;
    };

    const handleOpenModalForNew = () => {
        setEditingCarga({
            ID_Carga: 0, // Temp ID for new
            NumeroCarga: '',
            Cidade: '',
            ValorCTE: 0,
            DataCTE: new Date().toISOString().split('T')[0],
            KM: 0,
            COD_VEICULO: '',
            Origem: 'Manual',
        });
        setIsModalOpen(true);
    };

    const handleOpenModalForEdit = (carga: Carga) => {
        // CORREÇÃO: Normaliza a data para YYYY-MM-DD.
        const cleanDate = String(carga.DataCTE).split('T')[0];
        setEditingCarga({ ...carga, DataCTE: cleanDate, MotivoAlteracao: '' }); // Limpa motivo anterior ao abrir
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCarga(null);
    };

    const handleSaveCarga = async (cargaToSave: Carga) => {
        try {
            if (cargaToSave.ID_Carga === 0) {
                await addCarga(cargaToSave);
            } else {
                await updateCarga(cargaToSave);
            }
            handleCloseModal();
        } catch (error) {
            alert("Erro ao salvar carga: " + error);
        }
    };
    
    const handleDeleteClick = (carga: Carga) => {
        setCargaToDelete(carga);
        setIsDeleteModalOpen(true);
    };

    const handleCloseDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setCargaToDelete(null);
    };

    const handleConfirmDelete = async (motivo: string) => {
        if (!cargaToDelete) return;
        
        try {
            await deleteCarga(cargaToDelete.ID_Carga, motivo);
        } catch(error) {
            alert("Falha ao excluir carga: " + error);
        } finally {
            handleCloseDeleteModal();
        }
    };

    return (
        <div className="space-y-8">
            <CargaModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveCarga}
                carga={editingCarga}
            />
            <DeletionModal
                isOpen={isDeleteModalOpen}
                onClose={handleCloseDeleteModal}
                onConfirm={handleConfirmDelete}
            />
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Gestão de Cargas</h2>
                <p className="text-slate-400">Consulte, cadastre e edite as cargas disponíveis para frete.</p>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <input
                    type="text"
                    placeholder="Buscar por Nº Carga, Cidade ou Veículo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-auto flex-grow bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"
                />
                 <div className="flex items-center self-center sm:self-auto">
                    <input 
                        type="checkbox" 
                        id="showOnlyExcludedCargas" 
                        checked={showOnlyExcluded} 
                        onChange={(e) => setShowOnlyExcluded(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-sky-600 focus:ring-sky-500"
                    />
                    <label htmlFor="showOnlyExcludedCargas" className="ml-2 text-sm text-slate-300 whitespace-nowrap">
                        Exibir excluídas
                    </label>
                </div>
                <button onClick={handleOpenModalForNew} className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md transition duration-200 flex items-center justify-center">
                    <PlusCircleIcon className="w-5 h-5 mr-2" />
                    Cadastrar Nova Carga
                </button>
            </div>

            <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-700">
                            <tr>
                                <th scope="col" className="p-4 cursor-pointer" onClick={() => requestSort('NumeroCarga')}>Nº Carga {getSortIcon('NumeroCarga')}</th>
                                <th scope="col" className="p-4 cursor-pointer" onClick={() => requestSort('Cidade')}>Cidade {getSortIcon('Cidade')}</th>
                                <th scope="col" className="p-4 cursor-pointer" onClick={() => requestSort('DataCTE')}>Data CTE {getSortIcon('DataCTE')}</th>
                                <th scope="col" className="p-4 cursor-pointer" onClick={() => requestSort('ValorCTE')}>Valor CTE {getSortIcon('ValorCTE')}</th>
                                <th scope="col" className="p-4 cursor-pointer" onClick={() => requestSort('COD_VEICULO')}>Veículo {getSortIcon('COD_VEICULO')}</th>
                                {showOnlyExcluded && (
                                    <th scope="col" className="p-4">Motivo Exclusão</th>
                                )}
                                <th scope="col" className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedCargas.map(carga => {
                                const rowClasses = showOnlyExcluded
                                    ? "bg-red-900/10"
                                    : "bg-slate-800 border-b border-slate-700 hover:bg-slate-700/50";
                                
                                const rawDate = String(carga.DataCTE).split('T')[0];
                                const displayDate = new Date(rawDate + 'T00:00:00').toLocaleDateString('pt-BR');

                                return (
                                <tr key={carga.ID_Carga} className={rowClasses}>
                                    <td className="p-4 font-medium text-white">
                                        <div className="flex items-center gap-3">
                                            <span>{carga.NumeroCarga}</span>
                                            <OrigemTag origem={carga.Origem} />
                                            {carga.MotivoAlteracao && !showOnlyExcluded && (
                                                <span title={`Última alteração: ${carga.MotivoAlteracao}`} className="text-xs text-yellow-500 cursor-help border border-yellow-500/50 rounded px-1">Editado</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">{carga.Cidade}</td>
                                    <td className="p-4">{displayDate}</td>
                                    <td className="p-4">{carga.ValorCTE.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td className="p-4 font-mono text-xs">{carga.COD_VEICULO}</td>
                                    {showOnlyExcluded && (
                                        <td className="p-4">
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-300">
                                                {carga.MotivoExclusao}
                                            </span>
                                        </td>
                                    )}
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end items-center gap-4">
                                            <button onClick={() => handleOpenModalForEdit(carga)} disabled={showOnlyExcluded} className="text-sky-400 hover:text-sky-300 disabled:text-slate-600 disabled:cursor-not-allowed">
                                                <PencilIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDeleteClick(carga)} disabled={showOnlyExcluded} className="text-red-400 hover:text-red-300 disabled:text-slate-600 disabled:cursor-not-allowed">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                 {filteredAndSortedCargas.length === 0 && (
                    <div className="text-center p-8 text-slate-400">
                        Nenhuma carga encontrada. Tente ajustar sua busca ou importe novas cargas.
                    </div>
                 )}
            </div>
        </div>
    );
};