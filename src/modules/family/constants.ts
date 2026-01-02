export interface BranchConstant {
    id: number;
    name: string;
    birthDate: string;
    color: string;
    order: number;
}

export const FAMILY_BRANCHES: BranchConstant[] = [
    { id: 1, name: 'Lorenza Antonia', birthDate: '09/08/1947', color: '#DC2626', order: 1 },
    { id: 2, name: 'Carmen Josefa', birthDate: '28/09/1950', color: '#EA580C', order: 2 },
    { id: 3, name: 'Andrea Altagracia', birthDate: '01/10/1952', color: '#D97706', order: 3 },
    { id: 4, name: 'Mercedes', birthDate: '08/01/1954', color: '#CA8A04', order: 4 },
    { id: 5, name: 'Carlos Alfonso', birthDate: '15/08/1958', color: '#65A30D', order: 5 },
    { id: 6, name: 'José Ignacio', birthDate: '02/08/1960', color: '#16A34A', order: 6 },
    { id: 7, name: 'Julio César', birthDate: '15/04/1962', color: '#0D9488', order: 7 },
    { id: 8, name: 'Xiomara', birthDate: '12/10/1963', color: '#0891B2', order: 8 },
    { id: 9, name: 'Bernarda', birthDate: '16/07/1965', color: '#2563EB', order: 9 },
    { id: 10, name: 'Yoni Antonio', birthDate: '16/02/1967', color: '#7C3AED', order: 10 },
    { id: 11, name: 'Roberto de Jesús', birthDate: '16/06/1969', color: '#C026D3', order: 11 },
    { id: 12, name: 'Erick Manuel', birthDate: '05/10/1974', color: '#DB2777', order: 12 }
];
