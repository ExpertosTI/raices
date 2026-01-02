export interface Branch {
    id: string;
    name: string;
    birthDate: string;
    color: string;
    order: number;
    isAlive: boolean;
}

export interface FamilyMember {
    id: string;
    branchId: string;
    name: string;
    birthDate?: string;
    deathDate?: string;
    photo?: string;
    relation: 'PATRIARCH' | 'SIBLING' | 'CHILD' | 'GRANDCHILD' | 'GREAT_GRANDCHILD' | 'SPOUSE' | 'NEPHEW' | 'OTHER';
    isPatriarch: boolean;
    bio?: string;
    parentId?: string;
    preferredColor?: string;
    branch?: Branch;
}

export interface Post {
    id: string;
    content: string;
    imageUrl?: string;
    likes: number;
    user?: {
        name: string | null;
        image: string | null;
    };
    comments: Comment[];
    createdAt: string;
}

export interface Comment {
    id: string;
    content: string;
    user: {
        name: string | null;
        image: string | null;
    };
}
