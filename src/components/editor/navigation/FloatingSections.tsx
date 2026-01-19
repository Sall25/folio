import { type ProgressBarProps } from "./ProgressBar";
import { useContext } from "react";
import { NavigationContext } from "./navigationContext";


export function FloatingSections({ sections, editor }: ProgressBarProps) {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('FloatingSections must be inside NavigationProvider');
  }

  return (
    <div className={`absolute -top-6 right-0 w-xs flex flex-col justify-items-center gap-3 pl-4.5
      pr-4.5 pt-1 pb-1  rounded-2xl bg-neutral-50 dark:bg-neutral-900 shadow-xl shadow-neutral-200
     dark:shadow-neutral-950
        transition-all duration-400 ease-out
        ${ctx.hovered
        ? 'opacity-100 translate-x-0 scale-100'
        : 'opacity-0 translate-x-2 scale-95'}
     `}
      onMouseLeave={() => {
        console.log('mouse left');
        ctx.hideFloatingSections();
      }}
    >
      {sections.map(section => (
        <span
          key={section.id}

          className={`
          ${ctx.activeSection ?
              ctx.activeSection.id === section.id ? 'text-cyan-500 font-bold' : 'text-gray-600'
              : 'text-gray-600'
            }
          cursor-pointer transition-all duration-200 
          hover:bg-neutral-100 hover:dark:bg-neutral-800
          p-1.5 rounded`}

          onMouseDown={() => {
            editor
              .chain()
              .focus()
              .setTextSelection(section.from + 1)
              .scrollIntoView()
              .run();
            // ctx.setCurrentSection(section);


          }}
        >
          {section.title}
        </span>
      ))}
    </div>
  );
}
