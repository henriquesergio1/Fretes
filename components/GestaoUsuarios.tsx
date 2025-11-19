
import React, { useState, useEffect } from 'react';
import { Usuario } from '../types.ts';
import * as api from '../services/apiService.ts';
import { PlusCircleIcon, PencilIcon, CheckCircleIcon, XCircleIcon } from './icons.tsx';

export const GestaoUsuarios: React.FC = () => {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);

    const loadUsuarios = async () => {
        setLoading(true);
        try {
            const data = await api.getUsuarios();
            setUsuarios(data);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar usuários.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsuarios();
    }, []);

    const handleOpenModal = (user?: Usuario) => {
        setEditingUser(user || { ID_Usuario: 0, Nome: '', Usuario: '', Senha: '', Perfil: 'Operador', Ativo: true });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!editingUser) return;
        if (!editingUser.Nome || !editingUser.Usuario) {
            alert('Nome e Usuário são obrigatórios.');
            return;
        }

        try {
            if (editingUser.ID_Usuario === 0) {
                await api.createUsuario(editingUser);
            } else {
                await api.updateUsuario(editingUser.ID_Usuario, editingUser);
            }
            setIsModalOpen(false);
            loadUsuarios();
        } catch (err: any) {
            alert('Erro ao salvar usuário: ' + err.message);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'Ativo') {
            setEditingUser(prev => prev ? ({ ...prev, Ativo: (e.target as HTMLInputElement).checked }) : null);
        } else {
            setEditingUser(prev => prev ? ({ ...prev, [name]: value }) : null);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Gestão de Usuários</h2>
                    <p className="text-slate-400">Cadastre e gerencie o acesso ao sistema.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md flex items-center">
                    <PlusCircleIcon className="w-5 h-5 mr-2" /> Novo Usuário
                </button>
            </div>

            {loading && <p className="text-slate-400">Carregando...</p>}
            {error && <p className="text-red-400 bg-red-900/20 p-3 rounded border border-red-500/30">{error}</p>}

            <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700">
                        <tr>
                            <th className="p-4">Nome</th>
                            <th className="p-4">Usuário (Login)</th>
                            <th className="p-4">Perfil</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map(u => (
                            <tr key={u.ID_Usuario} className="border-b border-slate-700 hover:bg-slate-700/50">
                                <td className="p-4 font-medium text-white">{u.Nome}</td>
                                <td className="p-4 font-mono">{u.Usuario}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.Perfil === 'Admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                        {u.Perfil}
                                    </span>
                                </td>
                                <td className="p-4">
                                     <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.Ativo ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                        {u.Ativo ? 'Ativo' : 'Bloqueado'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleOpenModal(u)} className="text-sky-400 hover:text-sky-300"><PencilIcon className="w-5 h-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL DE USUÁRIO */}
            {isModalOpen && editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">{editingUser.ID_Usuario === 0 ? 'Novo Usuário' : 'Editar Usuário'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><XCircleIcon className="w-6 h-6 text-slate-400 hover:text-white"/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Nome Completo</label>
                                <input type="text" name="Nome" value={editingUser.Nome} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Usuário (Login)</label>
                                <input type="text" name="Usuario" value={editingUser.Usuario} onChange={handleChange} disabled={editingUser.ID_Usuario !== 0} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500 disabled:opacity-50" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    {editingUser.ID_Usuario === 0 ? 'Senha' : 'Nova Senha (deixe em branco para manter)'}
                                </label>
                                <input type="password" name="Senha" value={editingUser.Senha || ''} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Perfil</label>
                                <select name="Perfil" value={editingUser.Perfil} onChange={handleChange} className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-2 focus:ring-sky-500">
                                    <option value="Operador">Operador</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex items-center mt-2">
                                <input type="checkbox" name="Ativo" id="AtivoUser" checked={editingUser.Ativo} onChange={handleChange} className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-sky-600 focus:ring-sky-500" />
                                <label htmlFor="AtivoUser" className="ml-2 block text-sm text-slate-300">Usuário Ativo</label>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end space-x-3">
                            <button onClick={() => setIsModalOpen(false)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">Cancelar</button>
                            <button onClick={handleSave} className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md flex items-center">
                                <CheckCircleIcon className="w-5 h-5 mr-2" /> Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
