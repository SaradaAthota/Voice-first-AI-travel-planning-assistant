# Explanation Handling

How explanations work in the voice-first AI travel planning assistant.

## Overview

Explanations combine multiple data sources to provide grounded, cited answers to "why" questions.

## Data Sources

### 1. POI Metadata (OpenStreetMap)
- Extracted from itinerary activities
- Includes: name, category, coordinates, OSM ID, tags
- Source: OpenStreetMap

### 2. RAG Retrieved Text
- Travel guide information from Wikivoyage/Wikipedia
- Sections: Safety, Eat, Get Around, Weather
- Retrieved using semantic search

### 3. Constraints
- User's travel pace (relaxed/moderate/fast)
- Weather information (if available)
- Other preferences

## Flow

```
User: "Why did you pick City Palace?"
    ↓
Orchestrator detects EXPLAIN intent
    ↓
Transitions to EXPLAINING state
    ↓
ExplanationComposer:
  1. Extracts POI from itinerary
  2. Retrieves RAG data for POI
  3. Gets constraints (pace, weather)
  4. Combines all data
  5. Generates explanation
  6. Collects citations
    ↓
Returns response with citations
```

## Missing Data Handling

If RAG data is missing:
- Explanation explicitly states: "I don't have detailed information about this in my knowledge base"
- Still uses POI metadata if available
- No guessing or making up facts

## Citations

All explanations include citations:
- **RAG citations**: Wikivoyage/Wikipedia URLs
- **OSM citations**: OpenStreetMap URLs

Citations are returned in the response for UI display.

## Example

**Question**: "Why did you pick City Palace?"

**Response**:
```
City Palace is a historic palace complex in Jaipur, known for its 
architectural beauty and cultural significance. According to Wikivoyage, 
it's one of the main attractions in the city and offers insights into 
Rajasthani history. Given your moderate pace preference, it fits well 
into a day's itinerary with enough time to explore.

Note: I have limited information about this from my knowledge base.
```

**Citations**:
- Wikivoyage: https://en.wikivoyage.org/wiki/Jaipur
- OpenStreetMap: https://www.openstreetmap.org/node/123456789

