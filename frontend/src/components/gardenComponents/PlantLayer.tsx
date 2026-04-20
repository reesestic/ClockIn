// PlantLayer.tsx

export default function PlantLayer() {
    return (
        <>
            {/* 🌱 Example plant 1 */}
            <div
                className="plant"
                style={{
                    left: `${(820 / 4948) * 100}%`,
                    top: `${(322 / 1024) * 100}%`,
                }}
            />

            {/* 🌱 Example plant 2 (locked) */}
            <div
                className="plant locked"
                style={{
                    left: `${(2185 / 4948) * 100}%`,
                    top: `${(325 / 1024) * 100}%`,
                }}
            />
        </>
    );
}