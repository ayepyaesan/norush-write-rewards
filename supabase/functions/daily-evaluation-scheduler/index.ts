import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting daily evaluation scheduler...');

    // Get all active tasks with pending milestones for today or past days
    const today = new Date().toISOString().split('T')[0];
    
    const { data: pendingMilestones, error: fetchError } = await supabase
      .from('daily_milestones')
      .select(`
        id,
        task_id,
        user_id,
        day_number,
        target_date,
        required_words,
        words_written,
        evaluation_status,
        task_files!inner(content, word_count)
      `)
      .eq('evaluation_status', 'pending')
      .lte('target_date', today)
      .not('task_files.content', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${pendingMilestones?.length || 0} pending milestones to evaluate`);

    if (!pendingMilestones || pendingMilestones.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending milestones to evaluate',
        evaluated: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let evaluatedCount = 0;
    const results = [];

    // Process each pending milestone
    for (const milestone of pendingMilestones) {
      try {
        // Get task details for context
        const { data: task } = await supabase
          .from('tasks')
          .select('task_name')
          .eq('id', milestone.task_id)
          .single();

        // Get the content for this day
        const { data: taskFile } = await supabase
          .from('task_files')
          .select('content, word_count')
          .eq('task_id', milestone.task_id)
          .eq('day_number', milestone.day_number)
          .single();

        if (!taskFile || !taskFile.content) {
          console.log(`No content found for milestone ${milestone.id}, skipping...`);
          continue;
        }

        // Call the AI evaluator function
        const evaluationResponse = await supabase.functions.invoke('ai-content-evaluator', {
          body: {
            milestoneId: milestone.id,
            taskId: milestone.task_id,
            userId: milestone.user_id,
            content: taskFile.content,
            wordCount: taskFile.word_count,
            targetWords: milestone.required_words,
            taskTitle: task?.task_name || 'Unknown Task'
          }
        });

        if (evaluationResponse.error) {
          throw evaluationResponse.error;
        }

        const result = await evaluationResponse.data;
        results.push({
          milestoneId: milestone.id,
          result: result.evaluation?.verdict || 'error',
          qualityScore: result.evaluation?.qualityScore || 0
        });

        evaluatedCount++;
        console.log(`Evaluated milestone ${milestone.id}: ${result.evaluation?.verdict}`);

      } catch (error) {
        console.error(`Error evaluating milestone ${milestone.id}:`, error);
        results.push({
          milestoneId: milestone.id,
          result: 'error',
          error: error.message
        });
      }
    }

    console.log(`Daily evaluation completed: ${evaluatedCount} milestones evaluated`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Evaluated ${evaluatedCount} milestones`,
      evaluated: evaluatedCount,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in daily-evaluation-scheduler:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});