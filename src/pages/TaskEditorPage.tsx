import { useParams } from "react-router-dom";
import TaskEditor from "@/components/TaskEditor";

const TaskEditorPage = () => {
  const { taskId } = useParams<{ taskId: string }>();

  if (!taskId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Task</h1>
          <p className="text-muted-foreground">No task ID provided</p>
        </div>
      </div>
    );
  }

  return <TaskEditor taskId={taskId} />;
};

export default TaskEditorPage;