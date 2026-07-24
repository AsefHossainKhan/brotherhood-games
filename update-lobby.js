
const fs = require('fs');
const content = fs.readFileSync('frontend/src/components/lobby/Lobby.tsx', 'utf8');

let newContent = content;

// Add framer-motion import
newContent = newContent.replace(
  "import { useSocketStore } from '@/stores/storeStore';",
  "import { useSocketStore } from '@/stores/storeStore';
import { motion } from 'framer-motion';"
);

// Simpler replacements
newContent = newContent.replace(/bg-gray-900/50/g, 'bg-black/30');
newContent = newContent.replace(/bg-gray-800/50/g, 'bg-white/5');
newContent = newContent.replace(/bg-gray-800/g, 'bg-black/30');
newContent = newContent.replace(/border-gray-800/g, 'border-white/10');
newContent = newContent.replace(/border-gray-700/g, 'border-white/20');
newContent = newContent.replace(/text-gray-500/g, 'text-white/40');
newContent = newContent.replace(/text-gray-400/g, 'text-white/60');
newContent = newContent.replace(/text-gray-300/g, 'text-white/80');
newContent = newContent.replace(/text-gray-600/g, 'text-white/20');
newContent = newContent.replace(/bg-gray-700/g, 'bg-white/10');
newContent = newContent.replace(/rounded-lg bg-blue-600/g, 'rounded-lg bg-green-600');
newContent = newContent.replace(/hover:bg-blue-700/g, 'hover:bg-green-700');

fs.writeFileSync('frontend/src/components/lobby/Lobby.tsx', newContent);
console.log('Done:', newContent.split('
').length, 'lines');
