// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
//
// import TwoColumnLayout from "../components/layout/TwoColumnLayout";
// import TaskSidebar from "../components/taskComponents/TaskSidebar";
// import ScheduleView from "../components/scheduleComponents/ScheduleView";
// import TaskActionModal from "../components/modal/TaskActionModal";
//
// import { getTasks } from "../api/TaskApi";
// import { getSchedule } from "../api/ScheduleApi";
//
// import type { Task } from "../types/Task";
// import type { ScheduleBlock } from "../types/ScheduleBlock";
//
// export default function TimerPage() {
//     const [tasks, setTasks] = useState<Task[]>([]);
//     const [schedule, setSchedule] = useState<ScheduleBlock[]>([]);
//     const [activeItem, setActiveItem] = useState<Task | ScheduleBlock | null>(null);
//
//     const navigate = useNavigate();
//
//     useEffect(() => {
//         getTasks().then(setTasks);
//         getSchedule().then(setSchedule);
//     }, []);
//
//     return (
//         <>
//             <TwoColumnLayout
//                 left={
//                     <TaskSidebar
//                         tasks={tasks}
//                         mode="timer"
//                         onSelectTask={setActiveItem}
//                     />
//                 }
//                 right={
//                     <ScheduleView
//                         schedule={schedule}
//                         onBlockClick={setActiveItem}
//                     />
//                 }
//             />
//
//             {activeItem && (
//                 <TaskActionModal
//                     item={activeItem}
//                     onClose={() => setActiveItem(null)}
//
//                     onStart={async (item) => {
//                         console.log("START SESSION FROM:", item);
//
//                         // 🔥 NEXT STEP: replace with API call
//                         const fakeSessionId = "123";
//
//                         navigate(`/timer/${fakeSessionId}`);
//                     }}
//
//                     onAutomate={async (item) => {
//                         console.log("AUTOMATE SESSION FROM:", item);
//
//                         const fakeSessionId = "123";
//
//                         navigate(`/timer/${fakeSessionId}`);
//                     }}
//                 />
//             )}
//         </>
//     );
// }