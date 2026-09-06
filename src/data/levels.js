const wave=(label,kind,budget,duration=24)=>({type:'wave',label,kind,budget,duration});
const reward=(kind,options)=>({type:'reward',kind,options});
const elite=(label,kind,budget)=>({type:'elite',label,kind,budget,duration:28});
const boss=(id)=>({type:'boss',id});

export const LEVELS = [
 {name:'First Contact',biome:'city',events:[wave('CONTACT','swarm',24,20),reward('reinforce',[{unit:'rifleman',count:5},{unit:'smg',count:3}]),wave('SECOND PUSH','mixed',34,22),reward('artifact'),boss('brute')]},
 {name:'Crossfire',biome:'city',events:[wave('RUNNERS','rush',38,22),reward('reinforce',[{unit:'rifleman',count:8},{unit:'machinegun',count:2}]),wave('BLOCKADE','armored',48,24),reward('crate'),boss('tank')]},
 {name:'Brood Street',biome:'city',events:[wave('SWARM','swarm',54,24),reward('rescue',[{unit:'shotgun',count:4},{unit:'grenadier',count:2}]),elite('BROOD GUARD','mixed',66),reward('artifact'),boss('brood')]},
 {name:'Chain of Command',biome:'city',events:[wave('ESCORT','support',68,24),reward('reinforce',[{unit:'sniper',count:2},{unit:'shield',count:3}]),elite('COMMAND CELL','support',82),reward('artifact'),boss('general')]},
 {name:'Siege Line',biome:'wasteland',events:[wave('HEAVY COLUMN','armored',86,25),reward('crate'),wave('BOMBER RUN','bombers',96,25),reward('artifact'),boss('walker')]},
 {name:'Scissor Attack',biome:'wasteland',events:[wave('TWO-SIDED PUSH','rush',104,26),reward('reinforce',[{unit:'flamethrower',count:3},{unit:'rocket',count:2}]),elite('WAR BEASTS','beasts',116),reward('artifact'),boss('twins')]},
 {name:'Underfoot',biome:'hive',events:[wave('BURROWERS','burrow',116,26),reward('rescue',[{unit:'medic',count:2},{unit:'shield',count:4}]),wave('SPLITTER NEST','split',130,26),reward('artifact'),boss('worm')]},
 {name:'No-Fly Zone',biome:'machine',events:[wave('JAMMED','jammer',136,27),reward('reinforce',[{unit:'tesla',count:3},{unit:'drone',count:3}]),elite('SKYSCREEN','support',150),reward('artifact'),boss('carrier')]},
 {name:'The Dead Return',biome:'hive',events:[wave('RAISED HORDE','necro',154,28),reward('crate'),elite('DEATH CHOIR','necro',166),reward('artifact'),boss('necro')]},
 {name:'Final Doctrine',biome:'machine',events:[wave('ALL ARMS','mixed',170,28),reward('reinforce',[{unit:'rocket',count:3},{unit:'tesla',count:4}]),elite('PRAETORIAN LINE','armored',190),reward('artifact'),boss('warlord')]},
 {name:'Black Highway',biome:'wasteland',events:[wave('FLOOD','swarm',205,30),reward('artifact'),elite('ARMORED FLOOD','armored',220),reward('crate'),boss('carrier')]},
 {name:'Omega Gate',biome:'machine',events:[wave('OMEGA WAVE','support',235,30),reward('artifact'),wave('LAST HOUR','beasts',250,30),reward('rescue',[{unit:'rocket',count:4},{unit:'tesla',count:5}]),boss('warlord')]},
];

export const WAVE_ARCHETYPES = {
 swarm:[['swarmer',.68],['grunt',.25],['runner',.07]],
 mixed:[['grunt',.48],['runner',.18],['shield',.15],['tank',.08],['bomber',.06],['medic',.05]],
 rush:[['runner',.58],['swarmer',.25],['bomber',.17]],
 armored:[['shield',.46],['tank',.30],['grunt',.16],['medic',.08]],
 support:[['grunt',.38],['shield',.22],['medic',.12],['commander',.10],['sniper',.10],['jammer',.08]],
 bombers:[['grunt',.42],['bomber',.34],['runner',.24]],
 beasts:[['warbeast',.34],['runner',.28],['shield',.22],['commander',.16]],
 burrow:[['burrower',.38],['runner',.25],['grunt',.22],['tank',.15]],
 split:[['splitter',.45],['swarmer',.35],['medic',.10],['commander',.10]],
 jammer:[['jammer',.20],['grunt',.36],['shield',.24],['sniper',.20]],
 necro:[['necromancer',.16],['swarmer',.40],['shield',.22],['warbeast',.12],['medic',.10]],
};
