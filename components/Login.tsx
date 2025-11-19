
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { SpinnerIcon, TruckIcon, ExclamationIcon } from './icons.tsx';

export const Login: React.FC = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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
        <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-slate-800 rounded-lg shadow-2xl border border-slate-700 p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-sky-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-sky-900/50">
                        <TruckIcon className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Fretes</h1>
                    <p className="text-slate-400 mt-2 text-sm">Faça login para acessar o sistema</p>
                </div>

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
                        className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-bold py-3 rounded-md transition duration-200 flex justify-center items-center shadow-lg"
                    >
                        {isLoading ? (
                            <>
                                <SpinnerIcon className="w-5 h-5 mr-2" /> Entrando...
                            </>
                        ) : (
                            'Entrar'
                        )}
                    </button>
                </form>
                
                <div className="mt-8 text-center text-xs text-slate-500">
                    &copy; {new Date().getFullYear()} Fretes System. Todos os direitos reservados.
                </div>
            </div>
        </div>
    );
};
