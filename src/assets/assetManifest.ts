export type AssetCategory = 'player' | 'destructibles' | 'doors' | 'drone' | 'hazards' | 'interactables' | 'mech' | 'pickups' | 'props' | 'tiles' | 'trooper';

export type AssetManifestEntry = {
  key: string;
  path: string;
  rawPath: string;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  width: number;
  height: number;
  category: AssetCategory;
  processed: boolean;
  warnings: string[];
};

export const assetManifest = [
  {
    "key": "player",
    "path": "/assets/processed/player.png",
    "rawPath": "/assets/raw/player-hero-future-failure-5x4.png",
    "columns": 5,
    "rows": 4,
    "frameWidth": 280,
    "frameHeight": 280,
    "width": 1400,
    "height": 1120,
    "category": "player",
    "processed": true,
    "warnings": []
  },
  {
    "key": "destructibles",
    "path": "/assets/processed/destructibles.png",
    "rawPath": "/assets/raw/destructibles-crates-barrels-6x6.png",
    "columns": 6,
    "rows": 6,
    "frameWidth": 209,
    "frameHeight": 209,
    "width": 1254,
    "height": 1254,
    "category": "destructibles",
    "processed": true,
    "warnings": []
  },
  {
    "key": "doors",
    "path": "/assets/processed/doors.png",
    "rawPath": "/assets/raw/doors-portals-security-6x6.png",
    "columns": 6,
    "rows": 6,
    "frameWidth": 209,
    "frameHeight": 209,
    "width": 1254,
    "height": 1254,
    "category": "doors",
    "processed": true,
    "warnings": []
  },
  {
    "key": "drone",
    "path": "/assets/processed/drone.png",
    "rawPath": "/assets/raw/enemy-drone-flying-6x6.png",
    "columns": 6,
    "rows": 6,
    "frameWidth": 209,
    "frameHeight": 209,
    "width": 1254,
    "height": 1254,
    "category": "drone",
    "processed": true,
    "warnings": []
  },
  {
    "key": "hazards",
    "path": "/assets/processed/hazards.png",
    "rawPath": "/assets/raw/hazards-reactor-traps-6x6.png",
    "columns": 6,
    "rows": 6,
    "frameWidth": 209,
    "frameHeight": 209,
    "width": 1254,
    "height": 1254,
    "category": "hazards",
    "processed": true,
    "warnings": []
  },
  {
    "key": "interactables",
    "path": "/assets/processed/interactables.png",
    "rawPath": "/assets/raw/interactables-terminals-checkpoints-6x6.png",
    "columns": 6,
    "rows": 6,
    "frameWidth": 209,
    "frameHeight": 209,
    "width": 1254,
    "height": 1254,
    "category": "interactables",
    "processed": true,
    "warnings": []
  },
  {
    "key": "mech",
    "path": "/assets/processed/mech.png",
    "rawPath": "/assets/raw/enemy-mech-heavy-6x6.png",
    "columns": 6,
    "rows": 6,
    "frameWidth": 209,
    "frameHeight": 209,
    "width": 1254,
    "height": 1254,
    "category": "mech",
    "processed": true,
    "warnings": []
  },
  {
    "key": "pickups",
    "path": "/assets/processed/pickups.png",
    "rawPath": "/assets/raw/pickups-health-energy-keycards-6x6.png",
    "columns": 6,
    "rows": 6,
    "frameWidth": 209,
    "frameHeight": 209,
    "width": 1254,
    "height": 1254,
    "category": "pickups",
    "processed": true,
    "warnings": []
  },
  {
    "key": "props",
    "path": "/assets/processed/props.png",
    "rawPath": "/assets/raw/props-lab-machinery-6x6.png",
    "columns": 6,
    "rows": 6,
    "frameWidth": 209,
    "frameHeight": 209,
    "width": 1254,
    "height": 1254,
    "category": "props",
    "processed": true,
    "warnings": []
  },
  {
    "key": "tiles",
    "path": "/assets/processed/tiles.png",
    "rawPath": "/assets/raw/tiles-industrial-platforms-6x6.png",
    "columns": 6,
    "rows": 6,
    "frameWidth": 209,
    "frameHeight": 209,
    "width": 1254,
    "height": 1254,
    "category": "tiles",
    "processed": true,
    "warnings": []
  },
  {
    "key": "trooper",
    "path": "/assets/processed/trooper.png",
    "rawPath": "/assets/raw/enemy-trooper-soldier-6x6.png",
    "columns": 6,
    "rows": 6,
    "frameWidth": 209,
    "frameHeight": 209,
    "width": 1254,
    "height": 1254,
    "category": "trooper",
    "processed": true,
    "warnings": []
  }
] as const satisfies readonly AssetManifestEntry[];
