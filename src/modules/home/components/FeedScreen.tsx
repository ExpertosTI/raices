import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './FeedScreen.css';

interface Post {
    id: string;
    author: string;
    avatar: string;
    content: string;
    imageUrl?: string;
    likes: number;
    time: string;
}

export const FeedScreen: React.FC = () => {
    const navigate = useNavigate();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data since /api/feed may not exist yet
        const mockPosts: Post[] = [
            {
                id: '1',
                author: 'Lorenza Antonia',
                avatar: '👩',
                content: '¡Feliz cumpleaños a mi nieto! 🎂 Que Dios te bendiga siempre.',
                likes: 12,
                time: 'Hace 3 horas'
            },
            {
                id: '2',
                author: 'José Manuel',
                avatar: '👨',
                content: 'Compartiendo fotos de la última reunión familiar. ¡Qué alegría vernos todos!',
                imageUrl: '/img/familiacopleta.jpg',
                likes: 24,
                time: 'Hace 1 día'
            },
            {
                id: '3',
                author: 'Bernarda',
                avatar: '👩',
                content: 'Recordando a nuestros padres en este día especial. 🙏 Siempre en nuestros corazones.',
                likes: 45,
                time: 'Hace 2 días'
            }
        ];

        setTimeout(() => {
            setPosts(mockPosts);
            setLoading(false);
        }, 500);
    }, []);

    const handleLike = (postId: string) => {
        setPosts(posts.map(p =>
            p.id === postId ? { ...p, likes: p.likes + 1 } : p
        ));
    };

    if (loading) {
        return (
            <div className="feed-screen loading">
                <div className="loading-spinner">💬</div>
                <p>Cargando Actividad...</p>
            </div>
        );
    }

    return (
        <div className="feed-screen">
            <header className="feed-header">
                <button className="back-btn" onClick={() => navigate('/app')}>
                    ← Volver
                </button>
                <h1 className="feed-title">Actividad</h1>
            </header>

            <div className="feed-content">
                {posts.map(post => (
                    <div key={post.id} className="post-card">
                        <div className="post-header">
                            <div className="post-avatar">{post.avatar}</div>
                            <div className="post-author-info">
                                <span className="post-author">{post.author}</span>
                                <span className="post-time">{post.time}</span>
                            </div>
                        </div>
                        <p className="post-content">{post.content}</p>
                        {post.imageUrl && (
                            <img src={post.imageUrl} alt="" className="post-image" />
                        )}
                        <div className="post-actions">
                            <button className="action-btn" onClick={() => handleLike(post.id)}>
                                ❤️ {post.likes}
                            </button>
                            <button className="action-btn">💬 Comentar</button>
                            <button className="action-btn">📤 Compartir</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Navigation */}
            <nav className="app-nav">
                <div className="nav-item" onClick={() => navigate('/app')}>
                    <span>🏠</span>
                    <span>Inicio</span>
                </div>
                <div className="nav-item" onClick={() => navigate('/tree')}>
                    <span>🌳</span>
                    <span>Árbol</span>
                </div>
                <div className="nav-item" onClick={() => navigate('/events')}>
                    <span>📅</span>
                    <span>Eventos</span>
                </div>
                <div className="nav-item active" onClick={() => navigate('/feed')}>
                    <span>💬</span>
                    <span>Feed</span>
                </div>
            </nav>
        </div>
    );
};
