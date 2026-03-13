import React from 'react';

interface DeleteMealModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const DeleteMealModal: React.FC<DeleteMealModalProps> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-white/20 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/20 rounded-full blur-3xl -mt-16 pointer-events-none"></div>
                <div className="text-center relative z-10">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                        🗑️
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 leading-tight">
                        Excluir Refeição?
                    </h3>
                    <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-8 leading-relaxed">
                        Essa ação vai remover as calorias do seu dia.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onConfirm}
                            className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 hover:scale-[1.02] transition-all shadow-lg shadow-red-500/20"
                        >
                            Sim, Excluir
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteMealModal;
