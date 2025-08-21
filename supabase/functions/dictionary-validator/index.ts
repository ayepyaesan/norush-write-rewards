import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const oxfordApiKey = Deno.env.get('OXFORD_DICTIONARY_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { words, userId, taskId, milestoneId, action } = await req.json();
    
    if (!words || !Array.isArray(words) || words.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid words array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const results = [];

    // Dictionary validation for each word
    for (const word of words) {
      const cleanWord = word.toLowerCase().trim();
      
      // Skip empty words, numbers, and punctuation-only strings
      if (!cleanWord || /^\d+$/.test(cleanWord) || /^[^\w]+$/.test(cleanWord)) {
        results.push({ word, isValid: true, reason: 'skipped' });
        continue;
      }

      let isValid = false;
      let reason = '';

      try {
        // Use Oxford Dictionary API if available
        if (oxfordApiKey) {
          const response = await fetch(
            `https://od-api.oxforddictionaries.com/api/v2/entries/en-us/${encodeURIComponent(cleanWord)}`,
            {
              headers: {
                'app_id': 'your_app_id', // Replace with actual app_id
                'app_key': oxfordApiKey,
              },
            }
          );

          if (response.ok) {
            isValid = true;
            reason = 'oxford_dictionary';
          } else if (response.status === 404) {
            isValid = false;
            reason = 'not_in_oxford_dictionary';
          } else {
            // Fallback to basic English word validation
            isValid = await validateWithBasicWordList(cleanWord);
            reason = isValid ? 'basic_wordlist' : 'not_in_basic_wordlist';
          }
        } else {
          // Fallback to basic English word validation
          isValid = await validateWithBasicWordList(cleanWord);
          reason = isValid ? 'basic_wordlist' : 'not_in_basic_wordlist';
        }
      } catch (error) {
        console.error(`Error validating word "${cleanWord}":`, error);
        // Fallback to basic validation
        isValid = await validateWithBasicWordList(cleanWord);
        reason = isValid ? 'basic_wordlist_fallback' : 'validation_error';
      }

      results.push({ word, isValid, reason });
    }

    // Log validation attempts for admin monitoring
    if (userId && taskId && action) {
      const invalidWords = results.filter(r => !r.isValid);
      
      if (invalidWords.length > 0) {
        await supabase.from('daily_evaluations').insert({
          user_id: userId,
          task_id: taskId,
          milestone_id: milestoneId,
          evaluation_date: new Date().toISOString().split('T')[0],
          content_analyzed: `Invalid words attempted: ${invalidWords.map(w => w.word).join(', ')}`,
          word_count_actual: words.length,
          word_count_target: 0,
          ai_verdict: 'dictionary_violation',
          ai_reasoning: `User attempted to use ${invalidWords.length} invalid words: ${invalidWords.map(w => w.word).join(', ')}`,
          rule_violations: JSON.stringify([{
            type: 'invalid_dictionary_words',
            words: invalidWords.map(w => w.word),
            count: invalidWords.length
          }])
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in dictionary-validator function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Basic English word validation using common word patterns
async function validateWithBasicWordList(word: string): Promise<boolean> {
  // Common English words (subset for demo - in production, use a comprehensive word list)
  const commonWords = [
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with',
    'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
    'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up',
    'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time',
    'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could',
    'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think',
    'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even',
    'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'climate', 'change',
    'environment', 'world', 'global', 'warming', 'carbon', 'temperature', 'weather', 'pollution',
    'sustainable', 'renewable', 'energy', 'fossil', 'fuel', 'greenhouse', 'gas', 'emissions'
  ];

  // Check if word is in common words list
  if (commonWords.includes(word)) {
    return true;
  }

  // Basic English word pattern validation
  const englishPattern = /^[a-z]+$/;
  if (!englishPattern.test(word)) {
    return false;
  }

  // Reject obvious spam patterns
  const spamPatterns = [
    /^(.)\1{4,}$/, // Same character repeated 5+ times (aaaaa)
    /^(..)\1{3,}$/, // Same 2 characters repeated 4+ times (abababab)
    /^[qxz]{3,}$/, // Uncommon letter combinations
    /^[bcdfghjklmnpqrstvwxyz]{5,}$/, // 5+ consonants with no vowels
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(word)) {
      return false;
    }
  }

  // Accept words that follow basic English patterns
  const hasVowel = /[aeiou]/.test(word);
  const reasonableLength = word.length >= 2 && word.length <= 20;
  
  return hasVowel && reasonableLength;
}