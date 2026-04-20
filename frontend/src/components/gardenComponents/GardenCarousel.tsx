import { useState, useEffect } from "react";
import GardenSlice from "./GardenSlice";
import "./Garden.css";

export default function GardenCarousel() {
    const [index, setIndex] = useState(0);
    const [sliceWidth, setSliceWidth] = useState(1800);

    // 🔥 dynamic width based on screen
    useEffect(() => {
        function update() {
            const aspect = window.innerWidth / window.innerHeight;
            setSliceWidth(1024 * aspect);
        }

        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    // offsets spaced for smooth panning
    const OFFSETS = [
        0,
        1000,
        2000,
        3000
    ];

    function next() {
        setIndex((prev) => (prev + 1) % OFFSETS.length);
    }

    function prev() {
        setIndex((prev) => (prev - 1 + OFFSETS.length) % OFFSETS.length);
    }

    return (
        <div className="garden-root">

            <button className="nav left" onClick={prev}>‹</button>
            <button className="nav right" onClick={next}>›</button>

            <div
                className="track"
                style={{
                    transform: `translateX(-${index * 100}vw)`
                }}
            >
                {OFFSETS.map((offset, i) => (
                    <div className="section" key={i}>
                        <GardenSlice offset={offset} width={sliceWidth} />
                    </div>
                ))}
            </div>
        </div>
    );
}