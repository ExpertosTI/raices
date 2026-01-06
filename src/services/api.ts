import type { FamilyMember } from '../types';

export const getFamilyMembers = async (): Promise<FamilyMember[]> => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/members', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!response.ok) {
        throw new Error('Failed to fetch members');
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
};

// Angelito API
export const getExchanges = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/exchange', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!response.ok) throw new Error('Failed to fetch exchanges');
    return response.json();
};

export const createExchange = async (data: any) => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/exchange', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create exchange');
    return response.json();
};

export const getExchangeDetails = async (id: string) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/exchange/${id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!response.ok) throw new Error('Failed to fetch exchange details');
    return response.json();
};

export const joinExchange = async (id: string, memberId: string, wishes: string) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/exchange/${id}/join`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ memberId, wishes })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to join exchange');
    }
    return response.json();
};

export const getMyMatch = async (id: string) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/exchange/${id}/my-match`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!response.ok) throw new Error('Failed to fetch match');
    return response.json();
};

export const runMatching = async (id: string) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/exchange/${id}/match`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to run matching');
    }
    return response.json();
};
