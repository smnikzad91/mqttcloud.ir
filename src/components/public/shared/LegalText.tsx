/**
 * Renders the privacy/terms text written in the admin (plain text, no HTML):
 * blocks are separated by blank lines; a block starting "## " is a section
 * heading, a block whose lines all start with "- " is a bullet list, anything
 * else a paragraph. Shared by the public pages and the admin preview.
 */
export function LegalText({ content, className = "text-gray-600 dark:text-gray-400" }: { content: string; className?: string }) {
  return (
    <>
      {content
        .split(/\n\s*\n/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block, i) => {
          if (block.startsWith("## ")) {
            return <h2 key={i} className="pt-4 text-xl font-bold text-gray-900 dark:text-white">{block.slice(3).trim()}</h2>;
          }
          const lines = block.split("\n");
          if (lines.every((l) => l.trimStart().startsWith("- "))) {
            return (
              <ul key={i} className={`list-disc space-y-2 pr-5 leading-8 marker:text-brand-400 ${className}`}>
                {lines.map((l, j) => <li key={j}>{l.trimStart().slice(2)}</li>)}
              </ul>
            );
          }
          return <p key={i} className={`whitespace-pre-line leading-8 ${className}`}>{block}</p>;
        })}
    </>
  );
}
