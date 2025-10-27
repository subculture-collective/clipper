import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export function TwitchEmbed({ clipId, autoplay = false, muted = true, thumbnailUrl, title = 'Twitch Clip' }) {
    const [isLoaded, setIsLoaded] = useState(autoplay);
    const [hasError, setHasError] = useState(false);
    // Get the parent domain for Twitch embed
    const parentDomain = typeof window !== 'undefined'
        ? window.location.hostname
        : 'localhost';
    const embedUrl = `https://clips.twitch.tv/embed?clip=${clipId}&parent=${parentDomain}&autoplay=${autoplay}&muted=${muted}`;
    const handleLoadClick = () => {
        setIsLoaded(true);
    };
    const handleError = () => {
        setHasError(true);
    };
    if (hasError) {
        return (_jsx("div", { className: "relative w-full pt-[56.25%] bg-neutral-900 rounded-lg flex items-center justify-center", children: _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center text-white p-4", children: [_jsx("svg", { className: "w-12 h-12 mb-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }), _jsx("p", { className: "text-sm text-center", children: "This clip is no longer available" }), _jsx("a", { href: `https://clips.twitch.tv/${clipId}`, target: "_blank", rel: "noopener noreferrer", className: "mt-2 text-primary-400 hover:text-primary-300 text-sm underline", children: "Try viewing on Twitch" })] }) }));
    }
    if (!isLoaded) {
        return (_jsxs("div", { className: "relative w-full pt-[56.25%] bg-black rounded-lg cursor-pointer group overflow-hidden", onClick: handleLoadClick, children: [thumbnailUrl && (_jsx("img", { src: thumbnailUrl, alt: title, className: "absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" })), _jsx("div", { className: "absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-60 transition-all flex items-center justify-center", children: _jsx("div", { className: "w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform", children: _jsx("svg", { className: "w-8 h-8 text-black ml-1", fill: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { d: "M8 5v14l11-7z" }) }) }) }), _jsx("div", { className: "absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity", children: "Watch Clip" })] }));
    }
    return (_jsx("div", { className: "relative w-full pt-[56.25%] bg-black rounded-lg overflow-hidden", children: _jsx("iframe", { src: embedUrl, className: "absolute inset-0 w-full h-full", allowFullScreen: true, title: title, onError: handleError }) }));
}
