import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './FeedScreen.css';

/* Inline styles for comments (or move to CSS file if preferred) */
/* 
.comments-section {
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 10px;
    margin-top: 10px;
}
.comment {
    font-size: 0.9rem;
    margin-bottom: 5px;
}
.comment-author {
    font-weight: bold;
    color: #D4AF37;
    margin-right: 5px;
}
.comment-input {
    width: 100%;
    background: rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    padding: 8px 12px;
    color: white;
    margin-top: 10px;
}
*/

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


    const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});

    const toggleComments = (postId: string) => {
        setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
    };

    const handleComment = async (postId: string, content: string) => {
        if (!content.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/feed/${postId}/comment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });

            if (res.ok) {
                const newComment = await res.json();
                // Optimistic update mechanism would be better, but re-fetching is reliable
                fetchFeed();
            }
        } catch (error) {
            console.error('Error commenting:', error);
        }
    };

    const handleLike = async (postId: string) => { // ... existing code
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
                            <button className="action-btn" onClick={() => toggleComments(post.id)}>
                                💬 {post.comments.length}
                            </button>
                            {/* Download Image Button */}
                            {post.imageUrl && (
                                <a
                                    href={post.imageUrl}
                                    download={`raices-post-${post.id}.jpg`}
                                    className="action-btn"
                                    title="Descargar Foto"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    📥
                                </a>
                            )}
                        </div>

                        {/* Comments Section */}
                        {showComments[post.id] && (
                            <div className="comments-section">
                                <div className="comments-list">
                                    {post.comments.map((comment: any) => (
                                        <div key={comment.id} className="comment">
                                            <span className="comment-author">{comment.user.name}:</span>
                                            <span className="comment-text">{comment.content}</span>
                                        </div>
                                    ))}
                                    {post.comments.length === 0 && <p className="no-comments">Sé el primero en comentar.</p>}
                                </div>
                                <div className="comment-input-wrapper">
                                    <input
                                        type="text"
                                        placeholder="Escribe un comentario..."
                                        className="comment-input"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleComment(post.id, e.currentTarget.value);
                                                e.currentTarget.value = '';
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        )}
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
