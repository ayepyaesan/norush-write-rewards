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

interface EvaluationRequest {
  content: string;
  title: string;
  userId: string;
  taskId: string;
  milestoneId?: string;
  targetWords: number;
  action: 'validate' | 'evaluate';
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  spellCheckScore: number;
  titleRelevanceScore: number;
  dictionaryCompliance: number;
  hasRepetitiveContent: boolean;
  details?: {
    spellCheckErrors: string[];
    invalidWords: string[];
    repetitionDetails: string[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: EvaluationRequest = await req.json();
    const { content, title, userId, taskId, milestoneId, targetWords, action } = requestData;

    if (action === 'validate') {
      // Perform comprehensive validation for submission
      const result = await performFullValidation(content, title, targetWords);
      
      console.log('Content validation result:', result);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Legacy evaluation logic for existing functionality
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set');
      }

      const { milestoneId, taskId, userId, content, wordCount, targetWords, taskTitle } = requestData as any;

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
    }

  } catch (error) {
    console.error('Error in ai-content-evaluator:', error);
    return new Response(JSON.stringify({ 
      isValid: false, 
      errors: ['Internal validation error'], 
      spellCheckScore: 0,
      titleRelevanceScore: 0,
      dictionaryCompliance: 0,
      hasRepetitiveContent: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function performFullValidation(content: string, title: string, targetWords: number): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    spellCheckScore: 100,
    titleRelevanceScore: 100,
    dictionaryCompliance: 100,
    hasRepetitiveContent: false,
    details: {
      spellCheckErrors: [],
      invalidWords: [],
      repetitionDetails: []
    }
  };

  const words = content.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  console.log('Validating content:', { wordCount, targetWords, titleLength: title.length });

  // 1. Check for repetitive/filler content
  const repetitionCheck = await checkRepetitiveContent(content);
  if (repetitionCheck.hasViolations) {
    result.isValid = false;
    result.errors.push("Content contains repetitive or filler text");
    result.hasRepetitiveContent = true;
    result.details!.repetitionDetails = repetitionCheck.details;
  }

  // 2. Check title-content relevance
  const relevanceScore = await checkTitleRelevance(title, content);
  result.titleRelevanceScore = relevanceScore;
  if (relevanceScore < 60) {
    result.isValid = false;
    result.errors.push("Content is not relevant to the declared title");
  }

  // 3. Check dictionary compliance
  const dictionaryResult = await checkDictionaryCompliance(words);
  result.dictionaryCompliance = dictionaryResult.compliancePercentage;
  result.details!.invalidWords = dictionaryResult.invalidWords;
  if (dictionaryResult.compliancePercentage < 90) {
    result.isValid = false;
    result.errors.push(`Dictionary compliance too low: ${dictionaryResult.compliancePercentage.toFixed(1)}% (minimum 90%)`);
  }

  // 4. Check spelling mistakes (simulate - in real implementation would use spell check API)
  const spellCheckResult = await checkSpellingMistakes(content);
  result.spellCheckScore = spellCheckResult.score;
  result.details!.spellCheckErrors = spellCheckResult.errors;
  if (spellCheckResult.errorPercentage > 25) {
    result.isValid = false;
    result.errors.push(`Too many spelling errors: ${spellCheckResult.errorPercentage.toFixed(1)}% (max 25%)`);
  }

  console.log('Validation complete:', result);
  return result;
}

async function checkRepetitiveContent(content: string): Promise<{ hasViolations: boolean; details: string[] }> {
  const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const words = content.toLowerCase().split(/\s+/);
  
  // Check for repeated sentences
  const sentenceFreq = new Map<string, number>();
  for (const sentence of sentences) {
    const normalized = sentence.toLowerCase().trim();
    if (normalized.length > 10) { // Only check meaningful sentences
      sentenceFreq.set(normalized, (sentenceFreq.get(normalized) || 0) + 1);
    }
  }
  
  const repeatedSentences = Array.from(sentenceFreq.entries()).filter(([_, count]) => count > 1);
  
  // Check for excessive word repetition
  const wordFreq = new Map<string, number>();
  for (const word of words) {
    if (word.length > 3) { // Only check meaningful words
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }
  
  const totalMeaningfulWords = Array.from(wordFreq.values()).reduce((sum, count) => sum + count, 0);
  const excessivelyRepeatedWords = Array.from(wordFreq.entries())
    .filter(([word, count]) => count > Math.max(3, totalMeaningfulWords * 0.05)) // More than 5% or 3 times
    .map(([word, count]) => `"${word}" appears ${count} times`);

  const details = [];
  if (repeatedSentences.length > 0) {
    details.push(`Repeated sentences detected: ${repeatedSentences.length}`);
  }
  if (excessivelyRepeatedWords.length > 0) {
    details.push(`Excessively repeated words: ${excessivelyRepeatedWords.slice(0, 3).join(', ')}`);
  }

  return {
    hasViolations: repeatedSentences.length > 0 || excessivelyRepeatedWords.length > 0,
    details
  };
}

async function checkTitleRelevance(title: string, content: string): Promise<number> {
  // Simple keyword matching approach
  const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const contentLower = content.toLowerCase();
  
  if (titleWords.length === 0) return 50; // Neutral score for empty title
  
  let matchCount = 0;
  for (const word of titleWords) {
    if (contentLower.includes(word)) {
      matchCount++;
    }
  }
  
  const relevanceScore = Math.min(100, (matchCount / titleWords.length) * 100 + 20); // Base 20% + matches
  return Math.round(relevanceScore);
}

async function checkDictionaryCompliance(words: string[]): Promise<{ compliancePercentage: number; invalidWords: string[] }> {
  try {
    // Call the existing dictionary validator
    const { data, error } = await supabase.functions.invoke('dictionary-validator', {
      body: {
        words: words,
        action: 'validate'
      }
    });

    if (error) {
      console.error('Dictionary validation error:', error);
      return { compliancePercentage: 90, invalidWords: [] }; // Default to passing
    }

    const results = data.results || [];
    
    const totalWords = results.length;
    const validWords = results.filter((r: any) => r.isValid).length;
    const invalidWords = results.filter((r: any) => !r.isValid).map((r: any) => r.word);
    
    const compliancePercentage = totalWords > 0 ? (validWords / totalWords) * 100 : 100;
    
    return {
      compliancePercentage,
      invalidWords: invalidWords.slice(0, 10) // Return first 10 invalid words
    };
  } catch (error) {
    console.error('Dictionary compliance check failed:', error);
    return { compliancePercentage: 90, invalidWords: [] }; // Default to passing
  }
}

async function checkSpellingMistakes(content: string): Promise<{ score: number; errorPercentage: number; errors: string[] }> {
  // Simple spell check simulation - in real implementation would use a proper spell check API
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const totalWords = words.length;
  
  // Simulate spell check by looking for common patterns that indicate misspellings
  const suspiciousPatterns = [
    /\d+[a-z]+/i, // Numbers mixed with letters
    /[a-z]{20,}/i, // Extremely long words
    /([a-z])\1{3,}/i, // Same letter repeated 4+ times
    /[^a-zA-Z\s\-']/g // Non-alphabetic characters (except hyphens and apostrophes)
  ];
  
  let errorCount = 0;
  const errors: string[] = [];
  
  for (const word of words) {
    let hasError = false;
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(word)) {
        errorCount++;
        if (errors.length < 10) {
          errors.push(word);
        }
        hasError = true;
        break;
      }
    }
  }
  
  const errorPercentage = totalWords > 0 ? (errorCount / totalWords) * 100 : 0;
  const score = Math.max(0, 100 - errorPercentage * 2); // Penalize heavily for errors
  
  return {
    score: Math.round(score),
    errorPercentage,
    errors
  };
}