import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../../components/FloatingDock';
import { getFamilyMembers } from '../../../services/api';
import { soundManager } from '../../../utils/SoundManager';
import type { FamilyMember } from '../../../types';
import './BlackJackGame.css';

// Simple Card Logic
const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

interface Card {
    suit: string;
    value: string;
    points: number;
}

const getDeck = (): Card[] => {
    const deck: Card[] = [];
    SUITS.forEach(suit => {
        VALUES.forEach(value => {
            let points = parseInt(value);
            if (['J', 'Q', 'K'].includes(value)) points = 10;
            if (value === 'A') points = 11;
            deck.push({ suit, value, points });
        });
    });
    return deck.sort(() => 0.5 - Math.random());
};

export const BlackJackGame = () => {
    const navigate = useNavigate();
    const [deck, setDeck] = useState<Card[]>([]);
    const [playerHand, setPlayerHand] = useState<Card[]>([]);
    const [dealerHand, setDealerHand] = useState<Card[]>([]);
    const [gameState, setGameState] = useState<'BET' | 'PLAY' | 'DEALER' | 'OVER'>('BET');
    const [message, setMessage] = useState('');
    const [money, setMoney] = useState(1000);
    const [dealer, setDealer] = useState<FamilyMember | null>(null);
    const [player, setPlayer] = useState<FamilyMember | null>(null);

    // Betting State
    const [bet, setBet] = useState(10);
    const [currentBet, setCurrentBet] = useState(0);

    useEffect(() => {
        getFamilyMembers().then(members => {
            const withPhotos = members.filter(m => m.photo);
            if (withPhotos.length >= 2) {
                const shuffled = withPhotos.sort(() => 0.5 - Math.random());
                setDealer(shuffled[0]);
                setPlayer(shuffled[1]);
            }
        }).catch(console.error);
        // Don't start round automatically, wait for bet
    }, []);

    const placeBet = (amount: number) => {
        if (money >= amount) {
            setBet(amount);
            soundManager.playTone(400, 'sine', 0.1);
        }
    };

    const startNewRound = () => {
        if (money < bet) {
            setMessage('No tienes suficiente dinero.');
            return;
        }
        setMoney(m => m - bet);
        setCurrentBet(bet);
        const newDeck = getDeck();
        setDeck(newDeck);
        setPlayerHand([newDeck.pop()!, newDeck.pop()!]);
        setDealerHand([newDeck.pop()!, newDeck.pop()!]);
        setGameState('PLAY');
        setMessage('');
        soundManager.playTone(600, 'square', 0.05);
    };

    // Level System
    const level = Math.floor(money / 2000) + 1;

    const getScore = (hand: Card[]) => {
        let score = 0;
        let aces = 0;
        hand.forEach(c => {
            score += c.points;
            if (c.value === 'A') aces++;
        });
        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }
        return score;
    };

    const hit = () => {
        const newCard = deck.pop()!;
        const newHand = [...playerHand, newCard];
        setPlayerHand(newHand);
        soundManager.playTone(500, 'sine', 0.1);

        if (getScore(newHand) > 21) {
            setMessage('¡Te pasaste! Dealer gana.');
            soundManager.playGameOver();
            setGameState('OVER');
        }
    };

    const doubleDown = () => {
        if (money < currentBet) {
            setMessage('No tienes fondos para doblar.');
            return;
        }
        setMoney(m => m - currentBet);
        setCurrentBet(b => b * 2);

        // Push one card
        const newCard = deck.pop()!;
        const newHand = [...playerHand, newCard];
        setPlayerHand(newHand);

        soundManager.playTone(800, 'sine', 0.05);

        if (getScore(newHand) > 21) {
            setMessage('¡Te pasaste! Dealer gana.');
            soundManager.playGameOver();
            setGameState('OVER');
        } else {
            // Force stand after double
            stand(newHand);
        }
    };

    const stand = (hand = playerHand) => {
        setGameState('DEALER');
        let dHand = [...dealerHand];
        let dScore = getScore(dHand);
        const currentDeck = [...deck];

        // Dealer AI depends on Level?
        // Level 1: Standard Stand 17
        // Level 2+: Hits Soft 17? (Harder for player)
        // Let's keep it standard for now but maybe cheat for dealer at high levels?

        while (dScore < 17) {
            const card = currentDeck.pop()!;
            dHand.push(card);
            dScore = getScore(dHand);
        }

        setDealerHand(dHand);
        setDeck(currentDeck);

        const pScore = getScore(hand);

        setTimeout(() => {
            if (dScore > 21 || pScore > dScore) {
                setMessage(`¡Ganaste! (+$${currentBet * 2})`);
                soundManager.playLevelUp();
                setMoney(m => m + (currentBet * 2));
            } else if (pScore === dScore) {
                setMessage('Empate. (Devolución)');
                soundManager.playTone(400, 'triangle', 0.2);
                setMoney(m => m + currentBet);
            } else {
                setMessage('Dealer gana.');
                soundManager.playGameOver();
            }
            setGameState('OVER');
        }, 500);
    };

    return (
        <div className="blackjack-screen">
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/utilities')}>←</button>
                <div className="header-info">
                    <h3>Blackjack Familiar</h3>
                    <span className="level-badge">Nivel {level}</span>
                </div>
                <span className="money">${money}</span>
            </header>

            <div className="table-area">
                {/* Dealer Hand */}
                <div className="hand dealer-hand">
                    <div className="hand-header">
                        {dealer && <div className="hand-avatar"><img src={dealer.photo} alt="D" /></div>}
                        <h2>{dealer ? dealer.name.split(' ')[0] : 'Dealer'} ({gameState === 'PLAY' ? '?' : getScore(dealerHand)})</h2>
                    </div>
                    <div className="cards">
                        {dealerHand.map((c, i) => (
                            <div key={i} className={`card ${gameState === 'PLAY' && i === 0 ? 'hidden' : ''} ${['♥', '♦'].includes(c.suit) ? 'red' : ''}`}>
                                {gameState === 'PLAY' && i === 0 ? '?' : `${c.value}${c.suit}`}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="message-area">{message}</div>

                {/* Player Hand */}
                <div className="hand player-hand">
                    <div className="hand-header">
                        {player && <div className="hand-avatar"><img src={player.photo} alt="P" /></div>}
                        <h2>{player ? player.name.split(' ')[0] : 'Tú'} ({getScore(playerHand)})</h2>
                    </div>
                    <div className="cards">
                        {playerHand.map((c, i) => (
                            <div key={i} className={`card ${['♥', '♦'].includes(c.suit) ? 'red' : ''}`}>
                                {c.value}{c.suit}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="controls">
                {gameState === 'BET' ? (
                    <div className="betting-controls">
                        <p>Apuesta: ${bet}</p>
                        <div className="chips">
                            {[10, 50, 100].map(val => (
                                <button key={val} className={`chip-btn ${bet === val ? 'selected' : ''}`} onClick={() => placeBet(val)}>${val}</button>
                            ))}
                        </div>
                        <button className="action-btn deal" onClick={startNewRound}>REPARTIR</button>
                    </div>
                ) : gameState === 'PLAY' ? (
                    <>
                        <div className="play-actions">
                            <button className="action-btn hit" onClick={hit}>Pedir</button>
                            <button className="action-btn stand" onClick={() => stand()}>Plantarse</button>
                            {playerHand.length === 2 && money >= currentBet && (
                                <button className="action-btn double" onClick={doubleDown}>Doblar</button>
                            )}
                        </div>
                        {level >= 2 && (
                            <button
                                className="cheat-btn"
                                onClick={() => {
                                    if (deck.length > 0) {
                                        const next = deck[deck.length - 1];
                                        setMessage(`👁️ Próxima: ${next.value}${next.suit}`);
                                    }
                                }}
                            >
                                👁️ Espiar (Nvl 2+)
                            </button>
                        )}
                    </>
                ) : (
                    <button className="action-btn new" onClick={() => setGameState('BET')}>Nueva Apuesta</button>
                )}
            </div>

            <FloatingDock />
        </div>
    );
};
