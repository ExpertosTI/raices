import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './FeedScreen.css';

interface User {
    name: string;
    image: string;
}

interface Post {
    id: string;
    content: string;
    imageUrl?: string;
    likes: number;
    createdAt: string;
    user: User;
    comments: any[];
}

export const FeedScreen: React.FC = () => {
    const navigate = useNavigate();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchFeed = async () => {
        try {
            const res = await fetch('/api/feed');
            if (res.ok) {
                const data = await res.json();
                setPosts(data);
            }
        } catch (error) {
            console.error('Error fetching feed:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeed();
    }, []);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && !selectedImage) return;

        setIsPosting(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('content', newPostContent);
            if (selectedImage) {
                formData.append('image', selectedImage);
            }

            const res = await fetch('/api/feed', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Do NOT set Content-Type for FormData, browser sets it with boundary
                },
                body: formData
            });

            if (res.ok) {
                setNewPostContent('');
                setSelectedImage(null);
                setPreviewUrl(null);
                fetchFeed(); // Refresh feed
            }
        } catch (error) {
            console.error('Error creating post:', error);
        } finally {
            setIsPosting(false);
        }
    };

    const handleLike = async (postId: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/feed/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                // Optimistic update
                setPosts(posts.map(p =>
                    p.id === postId ? { ...p, likes: p.likes + 1 } : p
                ));
            }
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-DO', {
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'short'
        });
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

            <main className="feed-content">
                {/* Create Post Section */}
                <div className="create-post-card">
                    <textarea
                        placeholder="¿Qué está pasando en la familia?"
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        className="post-input"
                    />

                    {previewUrl && (
                        <div className="image-preview-container">
                            <img src={previewUrl} alt="Preview" className="image-preview" />
                            <button className="remove-image-btn" onClick={() => {
                                setSelectedImage(null);
                                setPreviewUrl(null);
                            }}>✕</button>
                        </div>
                    )}

                    <div className="post-toolbar">
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={handleImageSelect}
                        />
                        <button
                            className="icon-btn"
                            onClick={() => fileInputRef.current?.click()}
                            title="Agregar foto"
                        >
                            📷
                        </button>
                        <button
                            className="post-btn"
                            disabled={isPosting || (!newPostContent.trim() && !selectedImage)}
                            onClick={handleCreatePost}
                        >
                            {isPosting ? 'Publicando...' : 'Publicar'}
                        </button>
                    </div>
                </div>

                {posts.map(post => (
                    <div key={post.id} className="post-card">
                        <div className="post-header">
                            <div className="post-avatar">
                                {post.user.image ? <img src={post.user.image} alt={post.user.name} /> : '👤'}
                            </div>
                            <div className="post-author-info">
                                <span className="post-author">{post.user.name || 'Miembro Familiar'}</span>
                                <span className="post-time">{formatTime(post.createdAt)}</span>
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
                            <button className="action-btn">💬 {post.comments.length}</button>
                            <button className="action-btn">📤</button>
                        </div>
                    </div>
                ))}

                {posts.length === 0 && (
                    <div className="empty-feed">
                        <p>Aún no hay publicaciones. ¡Sé el primero!</p>
                    </div>
                )}
            </main>

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
                <div className="nav-item" onClick={() => navigate('/sports')}>
                    <span>🏆</span>
                    <span>Deportes</span>
                </div>
                <div className="nav-item active">
                    <span>💬</span>
                    <span>Feed</span>
                </div>
            </nav>
        </div>
    );
};
