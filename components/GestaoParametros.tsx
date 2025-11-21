
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { DataContext } from '../context/DataContext.tsx';
import { ParametroValor, ParametroTaxa } from '../types.ts';
import { PlusCircleIcon, PencilIcon, XCircleIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, CheckCircleIcon, ExclamationIcon } from './icons.tsx';

// --- Reusable Card Component ---
const ParametroCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold text-sky-400 mb-4">{title}</h3>
        {children}
    </div>
);

// --- Modal Component for Deletion ---
const DeletionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (motivo: string) => void;
    itemDescription: string;
}> = ({ isOpen, onClose, onConfirm, itemDescription }) => {
    const [motivo, setMotivo] = useState('');

    useEffect(() => {
        if (isOpen) setMotivo('');
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
                        <p className="text-slate-300 mt-1">Você está excluindo: <b>{itemDescription}</b>.</p>
                        <p className="text-slate-400 text-sm mt-1">Para fins de auditoria, informe o motivo.</p>
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
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Modal for Value Parameters ---
const ValorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (param: ParametroValor) => void;
    parametro: ParametroValor | null;
}> = ({ isOpen, onClose, onSave, parametro }) => {
    const { tiposVeiculo, cidades } = useContext(DataContext);
    const [formData, setFormData] = useState<ParametroValor | null>(null);
    const [isManualCity, setIsManualCity] = useState(false);

    const isEditing = formData && formData.ID_Parametro !== 0;

    useEffect(() => {
        setFormData(parametro);
        setIsManualCity(false);
    }, [parametro]);

    if (!isOpen || !formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const toggleManualCity = () => {
        setIsManualCity(!isManualCity);
        setFormData({ ...formData, Cidade: '' });
    };

    const handleSaveClick = () => {
        if (isEditing && (!formData.MotivoAlteracao || !formData.MotivoAlteracao.trim())) {
             alert("Para editar, é obrigatório informar o Motivo da Alteração.");
             return;
        }

        const processedData: ParametroValor = {
            ...formData,
            ValorBase: parseFloat(String(formData.ValorBase)) || 0,
            KM: parseFloat(String(formData.KM)) || 0,
        };
        onSave(processedData);
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">{isEditing ? 'Editar Parâmetro' : 'Novo Parâmetro de Valor'}</h2>
                    <button onClick={onClose}><XCircleIcon className="w-8 h-8 text-slate-400 hover:text-white"/></button>
                </div>
                <div className="space-y-4">
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
                                placeholder="Descreva por que este valor está sendo alterado..."
                            />
                        </div>
                    )}

                     <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Cidade</label>
                        <div className="flex gap-2">
                            {isManualCity ? (
                                <input 
                                    type="text" 
                                    name="Cidade" 
                                    value={formData.Cidade} 
                                    onChange={handleChange} 
                                    className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500 animate-pulse-once"
                                    placeholder="Digite o nome da nova cidade"
                                    autoFocus
                                />
                            ) : (
                                <select 
                                    name="Cidade" 
                                    value={formData.Cidade} 
                                    onChange={handleChange} 
                                    className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"
                                >
                                    <option value="">Selecione...</option>
                                    {cidades.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            )}
                            <button 
                                type="button"
                                onClick={toggleManualCity}
                                className={`p-2 rounded-md transition-colors border ${isManualCity ? 'bg-slate-600 hover:bg-slate-500 text-white border-slate-500' : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500'}`}
                                title={isManualCity ? "Cancelar e voltar para lista" : "Adicionar nova cidade manualmente"}
                            >
                                {isManualCity ? <XCircleIcon className="w-5 h-5"/> : <PlusCircleIcon className="w-5 h-5"/>}
                            </button>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                         <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Veículo</label>
                             <select name="TipoVeiculo" value={formData.TipoVeiculo} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500">
                                <option value="">Selecione...</option>
                                {tiposVeiculo.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">KM</label>
                            <input type="number" name="KM" value={formData.KM} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"/>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Valor Base (R$)</label>
                        <input type="number" name="ValorBase" value={formData.ValorBase} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"/>
                    </div>
                </div>
                <div className="mt-8 flex justify-end space-x-3">
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Cancelar</button>
                    <button onClick={handleSaveClick} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md flex items-center">
                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Component for Managing Value Parameters ---
const GestaoParametrosValores: React.FC = () => {
    const { parametrosValores, addParametroValor, updateParametroValor, deleteParametroValor } = useContext(DataContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingParam, setEditingParam] = useState<ParametroValor | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof ParametroValor; direction: 'ascending' | 'descending' } | null>({ key: 'Cidade', direction: 'ascending' });

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [paramToDelete, setParamToDelete] = useState<ParametroValor | null>(null);

    const sortedAndFilteredParams = useMemo(() => {
        let filtered = parametrosValores.filter(p =>
            p.Cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.TipoVeiculo.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return filtered;
    }, [parametrosValores, searchTerm, sortConfig]);

    const requestSort = (key: keyof ParametroValor) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleOpenModalForNew = () => {
        setEditingParam({ ID_Parametro: 0, Cidade: '', TipoVeiculo: '', ValorBase: 0, KM: 0 });
        setIsModalOpen(true);
    };

    const handleOpenModalForEdit = (param: ParametroValor) => {
        setEditingParam({ ...param, MotivoAlteracao: '' }); // Clear previous reason
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingParam(null);
    };
    
    const handleSave = async (paramToSave: ParametroValor) => {
        if (!paramToSave.Cidade || !paramToSave.TipoVeiculo) {
            alert('Cidade e Tipo de Veículo são obrigatórios.');
            return;
        }

        try {
            if (paramToSave.ID_Parametro === 0) {
                await addParametroValor(paramToSave);
            } else {
                await updateParametroValor(paramToSave);
            }
            handleCloseModal();
        } catch (error) {
             alert('Erro ao salvar parâmetro: ' + error);
        }
    };

    const handleDeleteClick = (param: ParametroValor) => {
        setParamToDelete(param);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async (motivo: string) => {
        if (!paramToDelete) return;
        try {
            await deleteParametroValor(paramToDelete.ID_Parametro, motivo);
        } catch (error) {
            alert('Erro ao excluir parâmetro: ' + error);
        } finally {
            setIsDeleteModalOpen(false);
            setParamToDelete(null);
        }
    };
    
    const getSortIcon = (key: keyof ParametroValor) => {
        if (!sortConfig || sortConfig.key !== key) {
            return null;
        }
        if (sortConfig.direction === 'ascending') {
            return <ChevronUpIcon className="inline ml-1 w-4 h-4" />;
        }
        return <ChevronDownIcon className="inline ml-1 w-4 h-4" />;
    };

    return (
        <ParametroCard title="Parâmetros de Valores">
            <ValorModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSave} parametro={editingParam} />
            <DeletionModal 
                isOpen={isDeleteModalOpen} 
                onClose={() => setIsDeleteModalOpen(false)} 
                onConfirm={handleConfirmDelete}
                itemDescription={paramToDelete ? `${paramToDelete.Cidade} - ${paramToDelete.TipoVeiculo}` : ''}
            />
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                <input
                    type="text"
                    placeholder="Buscar por Cidade ou Tipo..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full sm:w-1/2 bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
                />
                <button onClick={handleOpenModalForNew} className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md text-sm inline-flex items-center justify-center">
                    <PlusCircleIcon className="w-5 h-5 mr-2"/> Cadastrar Novo
                </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
                 <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700 sticky top-0">
                        <tr>
                            <th className="p-2">
                                <button onClick={() => requestSort('Cidade')} className="w-full text-left">
                                    Cidade {getSortIcon('Cidade')}
                                </button>
                            </th>
                            <th className="p-2">
                                <button onClick={() => requestSort('TipoVeiculo')} className="w-full text-left">
                                    Tipo Veículo {getSortIcon('TipoVeiculo')}
                                </button>
                            </th>
                            <th className="p-2">
                                <button onClick={() => requestSort('ValorBase')} className="w-full text-left">
                                    Valor Base {getSortIcon('ValorBase')}
                                </button>
                            </th>
                            <th className="p-2">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredParams.map(p => (
                             <tr key={p.ID_Parametro} className="border-b border-slate-700">
                                <td className="p-2">{p.Cidade}</td><td className="p-2">{p.TipoVeiculo}</td>
                                <td className="p-2">
                                    <div className="flex items-center whitespace-nowrap">
                                        {p.ValorBase.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                        {p.MotivoAlteracao && (
                                            <span title={`Última alteração: ${p.MotivoAlteracao}`} className="ml-2 text-[10px] text-yellow-500 cursor-help border border-yellow-500/50 rounded px-1 uppercase">Editado</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-2">
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenModalForEdit(p)} className="text-sky-400 hover:text-sky-300"><PencilIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDeleteClick(p)} className="text-red-400 hover:text-red-300"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
                  {sortedAndFilteredParams.length === 0 && <p className="text-center text-sm text-slate-500 py-8">Nenhum parâmetro de valor encontrado.</p>}
            </div>
        </ParametroCard>
    );
};


// --- Modal for Tax Parameters ---
const TaxaModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (param: ParametroTaxa) => void;
    parametro: ParametroTaxa | null;
}> = ({ isOpen, onClose, onSave, parametro }) => {
    const { cidades } = useContext(DataContext);
    const [formData, setFormData] = useState<ParametroTaxa | null>(null);
    const [isManualCity, setIsManualCity] = useState(false);

    const isEditing = formData && formData.ID_Taxa !== 0;

    useEffect(() => {
        setFormData(parametro);
        setIsManualCity(false);
    }, [parametro]);

    if (!isOpen || !formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const toggleManualCity = () => {
        setIsManualCity(!isManualCity);
        setFormData({ ...formData, Cidade: '' });
    };

    const handleSaveClick = () => {
        if (isEditing && (!formData.MotivoAlteracao || !formData.MotivoAlteracao.trim())) {
            alert("Para editar, é obrigatório informar o Motivo da Alteração.");
            return;
        }

        const processedData: ParametroTaxa = {
            ...formData,
            Pedagio: parseFloat(String(formData.Pedagio)) || 0,
            Balsa: parseFloat(String(formData.Balsa)) || 0,
            Ambiental: parseFloat(String(formData.Ambiental)) || 0,
            Chapa: parseFloat(String(formData.Chapa)) || 0,
            Outras: parseFloat(String(formData.Outras)) || 0,
        };
        onSave(processedData);
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">{isEditing ? 'Editar Taxa' : 'Nova Taxa'}</h2>
                    <button onClick={onClose}><XCircleIcon className="w-8 h-8 text-slate-400 hover:text-white"/></button>
                </div>
                <div className="space-y-4">
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
                                placeholder="Descreva por que esta taxa está sendo alterada..."
                            />
                        </div>
                    )}

                     <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Cidade</label>
                        <div className="flex gap-2">
                            {isManualCity ? (
                                <input 
                                    type="text" 
                                    name="Cidade" 
                                    value={formData.Cidade} 
                                    onChange={handleChange} 
                                    className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500 animate-pulse-once"
                                    placeholder="Digite o nome da nova cidade"
                                    autoFocus
                                />
                            ) : (
                                <select 
                                    name="Cidade" 
                                    value={formData.Cidade} 
                                    onChange={handleChange} 
                                    className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"
                                >
                                    <option value="">Selecione...</option>
                                    {cidades.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            )}
                            <button 
                                type="button"
                                onClick={toggleManualCity}
                                className={`p-2 rounded-md transition-colors border ${isManualCity ? 'bg-slate-600 hover:bg-slate-500 text-white border-slate-500' : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500'}`}
                                title={isManualCity ? "Cancelar e voltar para lista" : "Adicionar nova cidade manualmente"}
                            >
                                {isManualCity ? <XCircleIcon className="w-5 h-5"/> : <PlusCircleIcon className="w-5 h-5"/>}
                            </button>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Pedágio</label>
                            <input type="number" name="Pedagio" value={formData.Pedagio} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Balsa</label>
                            <input type="number" name="Balsa" value={formData.Balsa} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Ambiental</label>
                            <input type="number" name="Ambiental" value={formData.Ambiental} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Chapa</label>
                            <input type="number" name="Chapa" value={formData.Chapa} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Outras</label>
                            <input type="number" name="Outras" value={formData.Outras} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500"/>
                        </div>
                    </div>
                </div>
                <div className="mt-8 flex justify-end space-x-3">
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Cancelar</button>
                    <button onClick={handleSaveClick} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md flex items-center">
                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Component for Managing Tax Parameters ---
const GestaoParametrosTaxas: React.FC = () => {
    const { parametrosTaxas, addParametroTaxa, updateParametroTaxa, deleteParametroTaxa } = useContext(DataContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingParam, setEditingParam] = useState<ParametroTaxa | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof ParametroTaxa | 'Total'; direction: 'ascending' | 'descending' } | null>({ key: 'Cidade', direction: 'ascending' });

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [paramToDelete, setParamToDelete] = useState<ParametroTaxa | null>(null);

    const sortedAndFilteredParams = useMemo(() => {
        let filtered = parametrosTaxas.filter(p =>
            p.Cidade.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                let aValue: any;
                let bValue: any;
    
                if (sortConfig.key === 'Total') {
                    aValue = a.Pedagio + a.Balsa + a.Ambiental + a.Chapa + a.Outras;
                    bValue = b.Pedagio + b.Balsa + b.Ambiental + b.Chapa + b.Outras;
                } else {
                    aValue = a[sortConfig.key as keyof ParametroTaxa];
                    bValue = b[sortConfig.key as keyof ParametroTaxa];
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return filtered;
    }, [parametrosTaxas, searchTerm, sortConfig]);

    const requestSort = (key: keyof ParametroTaxa | 'Total') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof ParametroTaxa | 'Total') => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' 
            ? <ChevronUpIcon className="inline ml-1 w-4 h-4" /> 
            : <ChevronDownIcon className="inline ml-1 w-4 h-4" />;
    };

    const handleOpenModalForNew = () => {
        setEditingParam({ ID_Taxa: 0, Cidade: '', Pedagio: 0, Balsa: 0, Ambiental: 0, Chapa: 0, Outras: 0 });
        setIsModalOpen(true);
    };

    const handleOpenModalForEdit = (param: ParametroTaxa) => {
        setEditingParam({ ...param, MotivoAlteracao: '' });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingParam(null);
    };

    const handleSave = async (paramToSave: ParametroTaxa) => {
        if (!paramToSave.Cidade) {
            alert('Cidade é obrigatória.');
            return;
        }

        try {
            if (paramToSave.ID_Taxa === 0) {
                await addParametroTaxa(paramToSave);
            } else {
                await updateParametroTaxa(paramToSave);
            }
            handleCloseModal();
        } catch (error) {
             alert('Erro ao salvar taxa: ' + error);
        }
    };

    const handleDeleteClick = (param: ParametroTaxa) => {
        setParamToDelete(param);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async (motivo: string) => {
        if (!paramToDelete) return;
        try {
            await deleteParametroTaxa(paramToDelete.ID_Taxa, motivo);
        } catch (error) {
            alert('Erro ao excluir taxa: ' + error);
        } finally {
            setIsDeleteModalOpen(false);
            setParamToDelete(null);
        }
    };
    
    return (
         <ParametroCard title="Parâmetros de Taxas">
             <TaxaModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSave} parametro={editingParam} />
             <DeletionModal 
                isOpen={isDeleteModalOpen} 
                onClose={() => setIsDeleteModalOpen(false)} 
                onConfirm={handleConfirmDelete}
                itemDescription={paramToDelete ? `Taxas de ${paramToDelete.Cidade}` : ''}
            />
             <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                <input
                    type="text"
                    placeholder="Buscar por Cidade..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full sm:w-1/2 bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
                />
                <button onClick={handleOpenModalForNew} className="w-full sm:w-auto bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md text-sm inline-flex items-center justify-center">
                    <PlusCircleIcon className="w-5 h-5 mr-2"/> Cadastrar Novo
                </button>
            </div>
             <div className="max-h-96 overflow-y-auto">
                 <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700 sticky top-0">
                        <tr>
                            <th className="p-2">
                                <button onClick={() => requestSort('Cidade')} className="w-full text-left">
                                    Cidade {getSortIcon('Cidade')}
                                </button>
                            </th>
                            <th className="p-2">
                                <button onClick={() => requestSort('Total')} className="w-full text-left">
                                    Total Taxas {getSortIcon('Total')}
                                </button>
                            </th>
                            <th className="p-2">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredParams.map(p => {
                            const total = p.Pedagio + p.Balsa + p.Ambiental + p.Chapa + p.Outras;
                            return (
                             <tr key={p.ID_Taxa} className="border-b border-slate-700">
                                <td className="p-2">{p.Cidade}</td>
                                <td className="p-2">
                                    <div className="flex items-center whitespace-nowrap">
                                        {total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                        {p.MotivoAlteracao && (
                                            <span title={`Última alteração: ${p.MotivoAlteracao}`} className="ml-2 text-[10px] text-yellow-500 cursor-help border border-yellow-500/50 rounded px-1 uppercase">Editado</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-2">
                                     <div className="flex gap-2">
                                         <button onClick={() => handleOpenModalForEdit(p)} className="text-sky-400 hover:text-sky-300"><PencilIcon className="w-5 h-5"/></button>
                                         <button onClick={() => handleDeleteClick(p)} className="text-red-400 hover:text-red-300"><TrashIcon className="w-5 h-5"/></button>
                                     </div>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                 </table>
                 {sortedAndFilteredParams.length === 0 && <p className="text-center text-sm text-slate-500 py-8">Nenhum parâmetro de taxa encontrado.</p>}
            </div>
        </ParametroCard>
    );
};


// --- Main Component for Parameter Management ---
export const GestaoParametros: React.FC = () => {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Parâmetros de Negócio</h2>
                <p className="text-slate-400">Defina os valores base e taxas adicionais para o cálculo automático dos fretes.</p>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                <GestaoParametrosValores />
                <GestaoParametrosTaxas />
            </div>
        </div>
    );
};
