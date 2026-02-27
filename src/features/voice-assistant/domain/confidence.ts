import { ConfidenceBucket, ParsedIntent, VoiceIntentType } from './intents';

export type VoiceScreenContext = 'catalog' | 'voice' | 'checkout';

export type ConfidenceBreakdown = {
  scoreIntent: number;
  scoreEntities: number;
  scoreContext: number;
  confidence: number;
  bucket: ConfidenceBucket;
};

function intentPrior(type: VoiceIntentType, baseBucket: ConfidenceBucket): number {
  const base = baseBucket === 'high' ? 0.92 : baseBucket === 'med' ? 0.75 : 0.56;
  if (type === 'REPEAT_LAST_ORDER' || type === 'TRACK_ORDER') return Math.max(0.62, base);
  return base;
}

function entitiesScore(intent: ParsedIntent): number {
  if (intent.type === 'ADD_TO_CART') {
    if (!intent.entities.productQuery) return 0.35;
    if (!intent.entities.quantity) return 0.85;
    return 1;
  }

  if (intent.type === 'SEARCH_PRODUCTS') {
    if (!intent.entities.productQuery) return 0.55;
    return intent.entities.productQuery.length >= 3 ? 1 : 0.72;
  }

  return 1;
}

function contextScore(context: VoiceScreenContext): number {
  if (context === 'catalog') return 1;
  if (context === 'voice') return 0.9;
  return 0.12;
}

export function bucketFromScore(score: number): ConfidenceBucket {
  if (score >= 0.7) return 'high';
  if (score >= 0.45) return 'med';
  return 'low';
}

export function scoreConfidence(intent: ParsedIntent, context: VoiceScreenContext): ConfidenceBreakdown {
  const scoreIntent = intentPrior(intent.type, intent.confidence);
  const scoreEntities = entitiesScore(intent);
  const scoreContext = contextScore(context);
  const confidence = Math.min(1, scoreIntent * scoreEntities * scoreContext);
  return {
    scoreIntent,
    scoreEntities,
    scoreContext,
    confidence,
    bucket: bucketFromScore(confidence)
  };
}
