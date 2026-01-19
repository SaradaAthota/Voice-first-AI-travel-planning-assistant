# Explanation Composer

Composes explanations by combining multiple data sources.

## Data Sources

1. **POI Metadata (OSM)**
   - Name, category, coordinates
   - OSM ID and type
   - Tags and description
   - Source: OpenStreetMap

2. **RAG Retrieved Text**
   - Travel guide information
   - Safety, Eat, Get Around, Weather sections
   - Source: Wikivoyage/Wikipedia

3. **Constraints**
   - User's travel pace
   - Weather information (if available)
   - Other preferences

## Rules

- **If RAG data missing → explicitly say so**
- **Return citations for UI display**
- **No hallucinated facts allowed**
- **Combine all available data sources**

## Usage

```typescript
const composer = new ExplanationComposer();

const response = await composer.composeExplanation({
  question: "Why did you pick City Palace?",
  context: conversationContext,
  poi: poiObject, // Optional
  constraints: {
    pace: 'moderate',
    weather: 'sunny, 25°C' // Optional
  }
});
```

## Response Structure

```typescript
{
  text: string;              // Explanation text (for voice)
  citations: Citation[];     // Citations for UI
  state: ConversationState;
  metadata: {
    tripId?: string;
    hasRAGData: boolean;
    hasPOIData: boolean;
  };
}
```

## Integration

The ExplanationComposer is used by the Orchestrator when:
- State is `EXPLAINING`
- Intent is `EXPLAIN`
- User asks "why" questions

