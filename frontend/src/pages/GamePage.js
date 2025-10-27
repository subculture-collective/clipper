import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
import { Container } from '../components';
export function GamePage() {
    const { gameId } = useParams();
    return (_jsxs(Container, { className: "py-8", children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-3xl font-bold mb-2", children: "Game Clips" }), _jsxs("p", { className: "text-muted-foreground", children: ["Viewing clips for game ID: ", gameId] })] }), _jsxs("div", { className: "text-center text-muted-foreground py-12", children: [_jsx("p", { className: "text-lg", children: "Game-filtered clips coming soon..." }), _jsx("p", { className: "text-sm mt-2", children: "This is a placeholder for game-specific clips." })] })] }));
}
