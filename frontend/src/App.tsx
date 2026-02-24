import { useEffect, useState } from "react";
import type Task from "./interfaces/task";

function App() {
    const [tasks, setTasks] = useState<Task[]>([]);
    console.log("Backend URL:", import.meta.env.VITE_BACKEND_URL);

    useEffect(() => {
        fetch(`${import.meta.env.VITE_BACKEND_URL}/bertha`)
            .then(res => res.json())
            .then(data => {
                setTasks(data);
            })
            .catch(err => console.error("Error:", err));
    }, []);

    return (
        <div>
            <h1>Bertha Tasks</h1>
            {tasks.map(task => (
                <div key={task.id}>
                    <p>{task.Task} — Importance: {task.Importance}</p>
                </div>
            ))}
        </div>
    );
}

export default App;