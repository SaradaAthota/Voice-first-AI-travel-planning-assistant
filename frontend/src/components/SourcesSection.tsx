/**
 * SourcesSection Component
 * 
 * Displays citations and references.
 */

import React from 'react';
import { Citation } from '../types/itinerary';

interface SourcesSectionProps {
  citations: Citation[];
  className?: string;
}

export function SourcesSection({ citations, className = '' }: SourcesSectionProps) {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div data-testid="sources" className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-800 mb-4">Sources & References</h3>
      <div className="space-y-3">
        {citations.map((citation, index) => (
          <div
            key={index}
            className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{citation.source}</p>
                {citation.excerpt && (
                  <p className="text-sm text-gray-600 mt-1">{citation.excerpt}</p>
                )}
                {citation.url && (
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 mt-1 inline-block break-all"
                  >
                    {citation.url}
                  </a>
                )}
              </div>
              {citation.confidence !== undefined && (
                <div className="ml-4 text-xs text-gray-500">
                  {Math.round(citation.confidence * 100)}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

