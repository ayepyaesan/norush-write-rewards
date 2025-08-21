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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const { milestoneId, taskId, userId, content, wordCount, targetWords, taskTitle } = await req.json();

    console.log('Evaluating content for milestone:', milestoneId);

    // Strip HTML and get clean text for analysis
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    const actualWordCount = cleanContent.split(/\s+/).filter(word => word.length > 0).length;

    console.log('Actual word count:', actualWordCount, 'Target:', targetWords);

    // AI Content Quality Analysis
    const aiPrompt = `You are an AI content evaluator for a writing task monitoring system. Analyze the following text submission and provide a comprehensive evaluation.

Task Title: "${taskTitle}"
Target Word Count: ${targetWords}
Actual Word Count: ${actualWordCount}
Content: "${cleanContent}"

Evaluate based on these criteria:
1. WORD COUNT COMPLIANCE: Does it meet the target word count (including any carried-over deficit)?
2. CONTENT QUALITY: Is the content meaningful, relevant, and well-written?
3. SPAM/FILLER DETECTION: Does it contain repetitive sentences, meaningless filler, or copy-pasted content?
4. RELEVANCE: Is the content relevant to the task title?
5. ORIGINALITY: Does it appear to be original writing (not obviously copied)?

Provide your response in this exact JSON format:
{
  "verdict": "target_met" or "target_not_met",
  "wordCountCompliant": true/false,
  "qualityScore": 0-100,
  "ruleViolations": ["list of specific violations"],
  "qualityChecks": {
    "hasSpam": true/false,
    "hasRepetition": true/false,
    "isRelevant": true/false,
    "isOriginal": true/false
  },
  "reasoning": "Detailed explanation of your evaluation",
  "flaggedIssues": ["list of serious issues requiring admin review"],
  "recommendations": "Suggestions for improvement"
}

Be strict in your evaluation. Mark as "target_not_met" if:
- Word count is significantly below target (more than 10% deficit)
- Content contains obvious spam, filler, or repetition
- Content is not relevant to the task
- Content appears to be copied/plagiarized
- Content quality is extremely poor`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: 'You are a strict content evaluator that ensures writing quality and compliance with rules.' },
          { role: 'user', content: aiPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices[0].message.content;
    
    console.log('AI Response:', aiResponse);

    let evaluation;
    try {
      evaluation = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback evaluation if AI response is malformed
      evaluation = {
        verdict: actualWordCount >= targetWords ? "target_met" : "target_not_met",
        wordCountCompliant: actualWordCount >= targetWords,
        qualityScore: 50,
        ruleViolations: ["AI response parsing failed"],
        qualityChecks: {
          hasSpam: false,
          hasRepetition: false,
          isRelevant: true,
          isOriginal: true
        },
        reasoning: "Automated evaluation due to AI parsing error",
        flaggedIssues: ["AI evaluation failed - requires manual review"],
        recommendations: "Manual review recommended"
      };
    }

    // Calculate words deficit for next day
    const wordsDeficit = Math.max(0, targetWords - actualWordCount);
    const shouldFlag = evaluation.flaggedIssues.length > 0 || 
                      evaluation.qualityScore < 30 || 
                      evaluation.ruleViolations.length > 2;

    // Save evaluation to database
    const { data: evaluationData, error: evalError } = await supabase
      .from('daily_evaluations')
      .insert({
        task_id: taskId,
        user_id: userId,
        milestone_id: milestoneId,
        content_analyzed: cleanContent,
        word_count_actual: actualWordCount,
        word_count_target: targetWords,
        rule_violations: evaluation.ruleViolations,
        quality_checks: evaluation.qualityChecks,
        ai_verdict: evaluation.verdict,
        ai_reasoning: evaluation.reasoning,
        flagged_issues: evaluation.flaggedIssues
      })
      .select()
      .single();

    if (evalError) {
      console.error('Error saving evaluation:', evalError);
      throw evalError;
    }

    // Calculate next day target with carry-over deficit
    const { data: nextTargetData } = await supabase
      .rpc('calculate_next_day_target', {
        p_task_id: taskId,
        p_current_day: 1, // This should be the actual current day
        p_words_written: actualWordCount,
        p_daily_target: targetWords
      });

    // Update milestone with evaluation results
    const { error: updateError } = await supabase
      .from('daily_milestones')
      .update({
        evaluation_status: evaluation.verdict,
        rule_compliance: evaluation.qualityChecks,
        ai_feedback: evaluation.reasoning,
        content_quality_score: evaluation.qualityScore,
        words_deficit: wordsDeficit,
        next_day_target: nextTargetData || (targetWords + wordsDeficit),
        flagged_for_review: shouldFlag,
        evaluated_at: new Date().toISOString()
      })
      .eq('id', milestoneId);

    if (updateError) {
      console.error('Error updating milestone:', updateError);
      throw updateError;
    }

    console.log('Evaluation completed successfully');

    return new Response(JSON.stringify({
      success: true,
      evaluation: {
        verdict: evaluation.verdict,
        qualityScore: evaluation.qualityScore,
        wordCountCompliant: evaluation.wordCountCompliant,
        ruleViolations: evaluation.ruleViolations,
        reasoning: evaluation.reasoning,
        flaggedForReview: shouldFlag,
        wordsDeficit,
        nextDayTarget: nextTargetData || (targetWords + wordsDeficit)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-content-evaluator:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});