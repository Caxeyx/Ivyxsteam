import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface WinProbabilityProps {
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

export function WinProbability({ homeScore, awayScore, status }: WinProbabilityProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 120;
    const height = 12;
    const radius = 6;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Default 50-50 if no scores or not started
    let homeProb = 0.5;
    
    if (homeScore !== null && awayScore !== null) {
      if (status === 'FINISHED') {
        homeProb = homeScore > awayScore ? 1 : (homeScore < awayScore ? 0 : 0.5);
      } else {
        // Simple heuristic: 
        const total = homeScore + awayScore;
        if (total > 0) {
          // Add a baseline 50% that shifts based on score diff
          const diff = homeScore - awayScore;
          // max shift of 40% (leaving 10% for chance)
          const shift = Math.max(-0.4, Math.min(0.4, diff * 0.15));
          homeProb = 0.5 + shift;
        }
      }
    }

    const awayProb = 1 - homeProb;

    // Create the background bar
    svg.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height)
      .attr('rx', radius)
      .attr('fill', '#e4e4e7') // zinc-200
      .attr('class', 'dark:fill-zinc-800');

    // Home probability bar (blue-ish)
    svg.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width * homeProb)
      .attr('height', height)
      .attr('rx', radius)
      .attr('fill', '#3b82f6') // blue-500
      .transition()
      .duration(800)
      .attr('width', width * homeProb);

    // Away probability bar (rose-ish)
    // Only if awayProb > 0
    if (awayProb > 0) {
      svg.append('rect')
        .attr('x', width * homeProb)
        .attr('y', 0)
        .attr('width', 0)
        .attr('height', height)
        // Set border radii for right side only
        .attr('rx', radius)
        .attr('fill', '#f43f5e') // rose-500
        .transition()
        .duration(800)
        .attr('width', width * awayProb);
        
      // To prevent rounded corners in the middle, draw over it
      if (homeProb > 0 && homeProb < 1) {
        svg.append('rect')
          .attr('x', width * homeProb - radius)
          .attr('y', 0)
          .attr('width', radius * 2)
          .attr('height', height)
          .attr('fill', '#3b82f6') // match left side
          .style('opacity', 0)
          .transition()
          .duration(800)
          .style('opacity', 1);
      }
    }

    // Text for percentages (optional, maybe too small, but let's add tiny text)
    if (homeProb > 0.15) {
      svg.append('text')
        .attr('x', 6)
        .attr('y', height / 2 + 3)
        .text(`${Math.round(homeProb * 100)}%`)
        .attr('fill', 'white')
        .attr('font-size', '8px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'sans-serif');
    }

    if (awayProb > 0.15) {
      svg.append('text')
        .attr('x', width - 6)
        .attr('y', height / 2 + 3)
        .text(`${Math.round(awayProb * 100)}%`)
        .attr('fill', 'white')
        .attr('font-size', '8px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'sans-serif')
        .attr('text-anchor', 'end');
    }

  }, [homeScore, awayScore, status]);

  return (
    <div className="flex flex-col items-center gap-1 mt-2 mb-1" title="Win Probability">
      <div className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold">Win Probability</div>
      <svg ref={svgRef}></svg>
    </div>
  );
}
