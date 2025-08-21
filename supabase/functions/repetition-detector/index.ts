import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      content, 
      existingContent, 
      userId, 
      taskId, 
      milestoneId,
      checkType 
    } = await req.json();

    if (!content || !userId || !taskId) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const violations = [];

    // Word-level repetition check
    if (checkType === 'word' || checkType === 'all') {
      const wordViolations = checkWordRepetition(content);
      violations.push(...wordViolations);
    }

    // Sentence-level repetition check
    if (checkType === 'sentence' || checkType === 'all') {
      const sentenceViolations = checkSentenceRepetition(content, existingContent);
      violations.push(...sentenceViolations);
    }

    // Paragraph-level repetition check
    if (checkType === 'paragraph' || checkType === 'all') {
      const paragraphViolations = checkParagraphRepetition(content, existingContent);
      violations.push(...paragraphViolations);
    }

    // Log violations for admin monitoring
    if (violations.length > 0) {
      await supabase.from('daily_evaluations').insert({
        user_id: userId,
        task_id: taskId,
        milestone_id: milestoneId,
        evaluation_date: new Date().toISOString().split('T')[0],
        content_analyzed: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
        word_count_actual: content.split(/\s+/).length,
        word_count_target: 0,
        ai_verdict: 'repetition_violation',
        ai_reasoning: `Repetition detected: ${violations.map(v => v.type).join(', ')}`,
        rule_violations: JSON.stringify(violations)
      });
    }

    return new Response(JSON.stringify({ 
      violations,
      isValid: violations.length === 0,
      message: violations.length > 0 ? 
        `Repetition detected: ${violations[0].message}` : 
        'Content passed repetition checks'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in repetition-detector function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function checkWordRepetition(content: string) {
  const violations = [];
  const words = content.toLowerCase().split(/\s+/).filter(word => word.length > 0);
  const wordCounts = new Map();

  // Count word occurrences
  for (const word of words) {
    const cleanWord = word.replace(/[^\w]/g, '');
    if (cleanWord.length > 2) { // Only check words longer than 2 characters
      wordCounts.set(cleanWord, (wordCounts.get(cleanWord) || 0) + 1);
    }
  }

  // Check for excessive repetition
  for (const [word, count] of wordCounts.entries()) {
    const threshold = Math.max(3, Math.floor(words.length / 20)); // Max 5% repetition or 3 times
    if (count > threshold) {
      violations.push({
        type: 'word_repetition',
        word,
        count,
        threshold,
        message: `Word "${word}" repeated ${count} times (limit: ${threshold})`
      });
    }
  }

  return violations;
}

function checkSentenceRepetition(content: string, existingContent: string = '') {
  const violations = [];
  const allContent = existingContent + '\n' + content;
  const sentences = allContent.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 10);
  
  const newSentences = content.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 10);
  const existingSentences = existingContent.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 10);

  for (const newSentence of newSentences) {
    for (const existingSentence of existingSentences) {
      const similarity = calculateSimilarity(newSentence, existingSentence);
      if (similarity >= 0.85) {
        violations.push({
          type: 'sentence_repetition',
          similarity,
          sentence: newSentence.substring(0, 50) + '...',
          message: `Sentence is ${Math.round(similarity * 100)}% similar to previous content`
        });
        break;
      }
    }
  }

  return violations;
}

function checkParagraphRepetition(content: string, existingContent: string = '') {
  const violations = [];
  const newParagraphs = content.split(/\n\s*\n/).map(p => p.trim().toLowerCase()).filter(p => p.length > 50);
  const existingParagraphs = existingContent.split(/\n\s*\n/).map(p => p.trim().toLowerCase()).filter(p => p.length > 50);

  for (const newParagraph of newParagraphs) {
    for (const existingParagraph of existingParagraphs) {
      const similarity = calculateSimilarity(newParagraph, existingParagraph);
      if (similarity >= 0.70) {
        violations.push({
          type: 'paragraph_repetition',
          similarity,
          paragraph: newParagraph.substring(0, 100) + '...',
          message: `Paragraph is ${Math.round(similarity * 100)}% similar to previous content`
        });
        break;
      }
    }
  }

  return violations;
}

function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.split(/\s+/));
  const words2 = new Set(text2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}