import { useEffect, useState } from 'react';

// Custom event interface
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Check if already dismissed this session
        if (sessionStorage.getItem('pwa-dismissed')) {
            setIsDismissed(true);
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('App installed');
        }
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsVisible(false);
        setIsDismissed(true);
        sessionStorage.setItem('pwa-dismissed', 'true');
    };

    if (!isVisible || isDismissed) return null;

    return (
        <div className="pwa-install-banner" onClick={handleInstallClick}>
            <div className="pwa-icon">🌳</div>
            <div className="pwa-content">
                <strong>¡Instala Raíces!</strong>
                <span>Acceso rápido a tu familia</span>
            </div>
            <button className="pwa-install-btn">Instalar</button>
            <button className="pwa-close-btn" onClick={handleDismiss}>×</button>

            <style>{`
                .pwa-install-banner {
                    position: fixed;
                    bottom: 90px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 1000;
                    background: linear-gradient(135deg, #1a1a2e 0%, #0a0a0f 100%);
                    border: 2px solid #D4AF37;
                    color: white;
                    padding: 12px 16px;
                    border-radius: 16px;
                    box-shadow: 0 8px 30px rgba(212, 175, 55, 0.3);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    max-width: 340px;
                    width: calc(100% - 2rem);
                    animation: slideUp 0.4s ease-out;
                }
                
                @keyframes slideUp {
                    from { transform: translateX(-50%) translateY(100px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                
                .pwa-icon {
                    font-size: 2rem;
                    flex-shrink: 0;
                }
                
                .pwa-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                
                .pwa-content strong {
                    color: #D4AF37;
                    font-size: 1rem;
                }
                
                .pwa-content span {
                    font-size: 0.8rem;
                    opacity: 0.7;
                }
                
                .pwa-install-btn {
                    background: linear-gradient(135deg, #D4AF37, #B8962E);
                    border: none;
                    color: #1a1a2e;
                    padding: 8px 16px;
                    border-radius: 50px;
                    font-weight: bold;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }
                
                .pwa-install-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4);
                }
                
                .pwa-close-btn {
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    width: 24px;
                    height: 24px;
                    background: #333;
                    border: 1px solid #555;
                    border-radius: 50%;
                    color: white;
                    font-size: 1rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            `}</style>
        </div>
    );
};
