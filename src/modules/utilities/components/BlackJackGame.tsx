import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../../components/FloatingDock';
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

    useEffect(() => {
        startNewRound();
    }, []);

    const startNewRound = () => {
        const newDeck = getDeck();
        setDeck(newDeck);
        setPlayerHand([newDeck.pop()!, newDeck.pop()!]);
        setDealerHand([newDeck.pop()!, newDeck.pop()!]);
        setGameState('PLAY');
        setMessage('');
    };

    const getScore = (hand: Card[]) => {
        let score = hand.reduce((acc, card) => acc + card.points, 0);
        let aces = hand.filter(c => c.value === 'A').length;
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
        setDeck([...deck]);

        if (getScore(newHand) > 21) {
            setMessage('¡Te pasaste! Dealer gana.');
            setGameState('OVER');
        }
    };

    const stand = () => {
        setGameState('DEALER');
        // Dealer AI
        let dHand = [...dealerHand];
        let dScore = getScore(dHand);
        const currentDeck = [...deck];

        while (dScore < 17) {
            const card = currentDeck.pop()!;
            dHand.push(card);
            dScore = getScore(dHand);
        }

        setDealerHand(dHand);
        setDeck(currentDeck);

        const pScore = getScore(playerHand);
        if (dScore > 21 || pScore > dScore) {
            setMessage('¡Ganaste!');
            setMoney(m => m + 100);
        } else if (pScore === dScore) {
            setMessage('Empate.');
        } else {
            setMessage('Dealer gana.');
            setMoney(m => m - 50);
        }
        setGameState('OVER');
    };

    return (
        <div className="blackjack-screen">
            <header className="game-header">
                <button className="back-btn" onClick={() => navigate('/utilities')}>←</button>
                <h3>Blackjack Familiar</h3>
                <span className="money">${money}</span>
            </header>

            <div className="table-area">
                <div className="hand dealer-hand">
                    <h2>Dealer ({gameState === 'PLAY' ? '?' : getScore(dealerHand)})</h2>
                    <div className="cards">
                        {dealerHand.map((c, i) => (
                            <div key={i} className={`card ${gameState === 'PLAY' && i === 0 ? 'hidden' : ''} ${['♥', '♦'].includes(c.suit) ? 'red' : ''}`}>
                                {gameState === 'PLAY' && i === 0 ? '?' : `${c.value}${c.suit}`}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="message-area">{message}</div>

                <div className="hand player-hand">
                    <h2>Tú ({getScore(playerHand)})</h2>
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
                {gameState === 'PLAY' ? (
                    <>
                        <button className="action-btn hit" onClick={hit}>Pedir</button>
                        <button className="action-btn stand" onClick={stand}>Plantarse</button>
                    </>
                ) : (
                    <button className="action-btn new" onClick={startNewRound}>Otra Mano</button>
                )}
            </div>

            <FloatingDock />
        </div>
    );
};
