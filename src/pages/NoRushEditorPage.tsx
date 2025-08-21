import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import NoRushEditor from '@/components/NoRushEditor';
import { useAuth } from '@/hooks/useAuth';

const NoRushEditorPage = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!taskId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Task</h1>
          <p className="text-muted-foreground">No task ID provided</p>
        </div>
      </div>
    );
  }

  return <NoRushEditor taskId={taskId} />;
};

export default NoRushEditorPage;