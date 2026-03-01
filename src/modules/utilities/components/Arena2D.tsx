import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import type { FamilyMember } from '../../../types';
import { getFamilyMembers } from '../../../services/api';
import './Arena2D.css';

type Player = {
    id: string;
    name: string;
    photo?: string;
    color: string;
};

const ARENA_HEIGHT = 260;
const MAX_PLAYERS = 12;
const PLAYER_RADIUS = 18;
const SPEED = 140;
const JOYSTICK_RADIUS = 36;

export const Arena2D = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
    const activeIdRef = useRef<string | null>(null);
    const sizeRef = useRef({ width: 0, height: ARENA_HEIGHT, dpr: 1 });
    const positionsRef = useRef(new Map<string, { x: number; y: number }>());
    const imagesRef = useRef(new Map<string, HTMLImageElement>());
    const keysRef = useRef({ up: false, down: false, left: false, right: false });
    const joystickRef = useRef({ active: false, x: 0, y: 0 });
    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef(0);
    const obstaclesRef = useRef<{ x: number; y: number; r: number }[]>([]);

    useEffect(() => {
        activeIdRef.current = activeId;
    }, [activeId]);

    useEffect(() => {
        let alive = true;
        const load = async () => {
            setLoading(true);
            try {
                const data = await getFamilyMembers();
                if (!alive) return;
                const filtered = Array.isArray(data) ? data.slice(0, MAX_PLAYERS) : [];
                setMembers(filtered);
            } catch {
                if (!alive) return;
                setMembers([]);
            } finally {
                if (alive) setLoading(false);
            }
        };
        load();
        return () => {
            alive = false;
        };
    }, []);

    const players = useMemo<Player[]>(() => {
        const base = members.length
            ? members
            : [
                {
                    id: 'guest-1',
                    name: 'Invitado',
                    photo: undefined,
                    preferredColor: '#D4AF37'
                } as FamilyMember
            ];
        return base.map((m, index) => ({
            id: m.id || `guest-${index}`,
            name: m.name || `Jugador ${index + 1}`,
            photo: m.photo,
            color: m.preferredColor || m.branch?.color || '#D4AF37'
        }));
    }, [members]);

    useEffect(() => {
        if (!activeId && players.length > 0) {
            setActiveId(players[0].id);
        }
    }, [players, activeId]);

    useEffect(() => {
        players.forEach((p) => {
            if (p.photo && !imagesRef.current.has(p.id)) {
                const img = new Image();
                img.src = p.photo;
                imagesRef.current.set(p.id, img);
            }
        });
    }, [players]);

    const clampPosition = (x: number, y: number) => {
        const { width, height } = sizeRef.current;
        const pad = PLAYER_RADIUS + 6;
        const clampedX = Math.max(pad, Math.min(width - pad, x));
        const clampedY = Math.max(pad, Math.min(height - pad, y));
        return { x: clampedX, y: clampedY };
    };

    const ensurePositions = () => {
        const { width, height } = sizeRef.current;
        if (!width || !height) return;
        players.forEach((p, index) => {
            if (!positionsRef.current.has(p.id)) {
                const x = PLAYER_RADIUS + 8 + (index * 43) % Math.max(1, width - PLAYER_RADIUS * 2);
                const y = PLAYER_RADIUS + 10 + ((index * 71) % Math.max(1, height - PLAYER_RADIUS * 2));
                positionsRef.current.set(p.id, clampPosition(x, y));
            } else {
                const pos = positionsRef.current.get(p.id)!;
                positionsRef.current.set(p.id, clampPosition(pos.x, pos.y));
            }
        });
    };

    const buildObstacles = () => {
        const { width, height } = sizeRef.current;
        obstaclesRef.current = [
            { x: width * 0.28, y: height * 0.35, r: 22 },
            { x: width * 0.68, y: height * 0.3, r: 18 },
            { x: width * 0.55, y: height * 0.72, r: 26 }
        ].filter(o => o.x > 0 && o.y > 0);
    };

    useEffect(() => {
        const resize = () => {
            const container = containerRef.current;
            const canvas = canvasRef.current;
            if (!container || !canvas) return;
            const width = container.clientWidth;
            const height = ARENA_HEIGHT;
            const dpr = window.devicePixelRatio || 1;
            sizeRef.current = { width, height, dpr };
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            buildObstacles();
            ensurePositions();
        };

        resize();
        let ro: ResizeObserver | null = null;
        if (containerRef.current && 'ResizeObserver' in window) {
            ro = new ResizeObserver(resize);
            ro.observe(containerRef.current);
        } else {
            window.addEventListener('resize', resize);
        }
        return () => {
            if (ro) ro.disconnect();
            window.removeEventListener('resize', resize);
        };
    }, [players]);

    useEffect(() => {
        ensurePositions();
    }, [players]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const tag = (document.activeElement?.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = true;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = true;
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = false;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = false;
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, []);

    useEffect(() => {
        const loop = (time: number) => {
            const { width, height, dpr } = sizeRef.current;
            const canvas = canvasRef.current;
            if (!canvas || !width || !height) {
                animationRef.current = requestAnimationFrame(loop);
                return;
            }
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                animationRef.current = requestAnimationFrame(loop);
                return;
            }
            const dt = lastTimeRef.current ? Math.min(0.05, (time - lastTimeRef.current) / 1000) : 0;
            lastTimeRef.current = time;

            const active = activeIdRef.current;
            const inputX = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
            const inputY = (keysRef.current.down ? 1 : 0) - (keysRef.current.up ? 1 : 0);
            let vx = inputX;
            let vy = inputY;
            if (joystickRef.current.active) {
                vx = joystickRef.current.x;
                vy = joystickRef.current.y;
            }
            const len = Math.hypot(vx, vy);
            if (len > 1) {
                vx /= len;
                vy /= len;
            }

            if (active) {
                const pos = positionsRef.current.get(active);
                if (pos) {
                    const nextX = pos.x + vx * SPEED * dt;
                    const nextY = pos.y + vy * SPEED * dt;
                    const clamped = clampPosition(nextX, nextY);
                    let finalX = clamped.x;
                    let finalY = clamped.y;
                    obstaclesRef.current.forEach(o => {
                        const dx = finalX - o.x;
                        const dy = finalY - o.y;
                        const dist = Math.hypot(dx, dy);
                        const minDist = o.r + PLAYER_RADIUS + 2;
                        if (dist < minDist && dist > 0) {
                            const push = (minDist - dist) / dist;
                            finalX += dx * push;
                            finalY += dy * push;
                        }
                    });
                    positionsRef.current.set(active, clampPosition(finalX, finalY));
                }
            }

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, width, height);

            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, 'rgba(17, 24, 39, 0.95)');
            gradient.addColorStop(1, 'rgba(5, 10, 20, 0.95)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            for (let x = 0; x < width; x += 32) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y < height; y += 32) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            obstaclesRef.current.forEach(o => {
                ctx.beginPath();
                ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(212, 175, 55, 0.08)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
                ctx.stroke();
            });

            players.forEach((p, index) => {
                const pos = positionsRef.current.get(p.id);
                if (!pos) return;
                const bob = Math.sin(time / 240 + index) * 1.2;
                const x = pos.x;
                const y = pos.y + bob;

                ctx.beginPath();
                ctx.ellipse(x, y + PLAYER_RADIUS + 6, PLAYER_RADIUS * 0.9, PLAYER_RADIUS * 0.35, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(x, y, PLAYER_RADIUS, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(x, y, PLAYER_RADIUS - 2, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                ctx.stroke();

                const img = imagesRef.current.get(p.id);
                if (img && img.complete && img.naturalWidth > 0) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(x, y, PLAYER_RADIUS - 4, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(img, x - PLAYER_RADIUS + 4, y - PLAYER_RADIUS + 4, (PLAYER_RADIUS - 4) * 2, (PLAYER_RADIUS - 4) * 2);
                    ctx.restore();
                } else {
                    ctx.fillStyle = 'rgba(0,0,0,0.25)';
                    ctx.beginPath();
                    ctx.arc(x, y, PLAYER_RADIUS - 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 14px "Inter", system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(p.name.charAt(0).toUpperCase(), x, y);
                }

                ctx.beginPath();
                ctx.ellipse(x + PLAYER_RADIUS * 0.35, y - PLAYER_RADIUS * 0.15, PLAYER_RADIUS * 0.45, PLAYER_RADIUS * 0.28, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(226, 232, 240, 0.7)';
                ctx.stroke();

                if (p.id === activeIdRef.current) {
                    ctx.beginPath();
                    ctx.arc(x, y, PLAYER_RADIUS + 5, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(34, 197, 94, 0.9)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.lineWidth = 1;
                }

                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                const label = p.name.split(' ')[0];
                ctx.font = '12px "Inter", system-ui, sans-serif';
                const textWidth = ctx.measureText(label).width;
                const padX = 6;
                const labelW = textWidth + padX * 2;
                const labelH = 18;
                ctx.beginPath();
                ctx.roundRect(x - labelW / 2, y - PLAYER_RADIUS - 22, labelW, labelH, 6);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, x, y - PLAYER_RADIUS - 13);
            });

            animationRef.current = requestAnimationFrame(loop);
        };

        animationRef.current = requestAnimationFrame(loop);
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [players]);

    const handleJoystickPointer = (e: PointerEvent<HTMLDivElement>) => {
        const base = e.currentTarget;
        const rect = base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const dist = Math.hypot(dx, dy);
        const max = JOYSTICK_RADIUS;
        const scale = dist > max ? max / dist : 1;
        const nx = (dx * scale) / max;
        const ny = (dy * scale) / max;
        joystickRef.current = { active: true, x: nx, y: ny };
        setJoystickPos({ x: dx * scale, y: dy * scale });
    };

    const stopJoystick = () => {
        joystickRef.current = { active: false, x: 0, y: 0 };
        setJoystickPos({ x: 0, y: 0 });
    };

    return (
        <section className="arena2d">
            <div className="arena2d-header">
                <div className="arena2d-title">Sala de Tripulación</div>
                <div className="arena2d-controls">
                    <span className="arena2d-label">Controlas a</span>
                    <select
                        className="arena2d-select"
                        value={activeId || ''}
                        onChange={(e) => setActiveId(e.target.value)}
                    >
                        {players.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="arena2d-canvas-wrap" ref={containerRef}>
                <canvas ref={canvasRef} className="arena2d-canvas" />
                <div
                    className="arena2d-joystick"
                    onPointerDown={(e) => {
                        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                        handleJoystickPointer(e);
                    }}
                    onPointerMove={(e) => {
                        if (!joystickRef.current.active) return;
                        handleJoystickPointer(e);
                    }}
                    onPointerUp={stopJoystick}
                    onPointerLeave={stopJoystick}
                >
                    <div className="arena2d-joystick-base">
                        <div
                            className="arena2d-joystick-knob"
                            style={{ transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)` }}
                        />
                    </div>
                </div>
                {loading && <div className="arena2d-loading">Cargando tripulación...</div>}
            </div>
        </section>
    );
};
