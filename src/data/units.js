export const UNIT_TYPES = {
  rifleman: { name: 'Rifleman', hp: 100, damage: 15, fireRate: 2.4, range: 330, color: '#62c9ff', projectile: 'bullet', role: 'balanced' },
  smg: { name: 'SMG Trooper', hp: 90, damage: 8, fireRate: 5.8, range: 230, color: '#65ffd1', projectile: 'bullet', role: 'rapid fire' },
  shotgun: { name: 'Shotgunner', hp: 125, damage: 10, pellets: 5, spread: 0.18, fireRate: 1.25, range: 190, color: '#ffc75f', projectile: 'pellet', role: 'crowd burst' },
  machinegun: { name: 'Machine Gunner', hp: 135, damage: 10, fireRate: 7.2, range: 350, color: '#9df36d', projectile: 'bullet', role: 'sustained DPS' },
  grenadier: { name: 'Grenadier', hp: 110, damage: 62, fireRate: 0.58, range: 320, splash: 66, color: '#ff9e64', projectile: 'grenade', role: 'area damage' },
  sniper: { name: 'Sniper', hp: 82, damage: 105, fireRate: 0.55, range: 520, armorPierce: 0.65, color: '#e29cff', projectile: 'tracer', role: 'elite killer' },
  medic: { name: 'Medic', hp: 105, damage: 5, fireRate: 1.3, range: 210, heal: 16, healRate: 0.35, color: '#ffffff', projectile: 'bullet', role: 'support' },
  shield: { name: 'Shield Trooper', hp: 280, damage: 7, fireRate: 1.2, range: 150, armor: 0.35, color: '#7da3ff', projectile: 'bullet', role: 'frontline' },
  flamethrower: { name: 'Flamethrower', hp: 150, damage: 7, fireRate: 8.5, range: 170, splash: 28, burn: 3, color: '#ff6b3d', projectile: 'flame', role: 'damage over time' },
  rocket: { name: 'Rocketeer', hp: 118, damage: 120, fireRate: 0.34, range: 410, splash: 92, color: '#ff646f', projectile: 'rocket', role: 'heavy AoE' },
  tesla: { name: 'Tesla Gunner', hp: 115, damage: 28, fireRate: 1.2, range: 280, chains: 3, color: '#6ae5ff', projectile: 'tesla', role: 'chain damage' },
  drone: { name: 'Drone Operator', hp: 92, damage: 13, fireRate: 3.2, range: 390, drone: true, color: '#70f1ff', projectile: 'drone', role: 'autonomous support' },
};

export const STARTING_SQUAD = ['rifleman', 'rifleman', 'rifleman', 'rifleman'];
