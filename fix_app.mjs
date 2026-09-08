import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const goodPrefixIndex = content.indexOf('                        let dayCardStyle = "";\n                        let dayDotColor = "";');
const suffixStr = '                        const isHighlightedByAssistant = highlightedAssistantDates.has(dateStr);';
const goodSuffixIndex = content.indexOf(suffixStr, goodPrefixIndex);
const firstEndOfFile = content.indexOf('  );\n}\n', goodSuffixIndex);

const prefix = content.substring(0, goodPrefixIndex);
const suffix = content.substring(goodSuffixIndex, firstEndOfFile + 7);

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
