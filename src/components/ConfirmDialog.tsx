import { useState, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import './ConfirmDialog.css';

interface ConfirmDialogContextType {
    confirm: (message: string, title?: string) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(null);

export const useConfirmDialog = () => {
    const context = useContext(ConfirmDialogContext);
    if (!context) {
        throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
    }
    return context;
};

// Alias que devuelve solo la función confirm
export const useConfirm = () => {
    const { confirm } = useConfirmDialog();
    return confirm;
};

interface ConfirmDialogProviderProps {
    children: ReactNode;
}

export const ConfirmDialogProvider = ({ children }: ConfirmDialogProviderProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [title, setTitle] = useState('Confirmar');
    const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

    const confirm = useCallback((msg: string, titleText?: string): Promise<boolean> => {
        setMessage(msg);
        setTitle(titleText || 'Confirmar');
        setIsOpen(true);

        return new Promise((resolve) => {
            setResolver(() => resolve);
        });
    }, []);

    const handleConfirm = () => {
        setIsOpen(false);
        resolver?.(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        resolver?.(false);
    };

    return (
        <ConfirmDialogContext.Provider value={{ confirm }}>
            {children}
            {isOpen && (
                <div className="confirm-dialog-overlay" onClick={handleCancel}>
                    <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
                        <h3 className="confirm-title">{title}</h3>
                        <p className="confirm-message">{message}</p>
                        <div className="confirm-actions">
                            <button className="confirm-btn cancel" onClick={handleCancel}>
                                Cancelar
                            </button>
                            <button className="confirm-btn accept" onClick={handleConfirm}>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmDialogContext.Provider>
    );
};
