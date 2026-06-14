// `Lang` is the single source of truth for the available languages, shared by
// both the landing page and the in-game text (../game/i18n.ts re-exports it).
// To add a language: add it here and to `LANGS`, then fill the new column in
// `translations` below and in `gameTranslations`. Run `npm run test:i18n` to
// verify every language defines exactly the same keys (no missing/extra).
export type Lang = 'es' | 'en' | 'pt' | 'fr';

export const LANGS: ReadonlyArray<{ code: Lang; label: string; flag: string }> = [
  { code: 'es', label: 'Español', flag: 'ES' },
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'pt', label: 'Português', flag: 'PT' },
  { code: 'fr', label: 'Français', flag: 'FR' },
];

export const DEFAULT_LANG: Lang = 'es';
export const STORAGE_KEY = 'ff_lang';

type Dict = Record<string, string>;

export const translations: Record<Lang, Dict> = {
  es: {
    'meta.title': 'Future Failure — Acción-plataformas de ciencia ficción',
    'meta.description':
      'Future Failure: un action-platformer 2D de ciencia ficción. Corre, haz dash, salta por las paredes y combate con espada y energía. Juega la demo en tu navegador.',

    'modal.kicker': 'PROTOCOLO DE CONTENCIÓN',
    'modal.heading': 'Elige tu idioma',
    'modal.sub': 'Podrás cambiarlo en cualquier momento desde el menú.',

    'nav.play': 'Jugar demo',

    'hero.eyebrow': 'Protocolo de Contención',
    'hero.tagline': 'La instalación colapsa. Solo queda un protocolo: contener el fallo.',
    'hero.body':
      'Haz dash, salta por las paredes y ábrete paso a filo de espada por una instalación de ciencia ficción de neón. Domina un movimiento fluido, encadena combos de cuerpo a cuerpo y energía, y rompe la red de seguridad.',
    'hero.cta': 'Jugar la demo',
    'hero.cta2': 'Ver la acción',
    'hero.badge1': 'Jugable en el navegador',
    'hero.badge2': 'Compatible con mando',
    'hero.badge3': 'Acción-plataformas 2D',

    'features.kicker': 'CARACTERÍSTICAS',
    'features.heading': 'Movimiento afilado. Combate eléctrico.',
    'features.move.title': 'Movimiento fluido',
    'features.move.body':
      'Corre, salta, haz dash en el aire y rebota en las paredes. El impulso está en tus manos en cada plataforma.',
    'features.combat.title': 'Espada + energía',
    'features.combat.body':
      'Corta de cerca con tu hoja y dispara energía a distancia. Encadena impactos en combos que escalan.',
    'features.enemies.title': 'Una red hostil',
    'features.enemies.body':
      'Soldados, drones de reconocimiento, mechs pesados, exploradores y centinelas defienden cada sector, cada uno con su comportamiento.',
    'features.worlds.title': 'Mundos reactivos',
    'features.worlds.body':
      'Laboratorios criogénicos, fundiciones de magma, biolabs invadidos por la flora y agujas del vacío montan el escenario de la fuga.',

    'bestiary.kicker': 'AMENAZAS',
    'bestiary.heading': 'Lo que defiende la red',
    'bestiary.sub': 'Sprites reales del juego, en movimiento.',
    'bestiary.player.name': 'Sujeto',
    'bestiary.player.desc': 'El protagonista: rápido, ágil y armado con hoja y energía.',
    'bestiary.trooper.name': 'Soldado',
    'bestiary.trooper.desc': 'Soldado corrupto que dispara en cuanto te ve y retrocede bajo presión.',
    'bestiary.drone.name': 'Dron',
    'bestiary.drone.desc': 'Cazador aéreo que se desplaza y dispara desde lo alto.',
    'bestiary.mech.name': 'Mech pesado',
    'bestiary.mech.desc': 'Mole acorazada con ráfagas cargadas y paso firme.',
    'bestiary.sentinel.name': 'Centinela',
    'bestiary.sentinel.desc': 'Unidad de seguridad vigilante que guarda los sectores profundos.',

    'worlds.kicker': 'ESCENARIOS',
    'worlds.heading': 'Sectores en colapso',
    'worlds.sub': 'Fondos reales de la instalación.',
    'worlds.cryo': 'Catedral criogénica',
    'worlds.foundry': 'Fundición de magma',
    'worlds.biolab': 'Biolab invadido',
    'worlds.void': 'Aguja del vacío',
    'worlds.reactor': 'Núcleo del reactor',
    'worlds.megacity': 'Megaciudad en ruinas',

    'cta.kicker': 'ÚLTIMO PROTOCOLO',
    'cta.heading': 'Entra en la brecha',
    'cta.body': 'La demo corre en tu navegador. Sin instalar nada. Solo ejecútala.',
    'cta.button': 'Iniciar la demo',
    'cta.controlsTitle': 'Controles',
    'controls.move': 'Mover',
    'controls.jump': 'Saltar',
    'controls.dash': 'Dash',
    'controls.sword': 'Espada',
    'controls.energy': 'Energía',
    'controls.interact': 'Interactuar',

    'footer.note': 'Demo en navegador · Hecho con Phaser',
    'footer.disclaimer': 'Future Failure — build de demostración en desarrollo.',
  },

  en: {
    'meta.title': 'Future Failure — Sci-fi action platformer',
    'meta.description':
      'Future Failure: a 2D sci-fi action platformer. Run, dash, wall-jump and fight with blade and energy. Play the demo in your browser.',

    'modal.kicker': 'CONTAINMENT PROTOCOL',
    'modal.heading': 'Choose your language',
    'modal.sub': 'You can change it anytime from the menu.',

    'nav.play': 'Play demo',

    'hero.eyebrow': 'Containment Protocol',
    'hero.tagline': 'The facility is collapsing. One protocol remains: contain the failure.',
    'hero.body':
      'Dash, wall-jump and cut your way through a neon sci-fi facility. Master fluid movement, chain melee and energy combos, and break the security grid wide open.',
    'hero.cta': 'Play the demo',
    'hero.cta2': 'See the action',
    'hero.badge1': 'Playable in your browser',
    'hero.badge2': 'Gamepad supported',
    'hero.badge3': '2D action platformer',

    'features.kicker': 'FEATURES',
    'features.heading': 'Sharp movement. Electric combat.',
    'features.move.title': 'Fluid movement',
    'features.move.body':
      'Run, leap, air-dash and wall-jump. Momentum is yours to command across every platform.',
    'features.combat.title': 'Blade + energy',
    'features.combat.body':
      'Slash up close with your blade and unleash energy shots at range. Chain hits into escalating combos.',
    'features.enemies.title': 'A hostile grid',
    'features.enemies.body':
      'Troopers, recon drones, heavy mechs, scouts and sentinels defend every sector — each with its own behavior.',
    'features.worlds.title': 'Reactive worlds',
    'features.worlds.body':
      'Cryo labs, molten foundries, overgrown biolabs and voidgate spires set the stage for the breakout.',

    'bestiary.kicker': 'THREATS',
    'bestiary.heading': 'What defends the grid',
    'bestiary.sub': 'Real in-game sprites, in motion.',
    'bestiary.player.name': 'Subject',
    'bestiary.player.desc': 'The protagonist: fast, agile and armed with blade and energy.',
    'bestiary.trooper.name': 'Trooper',
    'bestiary.trooper.desc': 'Corrupted soldier that fires on sight and falls back under pressure.',
    'bestiary.drone.name': 'Recon drone',
    'bestiary.drone.desc': 'Airborne hunter that strafes and shoots from above.',
    'bestiary.mech.name': 'Heavy mech',
    'bestiary.mech.desc': 'Armored bruiser with charged burst fire and heavy footing.',
    'bestiary.sentinel.name': 'Sentinel',
    'bestiary.sentinel.desc': 'Watchful security unit guarding the deeper sectors.',

    'worlds.kicker': 'ENVIRONMENTS',
    'worlds.heading': 'Sectors in collapse',
    'worlds.sub': 'Real backdrops from the facility.',
    'worlds.cryo': 'Cryo cathedral',
    'worlds.foundry': 'Molten foundry',
    'worlds.biolab': 'Overgrown biolab',
    'worlds.void': 'Voidgate spire',
    'worlds.reactor': 'Reactor core',
    'worlds.megacity': 'Ruined megacity',

    'cta.kicker': 'FINAL PROTOCOL',
    'cta.heading': 'Enter the breach',
    'cta.body': 'The demo runs in your browser. No installs. Just run.',
    'cta.button': 'Launch the demo',
    'cta.controlsTitle': 'Controls',
    'controls.move': 'Move',
    'controls.jump': 'Jump',
    'controls.dash': 'Dash',
    'controls.sword': 'Blade',
    'controls.energy': 'Energy',
    'controls.interact': 'Interact',

    'footer.note': 'Browser demo · Built with Phaser',
    'footer.disclaimer': 'Future Failure — work-in-progress demo build.',
  },

  pt: {
    'meta.title': 'Future Failure — Plataforma de ação sci-fi',
    'meta.description':
      'Future Failure: um action-platformer 2D de ficção científica. Corra, faça dash, salte pelas paredes e lute com lâmina e energia. Jogue a demo no navegador.',

    'modal.kicker': 'PROTOCOLO DE CONTENÇÃO',
    'modal.heading': 'Escolha o seu idioma',
    'modal.sub': 'Você pode mudá-lo a qualquer momento pelo menu.',

    'nav.play': 'Jogar demo',

    'hero.eyebrow': 'Protocolo de Contenção',
    'hero.tagline': 'A instalação está em colapso. Resta um protocolo: conter a falha.',
    'hero.body':
      'Faça dash, salte pelas paredes e abra caminho à lâmina por uma instalação sci-fi de neon. Domine um movimento fluido, encadeie combos de corpo a corpo e energia, e quebre a rede de segurança.',
    'hero.cta': 'Jogar a demo',
    'hero.cta2': 'Ver a ação',
    'hero.badge1': 'Jogável no navegador',
    'hero.badge2': 'Compatível com controle',
    'hero.badge3': 'Plataforma de ação 2D',

    'features.kicker': 'RECURSOS',
    'features.heading': 'Movimento afiado. Combate elétrico.',
    'features.move.title': 'Movimento fluido',
    'features.move.body':
      'Corra, salte, faça dash no ar e ricocheteie nas paredes. O impulso está nas suas mãos em cada plataforma.',
    'features.combat.title': 'Lâmina + energia',
    'features.combat.body':
      'Corte de perto com a lâmina e dispare energia à distância. Encadeie golpes em combos crescentes.',
    'features.enemies.title': 'Uma rede hostil',
    'features.enemies.body':
      'Soldados, drones de reconhecimento, mechs pesados, batedores e sentinelas defendem cada setor — cada um com seu comportamento.',
    'features.worlds.title': 'Mundos reativos',
    'features.worlds.body':
      'Laboratórios criogênicos, fundições de magma, biolabs tomados pela flora e torres do vazio montam o palco da fuga.',

    'bestiary.kicker': 'AMEAÇAS',
    'bestiary.heading': 'O que defende a rede',
    'bestiary.sub': 'Sprites reais do jogo, em movimento.',
    'bestiary.player.name': 'Sujeito',
    'bestiary.player.desc': 'O protagonista: rápido, ágil e armado com lâmina e energia.',
    'bestiary.trooper.name': 'Soldado',
    'bestiary.trooper.desc': 'Soldado corrompido que atira ao avistar e recua sob pressão.',
    'bestiary.drone.name': 'Drone',
    'bestiary.drone.desc': 'Caçador aéreo que se desloca e atira do alto.',
    'bestiary.mech.name': 'Mech pesado',
    'bestiary.mech.desc': 'Brutamontes blindado com rajadas carregadas e passada pesada.',
    'bestiary.sentinel.name': 'Sentinela',
    'bestiary.sentinel.desc': 'Unidade de segurança vigilante que guarda os setores profundos.',

    'worlds.kicker': 'CENÁRIOS',
    'worlds.heading': 'Setores em colapso',
    'worlds.sub': 'Fundos reais da instalação.',
    'worlds.cryo': 'Catedral criogênica',
    'worlds.foundry': 'Fundição de magma',
    'worlds.biolab': 'Biolab tomado',
    'worlds.void': 'Torre do vazio',
    'worlds.reactor': 'Núcleo do reator',
    'worlds.megacity': 'Megacidade em ruínas',

    'cta.kicker': 'PROTOCOLO FINAL',
    'cta.heading': 'Entre na brecha',
    'cta.body': 'A demo roda no seu navegador. Sem instalar nada. É só rodar.',
    'cta.button': 'Iniciar a demo',
    'cta.controlsTitle': 'Controles',
    'controls.move': 'Mover',
    'controls.jump': 'Pular',
    'controls.dash': 'Dash',
    'controls.sword': 'Lâmina',
    'controls.energy': 'Energia',
    'controls.interact': 'Interagir',

    'footer.note': 'Demo no navegador · Feito com Phaser',
    'footer.disclaimer': 'Future Failure — build de demonstração em desenvolvimento.',
  },

  fr: {
    'meta.title': 'Future Failure — Jeu de plateforme-action sci-fi',
    'meta.description':
      'Future Failure : un jeu de plateforme-action 2D de science-fiction. Cours, dash, saute aux murs et combats à la lame et à l’énergie. Joue à la démo dans ton navigateur.',

    'modal.kicker': 'PROTOCOLE DE CONFINEMENT',
    'modal.heading': 'Choisis ta langue',
    'modal.sub': 'Tu pourras la changer à tout moment depuis le menu.',

    'nav.play': 'Jouer la démo',

    'hero.eyebrow': 'Protocole de Confinement',
    'hero.tagline': 'L’installation s’effondre. Il ne reste qu’un protocole : contenir l’échec.',
    'hero.body':
      'Dash, saut mural et lame en main : fraie-toi un chemin dans une installation sci-fi au néon. Maîtrise un mouvement fluide, enchaîne les combos au corps à corps et à l’énergie, et brise la grille de sécurité.',
    'hero.cta': 'Jouer la démo',
    'hero.cta2': 'Voir l’action',
    'hero.badge1': 'Jouable dans le navigateur',
    'hero.badge2': 'Compatible manette',
    'hero.badge3': 'Plateforme-action 2D',

    'features.kicker': 'CARACTÉRISTIQUES',
    'features.heading': 'Mouvement tranchant. Combat électrique.',
    'features.move.title': 'Mouvement fluide',
    'features.move.body':
      'Cours, saute, dash en l’air et rebondis sur les murs. L’élan t’appartient sur chaque plateforme.',
    'features.combat.title': 'Lame + énergie',
    'features.combat.body':
      'Tranche au corps à corps et libère des tirs d’énergie à distance. Enchaîne les coups en combos croissants.',
    'features.enemies.title': 'Une grille hostile',
    'features.enemies.body':
      'Soldats, drones de reconnaissance, mechs lourds, éclaireurs et sentinelles défendent chaque secteur — chacun avec son comportement.',
    'features.worlds.title': 'Mondes réactifs',
    'features.worlds.body':
      'Labos cryogéniques, fonderies en fusion, biolabs envahis par la flore et flèches du vide plantent le décor de l’évasion.',

    'bestiary.kicker': 'MENACES',
    'bestiary.heading': 'Ce qui défend la grille',
    'bestiary.sub': 'Vrais sprites du jeu, en mouvement.',
    'bestiary.player.name': 'Sujet',
    'bestiary.player.desc': 'Le protagoniste : rapide, agile et armé d’une lame et d’énergie.',
    'bestiary.trooper.name': 'Soldat',
    'bestiary.trooper.desc': 'Soldat corrompu qui tire à vue et recule sous la pression.',
    'bestiary.drone.name': 'Drone',
    'bestiary.drone.desc': 'Chasseur aérien qui se déplace et tire d’en haut.',
    'bestiary.mech.name': 'Mech lourd',
    'bestiary.mech.desc': 'Colosse blindé aux rafales chargées et au pas pesant.',
    'bestiary.sentinel.name': 'Sentinelle',
    'bestiary.sentinel.desc': 'Unité de sécurité vigilante gardant les secteurs profonds.',

    'worlds.kicker': 'ENVIRONNEMENTS',
    'worlds.heading': 'Secteurs en effondrement',
    'worlds.sub': 'Décors réels de l’installation.',
    'worlds.cryo': 'Cathédrale cryogénique',
    'worlds.foundry': 'Fonderie en fusion',
    'worlds.biolab': 'Biolab envahi',
    'worlds.void': 'Flèche du vide',
    'worlds.reactor': 'Cœur du réacteur',
    'worlds.megacity': 'Mégapole en ruines',

    'cta.kicker': 'PROTOCOLE FINAL',
    'cta.heading': 'Entre dans la brèche',
    'cta.body': 'La démo tourne dans ton navigateur. Aucune installation. Lance-la.',
    'cta.button': 'Lancer la démo',
    'cta.controlsTitle': 'Commandes',
    'controls.move': 'Bouger',
    'controls.jump': 'Sauter',
    'controls.dash': 'Dash',
    'controls.sword': 'Lame',
    'controls.energy': 'Énergie',
    'controls.interact': 'Interagir',

    'footer.note': 'Démo navigateur · Conçu avec Phaser',
    'footer.disclaimer': 'Future Failure — build de démonstration en développement.',
  },
};

export function resolveInitialLang(stored: string | null): Lang | null {
  if (stored && stored in translations) return stored as Lang;
  return null;
}

export function guessLang(navigatorLang: string | undefined): Lang {
  const code = (navigatorLang ?? '').slice(0, 2).toLowerCase();
  if (code in translations) return code as Lang;
  return DEFAULT_LANG;
}
