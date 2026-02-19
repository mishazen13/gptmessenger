// components/Slider.tsx
import React from 'react';

type SliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
};

export const Slider = ({ 
  label, 
  min, 
  max, 
  step, 
  value, 
  onChange,
  className = ''
}: SliderProps): JSX.Element => {
  const [localValue, setLocalValue] = React.useState(value);
  const percent = ((localValue - min) / (max - min)) * 100;

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setLocalValue(newValue);
    onChange(newValue);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex justify-between items-center">
        <span className="text-sm text-white/60">{label}</span>
        <span className="text-xs bg-white/5 px-2 py-0.5 rounded text-white/80">
          {localValue}
        </span>
      </div>

      <div className="relative">
        {/* Фон трека */}
        <div className="absolute h-1 bg-white/10 rounded-full w-full"></div>
        
        {/* Заполненная часть трека */}
        <div 
          className="absolute h-1 bg-white/40 rounded-full"
          style={{ width: `${percent}%` }}
        ></div>
        
        {/* Ползунок */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={handleChange}
          className="relative w-full h-1 appearance-none bg-transparent pointer-events-auto
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-3.5
                     [&::-webkit-slider-thumb]:h-3.5
                     [&::-webkit-slider-thumb]:bg-white
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:opacity-80
                     [&::-webkit-slider-thumb]:transition-opacity
                     [&::-webkit-slider-thumb]:hover:opacity-100
                     [&::-webkit-slider-thumb]:-mt-1
                     [&::-moz-range-thumb]:w-3.5
                     [&::-moz-range-thumb]:h-3.5
                     [&::-moz-range-thumb]:bg-white
                     [&::-moz-range-thumb]:border-0
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:opacity-80
                     [&::-moz-range-thumb]:hover:opacity-100"
        />
      </div>

      <div className="flex justify-between text-[10px] text-white/30">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};