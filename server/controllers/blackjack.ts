import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- Types & Helpers ---
interface Card {
    suit: string;
    value: string;
    points: number;
}

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

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

// --- Controllers ---

export const getActiveTables = async (req: Request, res: Response) => {
    try {
        const tables = await prisma.blackjackTable.findMany({
            where: { status: { in: ['WAITING'] } },
            orderBy: { createdAt: 'desc' },
            include: {
                players: { select: { id: true, name: true, avatar: true } }
            },
            take: 20
        });
        res.json(tables);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching tables' });
    }
};

export const updateBet = async (req: Request, res: Response) => {
    const { playerId, amount } = req.body;
    try {
        const player = await prisma.blackjackPlayer.update({
            where: { id: playerId },
            data: { currentBet: amount }
        });
        res.json({ success: true, bet: player.currentBet });
    } catch (error) {
        res.status(500).json({ error: 'Error updating bet' });
    }
};

export const createTable = async (req: Request, res: Response) => {
    try {
        const deck = getDeck();
        const table = await prisma.blackjackTable.create({
            data: {
                deck: JSON.stringify(deck),
                dealerHand: JSON.stringify([]),
                status: 'WAITING'
            }
        });
        res.json({ id: table.id, tableNumber: table.tableNumber });
    } catch (error) {
        res.status(500).json({ error: 'Error creating table' });
    }
};

export const getTableByNumber = async (req: Request, res: Response) => {
    const num = parseInt(req.params.num);
    if (isNaN(num)) return res.status(400).json({ error: 'Invalid table number' });

    try {
        const table = await prisma.blackjackTable.findUnique({
            where: { tableNumber: num },
            include: { players: { orderBy: { seatIndex: 'asc' } } }
        });
        if (!table) return res.status(404).json({ error: 'Table not found' });
        res.json(table);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching table' });
    }
};

export const joinTable = async (req: Request, res: Response) => {
    const { tableId, seatIndex, name, avatar, isBot } = req.body;
    const userId = (req as any).user?.id; // If authenticated

    try {
        const player = await prisma.blackjackPlayer.create({
            data: {
                tableId,
                userId: isBot ? null : userId,
                name: name || 'Invitado',
                avatar,
                isBot: isBot || false,
                seatIndex,
                hands: JSON.stringify([{ cards: [], bet: 0, status: 'WAITING' }]),
                money: 1000
            }
        });
        res.json(player);
    } catch (error) {
        res.status(500).json({ error: 'Error joining table' });
    }
};

export const getTableState = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const table = await prisma.blackjackTable.findUnique({
            where: { id },
            include: { players: { orderBy: { seatIndex: 'asc' } } }
        });
        if (!table) return res.status(404).json({ error: 'Table not found' });
        res.json(table);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching table' });
    }
};

export const dealRound = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const table = await prisma.blackjackTable.findUnique({
            where: { id },
            include: { players: true }
        });

        if (!table) return res.status(404).json({ error: 'Table not found' });

        // Logic to deal cards
        let deck = JSON.parse(table.deck) as Card[];
        if (deck.length < 20) deck = getDeck(); // Reshuffle if low

        const players = table.players;
        const updates = players.map(p => {
            const hand = [deck.pop()!, deck.pop()!];
            return prisma.blackjackPlayer.update({
                where: { id: p.id },
                data: {
                    hands: JSON.stringify([{
                        cards: hand,
                        bet: p.currentBet || 10,
                        status: 'PLAYING',
                        // Allow split if points are same (e.g. 10 and J)
                        canSplit: hand[0].points === hand[1].points
                    }])
                }
            });
        });

        // Dealer Hand
        const dealerHand = [deck.pop()!, deck.pop()!];

        await prisma.$transaction([
            ...updates,
            prisma.blackjackTable.update({
                where: { id },
                data: {
                    deck: JSON.stringify(deck),
                    dealerHand: JSON.stringify(dealerHand),
                    status: 'PLAYING', // Start first turn
                    turnIndex: 0 // Start with first player
                }
            })
        ]);

        res.json({ message: 'Dealt' });
    } catch (error) {
        res.status(500).json({ error: 'Error dealing' });
    }
};

// --- Game Logic ---

