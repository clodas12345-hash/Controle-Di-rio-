const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// The original file was replaced starting at:
// let dayCardStyle = "";
// let dayDotColor = "";

const goodPrefixIndex = content.indexOf('                        let dayCardStyle = "";\n                        let dayDotColor = "";');

if (goodPrefixIndex === -1) {
  console.log("Could not find start");
  process.exit(1);
}

// The good suffix starts exactly at:
//                         const isHighlightedByAssistant = highlightedAssistantDates.has(dateStr);
// BUT this string is duplicated many times. We need the LAST ONE? No, we need the first one after goodPrefixIndex?
// Wait, the original file text had `const isHighlightedByAssistant = ...` right after the targetStr block.
// Let's find the FIRST occurrence of this suffix in the file AFTER goodPrefixIndex.

const suffixStr = '                        const isHighlightedByAssistant = highlightedAssistantDates.has(dateStr);';
const goodSuffixIndex = content.indexOf(suffixStr, goodPrefixIndex);

if (goodSuffixIndex === -1) {
  console.log("Could not find suffix");
  process.exit(1);
}

const prefix = content.substring(0, goodPrefixIndex);
// Wait! The goodSuffixIndex is currently pointing to the FIRST duplicate, which represents the start of the rest of the file.
// IF we take from goodSuffixIndex to the FIRST END of the file `  );\n}\n`, that is the EXACT original rest of the file!
const firstEndOfFile = content.indexOf('  );\n}\n', goodSuffixIndex);

if (firstEndOfFile === -1) {
  console.log("Could not find end of file");
  process.exit(1);
}

const suffix = content.substring(goodSuffixIndex, firstEndOfFile + 7); // include `  );\n}\n`

const correctReplaceStr = `                        let dayCardStyle = "";
                        let dayDotColor = "";
                        let dayTextElement = null;
                        let dayNumColor = "text-zinc-400";

                        if (isOff) {
                          if (gross > 0) {
                            if (gross >= 500 || (weekAvgPasses && gross > 0)) {
                              dayCardStyle = "bg-emerald-950/40 border-emerald-500/80 hover:bg-emerald-900/50 hover:border-emerald-400 shadow-sm shadow-emerald-500/10";
                              dayDotColor = "bg-emerald-400";
                              dayTextElement = <span className="text-emerald-400 font-black font-mono whitespace-nowrap">{formatBRL(gross).replace('R$', '').trim()}</span>;
                              dayNumColor = "text-emerald-300";
                            } else {
                              dayCardStyle = "bg-amber-950/30 border-amber-500/70 hover:bg-amber-900/40 hover:border-amber-400 shadow-sm shadow-amber-500/10";
                              dayDotColor = "bg-amber-400";
                              dayTextElement = <span className="text-amber-400 font-black font-mono whitespace-nowrap">{formatBRL(gross).replace('R$', '').trim()}</span>;
                              dayNumColor = "text-amber-300";
                            }
                          } else {
                            if (isSunday) {
                              dayCardStyle = "bg-zinc-900/60 border-amber-500/30 hover:bg-zinc-850 hover:border-amber-400/50 text-zinc-400";
                              dayDotColor = "bg-amber-400";
                              dayTextElement = <span className="text-amber-400/90 font-medium text-[9px] sm:text-[10px] uppercase">Folga</span>;
                              dayNumColor = "text-amber-400/90 font-bold";
                            } else {
                              dayCardStyle = "bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-400";
                              dayDotColor = "bg-zinc-500";
                              dayTextElement = <span className="text-zinc-500 font-medium text-[9px] sm:text-[10px] uppercase">Folga</span>;
                              dayNumColor = "text-zinc-400";
                            }
                          }
                        } else {
                          // Dia de Trabalho (Independente se é domingo ou não)
                          if (gross >= 500 || weekAvgPasses) {
                            dayCardStyle = "bg-emerald-950/40 border-emerald-500/80 hover:bg-emerald-900/50 hover:border-emerald-400 shadow-sm shadow-emerald-500/10";
                            dayDotColor = "bg-emerald-400";
                            dayTextElement = <span className="text-emerald-400 font-black font-mono whitespace-nowrap">{formatBRL(gross).replace('R$', '').trim()}</span>;
                            dayNumColor = "text-emerald-300";
                          } else {
                            dayCardStyle = "bg-rose-950/40 border-rose-500/80 hover:bg-rose-900/50 hover:border-rose-400 shadow-sm shadow-rose-500/10";
                            dayDotColor = "bg-rose-400";
                            dayTextElement = <span className="text-rose-400 font-black font-mono whitespace-nowrap">{gross > 0 ? formatBRL(gross).replace('R$', '').trim() : '0,00'}</span>;
                            dayNumColor = "text-rose-300";
                          }
                        }
`;

fs.writeFileSync('src/App.tsx', prefix + correctReplaceStr + suffix);
console.log('Restored and fixed!');

