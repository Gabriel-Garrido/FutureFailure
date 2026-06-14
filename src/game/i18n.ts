import { DEFAULT_LANG, STORAGE_KEY, type Lang } from '../landing/i18n';

export { DEFAULT_LANG, STORAGE_KEY, type Lang };

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO ADD OR CHANGE GAME TEXT (scalable, all-languages-at-once):
//   1. Add the field to the `GameText` type below.
//   2. TypeScript will immediately flag every language in `gameTranslations`
//      that is missing it (because it is typed `Record<Lang, GameText>`), so you
//      fill the new string for ES / EN / PT / FR right where you see the error.
//   3. Run `npm run test:i18n` to confirm every language (game + landing) shares
//      the exact same key structure, including array lengths.
// Adding a whole new language = add it to `LANGS` in ../landing/i18n.ts; the
// `Record<Lang, …>` typing then forces a complete translation here too.
// ─────────────────────────────────────────────────────────────────────────────

export const GAME_LANGS: ReadonlyArray<{ code: Lang; label: string }> = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'pt', label: 'PT' },
  { code: 'fr', label: 'FR' },
];

export type GameText = {
  title: string;
  subtitle: string;
  menu: {
    start: string;
    premise: string;
    route: string;
    controls: string;
    kicker: string;
    heading: string;
    tagline: string;
    launch: string;
    controlsTitle: string;
    resetHint: string;
    controlKeys: ReadonlyArray<{ key: string; label: string }>;
  };
  hud: {
    health: string;
    energy: string;
    keycardOff: string;
    keycardOn: string;
    mapTitle: string;
    debug: string;
    controls: string;
  };
  pause: {
    title: string;
    resume: string;
    objective: string;
    controls: string;
  };
  gameOver: {
    title: string;
    subtitle: string;
    action: string;
  };
  objectives: {
    first: string;
    movementComplete: string;
    combatComplete: string;
    hasKeycard: string;
    securityReduced: string;
    portalReady: string;
    portalLocked: string;
    levelComplete: string;
  };
  guidance: {
    start: string;
    climb: string;
    wallJump: string;
    hub: string;
    reactor: string;
    returnWithKey: string;
    maintenance: string;
    gauntlet: string;
    arena: string;
    boss: string;
    exit: string;
  };
  prompts: { readTerminal: string };
  terminals: { intro: string; fork: string; exit: string };
  zones: {
    bay: string;
    maintenance: string;
    hub: string;
    reactor: string;
    arena: string;
    boss: string;
    exit: string;
  };
  subscribe: {
    eyebrow: string;
    title: string;
    body: string;
    placeholder: string;
    submit: string;
    sending: string;
    success: string;
    error: string;
    invalid: string;
    skip: string;
    privacy: string;
  };
};

