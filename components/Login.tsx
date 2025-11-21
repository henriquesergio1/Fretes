
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { SpinnerIcon, Frete360Logo, ExclamationIcon, TruckIcon } from './icons.tsx';

export const Login: React.FC = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Estado local para configuração visual (lido do localStorage pois o DataContext ainda não carregou)
    const [config, setConfig] = useState({ companyName: '', logoUrl: '' });

    useEffect(() => {
        const savedConfig = localStorage.getItem('SYSTEM_CONFIG');
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                setConfig({
                    companyName: parsed.companyName || '',
                    logoUrl: parsed.logoUrl || ''
                });
            } catch (e) {
                // Se der erro, ignora
            }
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            setError('Preencha usuário e senha.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await login(username, password);
        } catch (err: any) {
            setError(err.message || 'Falha no login.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
            {/* Elemento de Fundo Decorativo */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-10 pointer-events-none">
                 <div className="absolute -top-24 -left-24 w-96 h-96 bg-sky-600 rounded-full blur-3xl"></div>
                 <div className="absolute bottom-0 right-0 w-64 h-64 bg-sky-800 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-2xl border border-slate-700 p-8 z-10 relative">
                
                {/* --- Marca FRETE360 --- */}
                <div className="flex flex-col items-center mb-6 border-b border-slate-700 pb-6">
                    <div className="flex items-center justify-center mb-2">
                        <Frete360Logo className="h-12 w-12 mr-3 text-sky-500" />
                        <h1 className="text-4xl font-extrabold text-white tracking-tight">Frete<span className="text-sky-500">360</span></h1>
                    </div>
                    <p className="text-sky-200 text-sm font-medium">Controle total, sem complicação.</p>
                </div>

                {/* --- Marca do Cliente/Ambiente (Se houver) --- */}
                {(config.companyName || config.logoUrl) && (
                    <div className="flex flex-col items-center mb-8 animate-fade-in">
                         {config.logoUrl ? (
                            <img 
                                src={config.logoUrl} 
                                alt={config.companyName} 
                                className="h-12 w-auto object-contain mb-2 opacity-80"
                                onError={(e) => e.currentTarget.style.display = 'none'}
                            />
                        ) : (
                            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center mb-2">
                                <TruckIcon className="w-6 h-6 text-slate-400" />
                            </div>
                        )}
                        <div className="text-center">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ambiente</p>
                            <h2 className="text-lg font-bold text-white leading-none">{config.companyName || 'Empresa'}</h2>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-3 bg-red-900/30 border border-red-500/50 rounded-md flex items-start text-sm text-red-200 animate-pulse-once">
                        <ExclamationIcon className="w-5 h-5 mr-2 shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Usuário</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                            placeholder="Seu usuário"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-700 text-white border border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                            placeholder="Sua senha"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-bold py-3 rounded-md transition duration-200 flex justify-center items-center shadow-lg shadow-sky-900/20"
                    >
                        {isLoading ? (
                            <>
                                <SpinnerIcon className="w-5 h-5 mr-2" /> Entrando...
                            </>
                        ) : (
                            'Acessar Sistema'
                        )}
                    </button>
                </form>
                
                <div className="mt-8 text-center border-t border-slate-700 pt-4">
                    <p className="text-xs text-slate-600 font-mono mb-2">Versão 1.2.20</p>
                    <div className="flex flex-col items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                        <p className="text-[10px] text-slate-600 uppercase tracking-wider">Dev</p>
                        <p className="text-xs text-slate-400 font-medium">Sérgio Oliveira</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
