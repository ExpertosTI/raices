import { useNavigate } from 'react-router-dom';
import './SelectionScreen.css';

const SIBLINGS = [
    { id: 1, name: 'Lorenza Antonia', date: '09/08/1947', color: '#DC2626', photo: '/img/Antonia.jpg' },
    { id: 2, name: 'Carmen Josefa', date: '28/09/1950', color: '#EA580C', photo: null },
    { id: 3, name: 'Andrea Altagracia', date: '01/10/1952', color: '#D97706', photo: null },
    { id: 4, name: 'Mercedes', date: '08/01/1954', color: '#CA8A04', photo: null },
    { id: 5, name: 'Carlos Alfonso', date: '15/08/1958', color: '#65A30D', photo: null },
    { id: 6, name: 'José Ignacio', date: '02/08/1960', color: '#16A34A', photo: null },
    { id: 7, name: 'Julio César', date: '15/04/1962', color: '#0D9488', photo: null },
    { id: 8, name: 'Xiomara', date: '12/10/1963', color: '#0891B2', photo: null },
    { id: 9, name: 'Bernarda', date: '16/07/1965', color: '#2563EB', photo: '/img/bernarda.jpg' },
    { id: 10, name: 'Yoni Antonio', date: '16/02/1967', color: '#7C3AED', photo: null },
    { id: 11, name: 'Roberto de Jesús', date: '16/06/1969', color: '#C026D3', photo: '/img/robertyerick.jpg' },
    { id: 12, name: 'Erick Manuel', date: '05/10/1974', color: '#DB2777', photo: '/img/erick.jpg' },
];

export const SelectionScreen: React.FC = () => {
    const navigate = useNavigate();

    const handleSelect = (sibling: typeof SIBLINGS[0]) => {
        localStorage.setItem('raices_selected_branch', JSON.stringify(sibling));
        navigate('/app', { state: { branchId: sibling.id } });
    };

    const getEmoji = (index: number) => {
        return (index < 4 || index === 7 || index === 8) ? '👩' : '👨';
    };

    const adjustColor = (color: string) => {
        // Darken color for gradient
        return color.replace(/^#/, '').match(/.{2}/g)?.map(c =>
            Math.max(0, parseInt(c, 16) - 80).toString(16).padStart(2, '0')
        ).join('') || '000000';
    };

    return (
        <div className="selection-screen active">
            <div className="selection-header">
                {/* Founders Photo */}
                <div className="founders-section">
                    <div className="founder-wrapper">
                        <img
                            src="/img/familiacopleta.jpg"
                            alt="Los Patriarcas"
                            className="founder-photo"
                        />
                        <p className="founder-name">Los Patriarcas</p>
                    </div>
                </div>

                <h1 className="selection-title">¿De quién desciendes?</h1>
                <p className="selection-subtitle">Selecciona tu rama del árbol familiar</p>
                <p className="family-motto">"Unidos por la sangre, juntos por amor"</p>
            </div>

            {/* 12 Children Grid */}
            <div className="children-grid">
                {SIBLINGS.map((sibling, index) => (
                    <div
                        key={sibling.id}
                        className="child-card"
                        style={{
                            background: `linear-gradient(135deg, ${sibling.color}, #${adjustColor(sibling.color)})`
                        }}
                        onClick={() => handleSelect(sibling)}
                    >
                        {sibling.photo ? (
                            <img
                                src={sibling.photo}
                                alt={sibling.name}
                                className="child-photo"
                            />
                        ) : (
                            <div className="child-placeholder">
                                {getEmoji(index)}
                            </div>
                        )}
                        <span className="child-name">{sibling.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
