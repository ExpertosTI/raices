import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Heart, MessageCircle, Share2, Download } from 'lucide-react';
import { FloatingDock } from '../../../components/FloatingDock';
import './FeedScreen.css';

interface User {
    name: string;
    image: string;
    id?: string;
    role?: string;
}

interface Comment {
    id: string;
    content: string;
    user: User;
}

interface Post {
    id: string;
    content: string;
    imageUrl?: string;
    likes: number;
    createdAt: string;
    user: User;
    comments: Comment[];
}

export const FeedScreen: React.FC = () => {
    const navigate = useNavigate();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});

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
        const u = localStorage.getItem('user');
        if (u) setCurrentUser(JSON.parse(u));
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
                },
                body: formData
            });

            if (res.ok) {
                setNewPostContent('');
                setSelectedImage(null);
                setPreviewUrl(null);
                fetchFeed();
            }
        } catch (error) {
            console.error('Error creating post:', error);
        } finally {
            setIsPosting(false);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm('¿Seguro que quieres eliminar esta publicación?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/feed/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setPosts(posts.filter(p => p.id !== postId));
            }
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    };

    const handleLike = async (postId: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/feed/${postId}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setPosts(posts.map(p =>
                    p.id === postId ? { ...p, likes: p.likes + 1 } : p
                ));
            }
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

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
                await res.json();
                fetchFeed();
            }
        } catch (error) {
            console.error('Error commenting:', error);
        }
    };

    const formatTimeRelative = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'hace momentos';
        if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`;
        if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} h`;
        if (diffInSeconds < 604800) return `hace ${Math.floor(diffInSeconds / 86400)} d`;
        return date.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' });
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
                            <div className="post-header-left">
                                <div className="post-avatar">
                                    {post.user.image ? <img src={post.user.image} alt={post.user.name} /> : '👤'}
                                </div>
                                <div className="post-author-info">
                                    <span className="author-name">{post.user.name || 'Miembro Familiar'}</span>
                                    <span className="post-time">{formatTimeRelative(post.createdAt)}</span>
                                </div>
                            </div>

                            {(currentUser?.id === post.user?.id || currentUser?.role === 'ADMIN') && (
                                <button className="delete-post-btn" onClick={() => handleDeletePost(post.id)} title="Eliminar">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        <div className="post-content">
                            <p>{post.content}</p>
                            {post.imageUrl && (
                                <div className="post-image-container">
                                    <img src={post.imageUrl} alt="Post content" loading="lazy" />
                                </div>
                            )}
                        </div>

                        <div className="post-actions">
                            <button className="action-btn" onClick={() => handleLike(post.id)}>
                                <Heart size={18} fill={post.likes > 0 ? "rgba(220, 38, 38, 0.5)" : "none"} color={post.likes > 0 ? "#ef4444" : "currentColor"} />
                                <span>{post.likes}</span>
                            </button>
                            <button className="action-btn" onClick={() => toggleComments(post.id)}>
                                <MessageCircle size={18} />
                                <span>{post.comments ? post.comments.length : 0}</span>
                            </button>
                            {post.imageUrl && (
                                <a
                                    href={post.imageUrl}
                                    download={`post-${post.id}.jpg`}
                                    className="action-btn"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Download size={18} />
                                </a>
                            )}
                            <button className="action-btn">
                                <Share2 size={18} />
                            </button>
                        </div>

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

            <FloatingDock />
        </div>
    );
};
