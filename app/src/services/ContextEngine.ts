import { EventFeatures, ThreatContext, MotionPattern, LocationCategory, PatternRecord } from '../types';
import { dbService } from './DatabaseService';

export class ContextEngine {
  private static readonly THRESHOLD_EMERGENCY = 0.72;
  private static readonly COOLDOWN_MS = 2 * 60 * 1000;
  private lastAlertTime = 0;

  public async evaluateThreat(
    event: EventFeatures,
    locationCategory: LocationCategory,
    soundEvidence: number,
    postAnomalyStillness: boolean
  ): Promise<{ score: number; context: ThreatContext; isEmergency: boolean }> {
    
    // In cooldown phase?
    const inCooldown = (Date.now() - this.lastAlertTime) < ContextEngine.COOLDOWN_MS;
    
    // 1. Base from motion evidence
    const patternWeight = this.getPatternWeight(event.motionPattern);
    // Assuming anomalyScore comes normalized from 0 to 1, if not, adjust here.
    const normalizedAnomaly = Math.min(event.anomalyScore / 100.0, 1.0); 
    const baseMotionScore = normalizedAnomaly * patternWeight;

    // 2. Temporal Persistence
    const durationFactor = this.getDurationFactor(event.durationMs);

    // 3. Historical Adjustment
    const historyAdj = await this.calculateHistoricalEvidence(event);

    // 4. Location Context
    const locationMultiplier = this.getLocationMultiplier(locationCategory);

    // 5. Time of Day Context
    const timeMultiplier = this.getTimeMultiplier();

    // Calculate initial threat score
    let threatScore = baseMotionScore * durationFactor;
    
    if (postAnomalyStillness) {
      threatScore += 0.15;
    }

    threatScore += historyAdj;
    threatScore *= locationMultiplier;
    threatScore *= timeMultiplier;
    threatScore += soundEvidence;

    // 6. Wear State Degrade
    if (event.wearConfidence < 0.60) {
      threatScore *= 0.70;
    }
    if (event.wearConfidence < 0.30) {
      threatScore = 0; // Device not worn
    }

    if (inCooldown) {
      threatScore *= 0.60;
    }

    // Clamp score
    threatScore = Math.max(0.0, Math.min(threatScore, 1.0));

    const context: ThreatContext = {
      baseMotionScore,
      durationFactor,
      postAnomalyStillness,
      historicalAdjustment: historyAdj,
      locationMultiplier,
      timeMultiplier,
      soundEvidence,
      wearConfidence: event.wearConfidence
    };

    const isEmergency = threatScore >= ContextEngine.THRESHOLD_EMERGENCY;

    if (isEmergency && !inCooldown) {
      this.lastAlertTime = Date.now();
    }

    return { score: threatScore, context, isEmergency };
  }

  private getPatternWeight(pattern: MotionPattern): number {
    switch (pattern) {
      case 'FALL_CANDIDATE': return 0.80;
      case 'STRUGGLE_CANDIDATE': return 0.75;
      case 'SEIZURE_CANDIDATE': return 0.70;
      case 'PINNED_CANDIDATE': return 0.65;
      case 'UNKNOWN_ANOMALY': return 0.40;
      default: return 0.40;
    }
  }

  private getDurationFactor(durationMs: number): number {
    const sec = durationMs / 1000;
    if (sec <= 1.5) return 0.10;
    if (sec <= 3.0) return 0.35;
    if (sec <= 6.0) return 0.60;
    if (sec <= 12.0) return 0.80;
    return 0.95;
  }

  private getLocationMultiplier(category: LocationCategory): number {
    switch (category) {
      case 'HOME': return 0.55;
      case 'KNOWN_SAFE': return 0.65;
      case 'UNKNOWN_URBAN': return 1.00;
      case 'UNKNOWN_ISOLATED': return 1.35;
      case 'INDOORS_KNOWN': return 0.70; // Assumed
      case 'GPS_UNAVAILABLE': return 1.10;
      default: return 1.00;
    }
  }

  private getTimeMultiplier(): number {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 6) return 1.20; // NIGHT_RISK
    if (hour >= 6 && hour < 9) return 1.00; // MORNING
    if (hour >= 9 && hour < 18) return 0.90; // DAYTIME
    if (hour >= 18 && hour < 22) return 1.00; // EVENING
    return 1.15; // LATE_NIGHT
  }

  private async calculateHistoricalEvidence(current: EventFeatures): Promise<number> {
    const library = await dbService.getPatternLibrary();
    if (library.length === 0) return 0;

    // Calculate cosine similarity between current features and library patterns
    const similarities = library.map(record => {
      const sim = this.cosineSimilarity(
        [current.anomalyScore, current.dominantFreq, current.zcr, current.spectralEntropy, current.eigenvalueRatio],
        [record.anomaly_score, record.dominant_freq, record.zcr, record.spectral_entropy, record.eigenvalue_ratio]
      );
      return { record, sim };
    });

    // Sort descending by similarity
    similarities.sort((a, b) => b.sim - a.sim);
    
    // Top K=5
    const nearestK = similarities.slice(0, 5);

    let falsePositives = 0;
    let emergencies = 0;
    
    nearestK.forEach(item => {
      if (item.record.outcome === 'false_positive') falsePositives++;
      else if (item.record.outcome === 'emergency') emergencies++;
    });

    const falsePositiveRate = falsePositives / nearestK.length;
    const emergencyRate = emergencies / nearestK.length;

    return (emergencyRate * 0.25) - (falsePositiveRate * 0.20);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const contextEngine = new ContextEngine();