export const playerAction = async (req: Request, res: Response) => {
    const { id, action } = req.body; // playerId, action: hit, stand, double, split
    try {
        const player = await prisma.blackjackPlayer.findUnique({
            where: { id },
            include: { table: true }
        });

        if (!player || player.table.turnIndex !== player.seatIndex) {
            return res.status(400).json({ error: 'Not your turn' });
        }

        let hands = JSON.parse(player.hands) as any[];
        // For simplicity, handle active hand (first non-busted/non-stand hand)
        let activeHandIndex = hands.findIndex((h: any) => h.status === 'PLAYING');
        if (activeHandIndex === -1) return res.json({ message: 'Turn over' });

        let hand = hands[activeHandIndex];
        let deck = JSON.parse(player.table.deck) as Card[];

        if (action === 'hit') {
            const card = deck.pop()!;
            hand.cards.push(card);
            if (getScore(hand.cards) > 21) {
                hand.status = 'BUST';
            }
        }
        else if (action === 'stand') {
            hand.status = 'STAND';
        }
        else if (action === 'double') {
            if (player.money < hand.bet) return res.status(400).json({ error: 'No funds' });

            // Deduct money
            await prisma.blackjackPlayer.update({
                where: { id },
                data: { money: { decrement: hand.bet }, currentBet: { increment: hand.bet } }
            });
            hand.bet *= 2;
            const card = deck.pop()!;
            hand.cards.push(card);

            if (getScore(hand.cards) > 21) {
                hand.status = 'BUST';
            } else {
                hand.status = 'STAND'; // Force stand after double
            }
        }
        else if (action === 'split') {
            if (player.money < hand.bet) return res.status(400).json({ error: 'No funds' });

            // Allow split if points are equal (e.g. 10 and K)
            if (hand.cards.length !== 2 || hand.cards[0].points !== hand.cards[1].points) {
                return res.status(400).json({ error: 'Cannot split' });
            }

            // Deduct money for second bet
            await prisma.blackjackPlayer.update({
                where: { id },
                data: { money: { decrement: hand.bet }, currentBet: { increment: hand.bet } }
            });

            // Split cards
            const card1 = hand.cards[0];
            const card2 = hand.cards[1];

            // Create two hands
            const hand1 = { cards: [card1, deck.pop()!], bet: hand.bet, status: 'PLAYING', canSplit: false };
            const hand2 = { cards: [card2, deck.pop()!], bet: hand.bet, status: 'PLAYING', canSplit: false };

            hands = [hand1, hand2]; // Replace single hand with two
            hand = hand1; // Update reference for current logic
        }

        // Save State
        hands[activeHandIndex] = hand; // Update modified hand in array
        if (action === 'split') hands = [hands[0], hands[1]]; // Update explicit split

        // Check if player turn is over (all hands done)
        const stillPlaying = hands.some((h: any) => h.status === 'PLAYING');

        await prisma.blackjackPlayer.update({
            where: { id },
            data: { hands: JSON.stringify(hands) }
        });

        await prisma.blackjackTable.update({
            where: { id: player.tableId },
            data: { deck: JSON.stringify(deck) }
        });

        if (!stillPlaying) {
            // Move to next player
            await advanceTurn(player.tableId);
        }

        res.json({ message: 'Action processed', hands, turnOver: !stillPlaying });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Action failed' });
    }
};

const advanceTurn = async (tableId: string) => {
    const table = await prisma.blackjackTable.findUnique({
        where: { id: tableId },
        include: { players: { orderBy: { seatIndex: 'asc' } } }
    });
    if (!table) return;

    let nextIndex = table.turnIndex + 1;

    if (nextIndex >= table.players.length) {
        // Dealer Turn
        await playDealerTurn(table);
    } else {
        await prisma.blackjackTable.update({
            where: { id: tableId },
            data: { turnIndex: nextIndex }
        });

        // Trigger Bot if next player is bot
        const nextPlayer = table.players[nextIndex];
        if (nextPlayer.isBot) {
            // We can't await this without delaying response, 
            // but dealing with bots usually requires a separate trigger or cron.
            // For this hybrid model, the 'poll' endpoint from the client can trigger bot moves.
        }
    }
};

const playDealerTurn = async (table: any) => {
    let deck = JSON.parse(table.deck) as Card[];
    let dealerHand = JSON.parse(table.dealerHand) as Card[];

    let score = getScore(dealerHand);
    while (score < 17) {
        dealerHand.push(deck.pop()!);
        score = getScore(dealerHand);
    }

    // Resolve Bets
    const players = table.players;
    for (const p of players) {
        const hands = JSON.parse(p.hands);
        let winnings = 0;

        for (const h of hands) {
            const pScore = getScore(h.cards);
            if (h.status !== 'BUST') {
                if (score > 21 || pScore > score) {
                    winnings += h.bet * 2; // Win
                    // Add Blackjack bonus logic here (3:2) if desired
                } else if (pScore === score) {
                    winnings += h.bet; // Push
                }
            }
        }

        if (winnings > 0) {
            await prisma.blackjackPlayer.update({
                where: { id: p.id },
                data: { money: { increment: winnings } }
            });
        }
    }

    await prisma.blackjackTable.update({
        where: { id: table.id },
        data: {
            dealerHand: JSON.stringify(dealerHand),
            deck: JSON.stringify(deck),
            status: 'FINISHED'
        }
    });
};

export const botMove = async (req: Request, res: Response) => {
    // Called by client polling to progress bot turns
    const { tableId } = req.body;
    const table = await prisma.blackjackTable.findUnique({
        where: { id: tableId },
        include: { players: { orderBy: { seatIndex: 'asc' } } }
    });
    if (!table || table.status !== 'PLAYING') return res.json({ msg: 'No bot turn' });

    const currentPlayer = table.players[table.turnIndex];
    if (!currentPlayer || !currentPlayer.isBot) return res.json({ msg: 'Not bot turn' });

    // Simple Bot Logic
    let hands = JSON.parse(currentPlayer.hands);
    let hand = hands.find((h: any) => h.status === 'PLAYING');

    // Safety check
    if (!hand) {
        await advanceTurn(tableId);
        return res.json({ msg: 'Bot skipped (no active hand)' });
    }

    const score = getScore(hand.cards);
    let action = 'stand';

    if (score < 17) action = 'hit';

    // Recurse call to playerAction logic (refactored to internal function ideally, but calling via internal request mock or refactor is needed)
    // For MVP, we'll just simulate the call

    req.body = { id: currentPlayer.id, action };
    return playerAction(req, res);
};
