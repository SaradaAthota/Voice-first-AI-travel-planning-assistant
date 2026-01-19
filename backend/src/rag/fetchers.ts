/**
 * Content Fetchers
 * 
 * Fetches content from Wikivoyage and Wikipedia.
 * 
 * Rules:
 * - One-time ingestion (offline)
 * - No runtime scraping
 * - Uses Wikipedia API for structured data
 */

import * as cheerio from 'cheerio';
import { ParsedPage, RAGSource } from './types';

/**
 * Fetch Wikivoyage page for a city
 * 
 * Uses Wikipedia API (Wikivoyage is part of Wikimedia)
 */
export async function fetchWikivoyagePage(cityName: string): Promise<ParsedPage | null> {
  try {
    // Wikivoyage API endpoint
    const apiUrl = `https://en.wikivoyage.org/api.php?action=parse&page=${encodeURIComponent(cityName)}&format=json&prop=text|sections`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'VoiceTravelAssistant/1.0 (https://github.com/your-repo)',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Wikivoyage API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      console.warn(`Wikivoyage page not found for ${cityName}: ${data.error.info}`);
      return null;
    }

    const html = data.parse.text['*'];
    const sections = data.parse.sections || [];

    // Parse HTML and extract sections
    const parsedSections = parseWikivoyageSections(html, sections);

    return {
      city: cityName,
      source: 'wikivoyage',
      url: `https://en.wikivoyage.org/wiki/${encodeURIComponent(cityName)}`,
      sections: parsedSections,
    };
  } catch (error) {
    console.error(`Error fetching Wikivoyage page for ${cityName}:`, error);
    return null;
  }
}

/**
 * Fetch Wikipedia page for a city
 */
export async function fetchWikipediaPage(cityName: string): Promise<ParsedPage | null> {
  try {
    // Wikipedia API endpoint
    const apiUrl = `https://en.wikipedia.org/api.php?action=parse&page=${encodeURIComponent(cityName)}&format=json&prop=text|sections`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'VoiceTravelAssistant/1.0 (https://github.com/your-repo)',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      console.warn(`Wikipedia page not found for ${cityName}: ${data.error.info}`);
      return null;
    }

    const html = data.parse.text['*'];
    const sections = data.parse.sections || [];

    // Parse HTML and extract sections
    const parsedSections = parseWikipediaSections(html, sections);

    return {
      city: cityName,
      source: 'wikipedia',
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(cityName)}`,
      sections: parsedSections,
    };
  } catch (error) {
    console.error(`Error fetching Wikipedia page for ${cityName}:`, error);
    return null;
  }
}

/**
 * Parse Wikivoyage HTML sections
 */
function parseWikivoyageSections(html: string, sections: any[]): Record<string, string> {
  const $ = cheerio.load(html);
  const parsed: Record<string, string> = {};

  // Wikivoyage uses specific section headings
  const targetSections = ['Safety', 'Eat', 'Get around', 'Weather', 'Understand', 'See', 'Do', 'Buy', 'Sleep', 'Connect'];

  for (const section of sections) {
    const sectionName = section.line;
    
    // Normalize section names
    const normalizedName = normalizeSectionName(sectionName);
    
    if (targetSections.some(target => normalizedName.toLowerCase().includes(target.toLowerCase()))) {
      // Extract section content
      const sectionId = `section-${section.index}`;
      const sectionElement = $(`#${sectionId}`);
      
      if (sectionElement.length > 0) {
        // Get text content, remove navigation boxes, etc.
        let content = sectionElement.text().trim();
        
        // Clean up content
        content = cleanText(content);
        
        if (content.length > 50) { // Only include substantial content
          parsed[normalizedName] = content;
        }
      }
    }
  }

  return parsed;
}

/**
 * Parse Wikipedia HTML sections
 */
function parseWikipediaSections(html: string, sections: any[]): Record<string, string> {
  const $ = cheerio.load(html);
  const parsed: Record<string, string> = {};

  // Wikipedia sections we're interested in
  const targetSections = ['Safety', 'Eat', 'Get around', 'Weather', 'Climate', 'Transport', 'Culture', 'Tourism'];

  for (const section of sections) {
    const sectionName = section.line;
    const normalizedName = normalizeSectionName(sectionName);
    
    if (targetSections.some(target => normalizedName.toLowerCase().includes(target.toLowerCase()))) {
      const sectionId = `section-${section.index}`;
      const sectionElement = $(`#${sectionId}`);
      
      if (sectionElement.length > 0) {
        let content = sectionElement.text().trim();
        content = cleanText(content);
        
        if (content.length > 50) {
          parsed[normalizedName] = content;
        }
      }
    }
  }

  return parsed;
}

/**
 * Normalize section name
 */
function normalizeSectionName(name: string): string {
  // Map common variations to standard names
  const mappings: Record<string, string> = {
    'get around': 'Get Around',
    'getting around': 'Get Around',
    'transport': 'Get Around',
    'transportation': 'Get Around',
    'climate': 'Weather',
    'safety': 'Safety',
    'eat': 'Eat',
    'drink': 'Eat',
    'food': 'Eat',
    'dining': 'Eat',
    'weather': 'Weather',
    'understand': 'Understand',
    'see': 'See',
    'do': 'Do',
    'buy': 'Buy',
    'sleep': 'Sleep',
    'connect': 'Connect',
  };

  const lower = name.toLowerCase().trim();
  
  for (const [key, value] of Object.entries(mappings)) {
    if (lower.includes(key)) {
      return value;
    }
  }

  // Capitalize first letter of each word
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Clean text content
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .replace(/\n{3,}/g, '\n\n') // Multiple newlines to double
    .replace(/\[edit\]/g, '') // Remove [edit] links
    .replace(/\[.*?\]/g, '') // Remove citation brackets
    .trim();
}

