// Advanced repetition detection using AI
async function checkRepetitiveContentAdvanced(content: string): Promise<{ hasViolations: boolean; details: string[] }> {
  const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  const words = content.toLowerCase().split(/\s+/);
  const details = [];
  
  // Check for repeated sentences (exact matches)
  const sentenceFreq = new Map<string, number>();
  for (const sentence of sentences) {
    const normalized = sentence.toLowerCase().trim();
    if (normalized.length > 10) {
      sentenceFreq.set(normalized, (sentenceFreq.get(normalized) || 0) + 1);
    }
  }
  
  const repeatedSentences = Array.from(sentenceFreq.entries()).filter(([_, count]) => count > 1);
  if (repeatedSentences.length > 0) {
    details.push(`${repeatedSentences.length} repeated sentences detected`);
  }
  
  // Check for excessive word repetition
  const wordFreq = new Map<string, number>();
  for (const word of words) {
    if (word.length > 3) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }
  
  const totalMeaningfulWords = Array.from(wordFreq.values()).reduce((sum, count) => sum + count, 0);
  const excessiveWords = Array.from(wordFreq.entries())
    .filter(([word, count]) => count > Math.max(3, totalMeaningfulWords * 0.03)) // More than 3% or 3 times
    .map(([word, count]) => `"${word}" (${count} times)`);

  if (excessiveWords.length > 0) {
    details.push(`Excessive word repetition: ${excessiveWords.slice(0, 5).join(', ')}`);
  }

  // Check for filler patterns
  const fillerPatterns = [
    /\b(lorem ipsum|test test|hello hello|blah blah)\b/gi,
    /\b(\w+)\s+\1\s+\1/gi, // Word repeated 3 times consecutively
    /\b(and and|the the|is is|of of)\b/gi, // Common repeated words
  ];
  
  for (const pattern of fillerPatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      details.push(`Filler text detected: ${matches.slice(0, 3).join(', ')}`);
    }
  }

  return {
    hasViolations: repeatedSentences.length > 0 || excessiveWords.length > 0 || details.some(d => d.includes('Filler')),
    details
  };
}

// Advanced title relevance using simple but effective keyword matching
async function checkTitleRelevanceAdvanced(title: string, content: string): Promise<number> {
  if (!title || title.trim().length === 0) return 50;
  
  const titleWords = title.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'was', 'one', 'our', 'has', 'day'].includes(w));
  
  const contentLower = content.toLowerCase();
  
  if (titleWords.length === 0) return 60;
  
  let totalRelevance = 0;
  
  for (const word of titleWords) {
    // Direct word match
    const directMatches = (contentLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    
    // Partial word match (for variations)
    const partialMatches = (contentLower.match(new RegExp(word, 'g')) || []).length;
    
    // Calculate relevance for this word (0-100)
    const wordRelevance = Math.min(100, (directMatches * 20) + (partialMatches * 10));
    totalRelevance += wordRelevance;
  }
  
  const averageRelevance = totalRelevance / titleWords.length;
  return Math.round(Math.min(100, averageRelevance));
}

// Advanced spelling check with more sophisticated patterns
async function checkSpellingMistakesAdvanced(content: string): Promise<{ score: number; errorPercentage: number; errors: string[] }> {
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const totalWords = words.length;
  
  if (totalWords === 0) return { score: 100, errorPercentage: 0, errors: [] };
  
  const suspiciousPatterns = [
    /\d+[a-z]+|[a-z]+\d+/i, // Numbers mixed with letters
    /[a-z]{25,}/i, // Extremely long words (likely keyboard mashing)
    /([a-z])\1{4,}/i, // Same letter repeated 5+ times
    /^[^a-zA-Z]*$/, // Words with no letters (just symbols/numbers)
    /[^a-zA-Z\s\-'.,!?;:"()]/g, // Invalid characters
    /^(asdf|qwer|zxcv|hjkl|uiop|mnbv|gfds|trewq)/i, // Keyboard mashing patterns
    /^(.)\1*$/, // Single character repeated
  ];
  
  let errorCount = 0;
  const errors: string[] = [];
  
  for (const word of words) {
    // Skip very short words, common punctuation, and numbers
    if (word.length <= 2 || /^\d+$/.test(word) || /^[.,!?;:"()]+$/.test(word)) {
      continue;
    }
    
    const cleanWord = word.replace(/[^a-zA-Z]/g, '');
    if (cleanWord.length === 0) continue;
    
    let hasError = false;
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(cleanWord)) {
        errorCount++;
        if (errors.length < 15) {
          errors.push(word);
        }
        hasError = true;
        break;
      }
    }
    
    // Check for suspicious word patterns
    if (!hasError) {
      // All caps words longer than 3 characters (might be mistakes)
      if (cleanWord.length > 3 && cleanWord === cleanWord.toUpperCase()) {
        errorCount++;
        if (errors.length < 15) {
          errors.push(word);
        }
      }
    }
  }
  
  const errorPercentage = totalWords > 0 ? (errorCount / totalWords) * 100 : 0;
  const score = Math.max(0, 100 - errorPercentage * 3); // Penalize heavily for errors
  
  return {
    score: Math.round(score),
    errorPercentage,
    errors
  };
}