import { createSignal, createEffect, onMount } from 'solid-js';
import { Individual } from './genetic-algorithm';

interface VisualizerProps {
  population: Individual[];
  bounds: { min: number; max: number };
  generation: number;
  bestFitness: number;
  averageFitness: number;
}

export function Visualizer(props: VisualizerProps) {
  let canvasRef: HTMLCanvasElement;
  const [canvasSize] = createSignal(500);

  const drawContourLines = (ctx: CanvasRenderingContext2D) => {
    const { min, max } = props.bounds;
    const size = canvasSize();
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    const levels = [1, 4, 16, 64, 256, 1024, 4096];
    
    for (const level of levels) {
      const radius = Math.sqrt(level);
      const pixelRadius = (radius / (max - min)) * size;
      
      if (pixelRadius > 0 && pixelRadius < size / 2) {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, pixelRadius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const drawAxes = (ctx: CanvasRenderingContext2D) => {
    const size = canvasSize();
    
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();
    
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    const { min, max } = props.bounds;
    const step = (max - min) / 4;
    
    for (let i = 0; i <= 4; i++) {
      const value = min + i * step;
      const pos = (i / 4) * size;
      
      if (Math.abs(value) > 0.1) {
        ctx.fillText(value.toFixed(0), pos, size / 2 + 15);
        ctx.fillText((-value).toFixed(0), size / 2 + 15, pos);
      }
    }
  };

  const drawPopulation = (ctx: CanvasRenderingContext2D) => {
    const { min, max } = props.bounds;
    const size = canvasSize();
    const range = max - min;
    
    if (props.population.length === 0) return;
    
    const bestIndividual = props.population.reduce((best, current) => 
      current.fitness < best.fitness ? current : best
    );
    
    props.population.forEach(individual => {
      const x = ((individual.x - min) / range) * size;
      const y = ((individual.y - min) / range) * size;
      
      if (individual === bestIndividual) {
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      } else {
        ctx.fillStyle = '#0066cc';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };

  const draw = () => {
    const canvas = canvasRef;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvasSize(), canvasSize());
    
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, canvasSize(), canvasSize());
    
    drawContourLines(ctx);
    drawAxes(ctx);
    drawPopulation(ctx);
  };

  createEffect(() => {
    if (props.population.length > 0) {
      draw();
    }
  });

  onMount(() => {
    draw();
  });

  return (
    <div class="visualizer">
      <div class="canvas-container">
        <canvas
          ref={canvasRef!}
          width={canvasSize()}
          height={canvasSize()}
          style={{
            border: '1px solid #ccc',
            'border-radius': '4px'
          }}
        />
      </div>
      <div class="stats">
        <div class="stat-item">
          <span class="label">世代:</span>
          <span class="value">{props.generation}</span>
        </div>
        <div class="stat-item">
          <span class="label">最良適応度:</span>
          <span class="value">{props.bestFitness.toFixed(4)}</span>
        </div>
        <div class="stat-item">
          <span class="label">平均適応度:</span>
          <span class="value">{props.averageFitness.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}