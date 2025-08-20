import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RichTextEditor } from '@/components/RichTextEditor';
import AccessGate from '@/components/AccessGate';

const RichTextEditorPage = () => {
  const navigate = useNavigate();
  const { taskId } = useParams();

  const handleClose = () => {
    if (taskId) {
      navigate(`/task/${taskId}`);
    } else {
      navigate('/dashboard');
    }
  };

  if (taskId) {
    return (
      <AccessGate taskId={taskId}>
        <RichTextEditor 
          onClose={handleClose} 
          taskName={`Task-${taskId}`}
        />
      </AccessGate>
    );
  }

  return (
    <RichTextEditor 
      onClose={handleClose} 
      taskName="NoRush Document"
    />
  );
};

export default RichTextEditorPage;