export const gameTranslations: Record<Lang, GameText> = {
  es: {
    title: 'FUTURE FAILURE',
    subtitle: 'Protocolo de Contencion',
    menu: {
      start: 'Pulsa X / A / Click para iniciar',
      premise: 'Completa modulos y llega a la derecha.',
      route: 'Domina controles, recoge tarjeta y limpia la arena.',
      controls: 'Flechas | X salto | Z dash | C espada | V energia | Arriba usar',
      kicker: 'ÚLTIMO PROTOCOLO',
      heading: 'Entra en la brecha',
      tagline: 'Domina el movimiento, el combate y cruza el portal.',
      launch: 'INICIAR',
      controlsTitle: 'CONTROLES',
      resetHint: 'R — borrar guardado',
      controlKeys: [
        { key: '← →', label: 'MOVER' },
        { key: 'X', label: 'SALTAR' },
        { key: 'Z', label: 'DASH' },
        { key: 'C', label: 'ESPADA' },
        { key: 'V', label: 'ENERGÍA' },
        { key: '↑', label: 'INTERACTUAR' },
      ],
    },
    hud: {
      health: 'VIDA',
      energy: 'ENERGIA',
      keycardOff: 'TARJETA --',
      keycardOn: 'TARJETA OK',
      mapTitle: 'MAPA',
      debug: 'F3 DEBUG',
      controls: 'Esc: ayuda',
    },
    pause: {
      title: 'PAUSA',
      resume: 'Esc para continuar',
      objective: 'Objetivo: llega al extremo derecho.',
      controls: 'Flechas: mover\nX: saltar\nZ: dash\nC: espada\nV: energia\nArriba: interactuar',
    },
    gameOver: {
      title: 'SENAL PERDIDA',
      subtitle: 'Reiniciaras desde el inicio del protocolo.',
      action: 'Pulsa X / A / Click para reaparecer',
    },
    objectives: {
      first: 'Avanza a la derecha.',
      movementComplete: 'Movimiento validado.',
      combatComplete: 'Seguridad neutralizada.',
      hasKeycard: 'Tarjeta obtenida.',
      securityReduced: 'Defensa neutralizada.',
      portalReady: 'Entra al portal.',
      portalLocked: 'Despeja la arena.',
      levelComplete: 'Fallo contenido.',
    },
    guidance: {
      start: 'Corre y salta.',
      climb: 'Usa dash en el aire.',
      wallJump: 'Sube con la pared.',
      hub: 'Lee y combate.',
      reactor: 'Recoge la tarjeta.',
      returnWithKey: 'Vuelve a la ruta principal.',
      maintenance: 'Sube por mantenimiento.',
      gauntlet: 'Avanza con cuidado.',
      arena: 'Limpia la arena.',
      boss: 'Derrota al mech guardian.',
      exit: 'Cruza el portal.',
    },
    prompts: { readTerminal: 'Arriba: leer' },
    terminals: {
      intro: 'Ruta: salta, dash, pared, combate.',
      fork: 'Derrota al soldado y sigue.',
      exit: 'Limpia la arena y sal.',
    },
    zones: {
      bay: 'Bahia de despertar',
      maintenance: 'Mantenimiento superior',
      hub: 'Nucleo de seguridad',
      reactor: 'Drenaje del reactor',
      arena: 'Arena final',
      boss: 'Camara del nucleo',
      exit: 'Salida de grieta',
    },
    subscribe: {
      eyebrow: 'PROTOCOLO CONTENIDO',
      title: 'Has cruzado la brecha',
      body: 'Future Failure sigue en desarrollo. Suscríbete y recibe novedades, nuevos niveles y la versión completa.',
      placeholder: 'tu@correo.com',
      submit: 'Suscribirme',
      sending: 'Enviando…',
      success: '¡Gracias! Te avisaremos de cada avance.',
      error: 'No se pudo enviar. Inténtalo de nuevo.',
      invalid: 'Introduce un correo válido.',
      skip: 'Volver al inicio',
      privacy: 'Solo novedades del juego. Sin spam, cancela cuando quieras.',
    },
  },

  en: {
    title: 'FUTURE FAILURE',
    subtitle: 'Containment Protocol',
    menu: {
      start: 'Press X / A / Click to start',
      premise: 'Complete modules and reach the right.',
      route: 'Master controls, grab the keycard and clear the arena.',
      controls: 'Arrows | X jump | Z dash | C blade | V energy | Up interact',
      kicker: 'FINAL PROTOCOL',
      heading: 'Enter the breach',
      tagline: 'Master movement, combat and cross the portal.',
      launch: 'LAUNCH',
      controlsTitle: 'CONTROLS',
      resetHint: 'R — clear save data',
      controlKeys: [
        { key: '← →', label: 'MOVE' },
        { key: 'X', label: 'JUMP' },
        { key: 'Z', label: 'DASH' },
        { key: 'C', label: 'BLADE' },
        { key: 'V', label: 'ENERGY' },
        { key: '↑', label: 'INTERACT' },
      ],
    },
    hud: {
      health: 'HEALTH',
      energy: 'ENERGY',
      keycardOff: 'KEYCARD --',
      keycardOn: 'KEYCARD OK',
      mapTitle: 'MAP',
      debug: 'F3 DEBUG',
      controls: 'Esc: help',
    },
    pause: {
      title: 'PAUSED',
      resume: 'Esc to resume',
      objective: 'Objective: reach the far right.',
      controls: 'Arrows: move\nX: jump\nZ: dash\nC: blade\nV: energy\nUp: interact',
    },
    gameOver: {
      title: 'SIGNAL LOST',
      subtitle: 'You will restart from the beginning of the protocol.',
      action: 'Press X / A / Click to respawn',
    },
    objectives: {
      first: 'Advance to the right.',
      movementComplete: 'Movement validated.',
      combatComplete: 'Security neutralized.',
      hasKeycard: 'Keycard obtained.',
      securityReduced: 'Defense neutralized.',
      portalReady: 'Enter the portal.',
      portalLocked: 'Clear the arena.',
      levelComplete: 'Failure contained.',
    },
    guidance: {
      start: 'Run and jump.',
      climb: 'Air dash to climb.',
      wallJump: 'Wall jump to ascend.',
      hub: 'Read and fight.',
      reactor: 'Get the keycard.',
      returnWithKey: 'Return to the main route.',
      maintenance: 'Climb through maintenance.',
      gauntlet: 'Advance carefully.',
      arena: 'Clear the arena.',
      boss: 'Defeat the guardian mech.',
      exit: 'Cross the portal.',
    },
    prompts: { readTerminal: 'Up: read' },
    terminals: {
      intro: 'Route: jump, dash, wall, combat.',
      fork: 'Defeat the trooper and proceed.',
      exit: 'Clear the arena and leave.',
    },
    zones: {
      bay: 'Awakening bay',
      maintenance: 'Upper maintenance',
      hub: 'Security core',
      reactor: 'Reactor drain',
      arena: 'Final arena',
      boss: 'Core chamber',
      exit: 'Breach exit',
    },
    subscribe: {
      eyebrow: 'FAILURE CONTAINED',
      title: 'You crossed the breach',
      body: 'Future Failure is still in development. Subscribe for updates, new levels and the full release.',
      placeholder: 'you@email.com',
      submit: 'Subscribe',
      sending: 'Sending…',
      success: 'Thanks! We will keep you posted on every update.',
      error: 'Could not send. Please try again.',
      invalid: 'Enter a valid email.',
      skip: 'Back to start',
      privacy: 'Game updates only. No spam, unsubscribe anytime.',
    },
  },

  pt: {
    title: 'FUTURE FAILURE',
    subtitle: 'Protocolo de Contenção',
    menu: {
      start: 'Pressione X / A / Clique para iniciar',
      premise: 'Complete módulos e chegue à direita.',
      route: 'Domine os controles, pegue o cartão e limpe a arena.',
      controls: 'Setas | X pular | Z dash | C lâmina | V energia | Cima usar',
      kicker: 'PROTOCOLO FINAL',
      heading: 'Entre na brecha',
      tagline: 'Domine o movimento, o combate e cruze o portal.',
      launch: 'INICIAR',
      controlsTitle: 'CONTROLES',
      resetHint: 'R — limpar save',
      controlKeys: [
        { key: '← →', label: 'MOVER' },
        { key: 'X', label: 'PULAR' },
        { key: 'Z', label: 'DASH' },
        { key: 'C', label: 'LÂMINA' },
        { key: 'V', label: 'ENERGIA' },
        { key: '↑', label: 'INTERAGIR' },
      ],
    },
    hud: {
      health: 'VIDA',
      energy: 'ENERGIA',
      keycardOff: 'CARTÃO --',
      keycardOn: 'CARTÃO OK',
      mapTitle: 'MAPA',
      debug: 'F3 DEBUG',
      controls: 'Esc: ajuda',
    },
    pause: {
      title: 'PAUSA',
      resume: 'Esc para continuar',
      objective: 'Objetivo: chegue ao extremo direito.',
      controls: 'Setas: mover\nX: pular\nZ: dash\nC: lâmina\nV: energia\nCima: interagir',
    },
    gameOver: {
      title: 'SINAL PERDIDO',
      subtitle: 'Você reiniciará desde o início do protocolo.',
      action: 'Pressione X / A / Clique para reaparecer',
    },
    objectives: {
      first: 'Avance para a direita.',
      movementComplete: 'Movimento validado.',
      combatComplete: 'Segurança neutralizada.',
      hasKeycard: 'Cartão obtido.',
      securityReduced: 'Defesa neutralizada.',
      portalReady: 'Entre no portal.',
      portalLocked: 'Limpe a arena.',
      levelComplete: 'Falha contida.',
    },
    guidance: {
      start: 'Corra e pule.',
      climb: 'Dash no ar para subir.',
      wallJump: 'Suba pela parede.',
      hub: 'Leia e lute.',
      reactor: 'Pegue o cartão.',
      returnWithKey: 'Volte à rota principal.',
      maintenance: 'Suba pela manutenção.',
      gauntlet: 'Avance com cuidado.',
      arena: 'Limpe a arena.',
      boss: 'Derrote o mech guardião.',
      exit: 'Cruze o portal.',
    },
    prompts: { readTerminal: 'Cima: ler' },
    terminals: {
      intro: 'Rota: pule, dash, parede, combate.',
      fork: 'Derrote o soldado e prossiga.',
      exit: 'Limpe a arena e saia.',
    },
    zones: {
      bay: 'Baía do despertar',
      maintenance: 'Manutenção superior',
      hub: 'Núcleo de segurança',
      reactor: 'Dreno do reator',
      arena: 'Arena final',
      boss: 'Câmara do núcleo',
      exit: 'Saída da brecha',
    },
    subscribe: {
      eyebrow: 'FALHA CONTIDA',
      title: 'Você cruzou a brecha',
      body: 'Future Failure ainda está em desenvolvimento. Inscreva-se para receber novidades, novos níveis e a versão completa.',
      placeholder: 'voce@email.com',
      submit: 'Inscrever-me',
      sending: 'Enviando…',
      success: 'Obrigado! Avisaremos a cada novidade.',
      error: 'Não foi possível enviar. Tente novamente.',
      invalid: 'Insira um e-mail válido.',
      skip: 'Voltar ao início',
      privacy: 'Apenas novidades do jogo. Sem spam, cancele quando quiser.',
    },
  },

  fr: {
    title: 'FUTURE FAILURE',
    subtitle: 'Protocole de Confinement',
    menu: {
      start: 'Appuie sur X / A / Clic pour démarrer',
      premise: 'Complète les modules et atteins la droite.',
      route: "Maîtrise les commandes, prends le badge et nettoie l'arène.",
      controls: 'Flèches | X sauter | Z dash | C lame | V énergie | Haut interagir',
      kicker: 'PROTOCOLE FINAL',
      heading: 'Entre dans la brèche',
      tagline: 'Maîtrise le mouvement, le combat et traverse le portail.',
      launch: 'LANCER',
      controlsTitle: 'COMMANDES',
      resetHint: 'R — effacer sauvegarde',
      controlKeys: [
        { key: '← →', label: 'BOUGER' },
        { key: 'X', label: 'SAUTER' },
        { key: 'Z', label: 'DASH' },
        { key: 'C', label: 'LAME' },
        { key: 'V', label: 'ÉNERGIE' },
        { key: '↑', label: 'INTERAGIR' },
      ],
    },
    hud: {
      health: 'VIE',
      energy: 'ÉNERGIE',
      keycardOff: 'BADGE --',
      keycardOn: 'BADGE OK',
      mapTitle: 'CARTE',
      debug: 'F3 DEBUG',
      controls: 'Esc: aide',
    },
    pause: {
      title: 'PAUSE',
      resume: 'Esc pour reprendre',
      objective: 'Objectif : atteindre le côté droit.',
      controls: 'Flèches: bouger\nX: sauter\nZ: dash\nC: lame\nV: énergie\nHaut: interagir',
    },
    gameOver: {
      title: 'SIGNAL PERDU',
      subtitle: 'Tu recommenceras depuis le début du protocole.',
      action: 'Appuie sur X / A / Clic pour réapparaître',
    },
    objectives: {
      first: 'Avance vers la droite.',
      movementComplete: 'Mouvement validé.',
      combatComplete: 'Sécurité neutralisée.',
      hasKeycard: 'Badge obtenu.',
      securityReduced: 'Défense neutralisée.',
      portalReady: 'Entre dans le portail.',
      portalLocked: "Nettoie l'arène.",
      levelComplete: 'Échec contenu.',
    },
    guidance: {
      start: 'Cours et saute.',
      climb: "Dash en l'air pour grimper.",
      wallJump: 'Monte au mur.',
      hub: 'Lis et combats.',
      reactor: 'Prends le badge.',
      returnWithKey: 'Retourne à la route principale.',
      maintenance: 'Monte par la maintenance.',
      gauntlet: 'Avance prudemment.',
      arena: "Nettoie l'arène.",
      boss: 'Vaincs le mech gardien.',
      exit: 'Traverse le portail.',
    },
    prompts: { readTerminal: 'Haut: lire' },
    terminals: {
      intro: 'Route: saute, dash, mur, combat.',
      fork: 'Élimine le soldat et continue.',
      exit: "Nettoie l'arène et sors.",
    },
    zones: {
      bay: 'Baie du réveil',
      maintenance: 'Maintenance supérieure',
      hub: 'Cœur de sécurité',
      reactor: 'Drain du réacteur',
      arena: 'Arène finale',
      boss: 'Chambre du noyau',
      exit: 'Sortie de la brèche',
    },
    subscribe: {
      eyebrow: 'ÉCHEC CONTENU',
      title: 'Tu as traversé la brèche',
      body: 'Future Failure est encore en développement. Abonne-toi pour recevoir les nouveautés, les nouveaux niveaux et la version complète.',
      placeholder: 'toi@email.com',
      submit: "M'abonner",
      sending: 'Envoi…',
      success: 'Merci ! Nous te tiendrons informé de chaque avancée.',
      error: "Échec de l'envoi. Réessaie.",
      invalid: 'Saisis un e-mail valide.',
      skip: "Retour à l'accueil",
      privacy: 'Uniquement les nouveautés du jeu. Pas de spam, désabonnement à tout moment.',
    },
  },
};

export function getCurrentLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in gameTranslations) return stored as Lang;
  } catch { /* localStorage unavailable */ }
  return DEFAULT_LANG;
}

export function setGameLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch { /* ignore */ }
}

export function gt(): GameText {
  return gameTranslations[getCurrentLang()];
}
