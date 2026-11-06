import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  speaker: string;
  text: string;
  language: string;
  timestamp: string;
  isRight?: boolean;
}

export function ChatBubble({
  speaker,
  text,
  language,
  timestamp,
  isRight = false
}: ChatBubbleProps) {
  const time = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={cn(
      "flex w-full mb-4",
      isRight ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
        isRight
          ? "bg-ui-accent-muted text-ui-text"
          : "bg-ui-surface-subtle text-ui-text"
      )}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-current opacity-80">
            {speaker}
          </span>
          <span className="text-xs text-current opacity-80">
            {language}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{text}</p>
        <div className="flex justify-end mt-1">
          <span className="text-xs text-current opacity-60">{time}</span>
        </div>
      </div>
    </div>
  );
}