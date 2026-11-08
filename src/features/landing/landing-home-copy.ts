// The landing page's text, French and English: one long page (hero with
// the live editor, features, desktop, offline, the small things, open
// source, a closing call to action, the footer). The live editor, the
// examples and their texts stay in landing-copy.ts.

import type { LandingLang } from "./landing-copy";

/** Screenshot slots on the page, filled in landing-shots.ts (HOME_SHOTS). */
export type HomeShotId =
  | "rooms"
  | "collaboration"
  | "databases"
  | "teamspaces"
  | "comments"
  | "chat"
  | "sharing"
  | "desktop"
  | "offline";

/** Sections the nav scrolls to. */
export type HomeSectionId = "features" | "desktop" | "offline" | "open-source";

export interface HomeCopy {
  nav: {
    label: string;
    items: { id: HomeSectionId; label: string }[];
    github: string;
    menu: string;
    close: string;
  };
  hero: {
    badge: string;
    badgeText: string;
    title1: string;
    title2: string;
    lead: string;
    primary: string;
    download: string;
    fine: string;
    tabs: { pages: string; databases: string; rooms: string };
    hint: string;
  };
  audience: { title: string; items: { emoji: string; label: string }[] };
  features: {
    eyebrow: string;
    title: string;
    lead: string;
    items: { shot: HomeShotId; title: string; body: string }[];
  };
  desktop: {
    eyebrow: string;
    title: string;
    lead: string;
    points: string[];
    cta: string;
  };
  offline: { eyebrow: string; title: string; lead: string; points: string[] };
  small: {
    eyebrow: string;
    title: string;
    items: { glyph: string; title: string; body: string }[];
  };
  oss: {
    eyebrow: string;
    title1: string;
    title2: string;
    lead: string;
    github: string;
    discord: string;
    facts: { emoji: string; title: string; body: string }[];
  };
  final: { title: string; lead: string };
  footer: {
    tagline: string;
    columns: { title: string; links: { label: string; href: string }[] }[];
    rights: string;
  };
  /** A screenshot slot without its image yet. */
  shot: Record<HomeShotId, string>;
}

export const GITHUB_URL = "https://github.com/Sall25/folio";
export const RELEASES_URL = `${GITHUB_URL}/releases/latest`;
/** The Discord invite (VITE_DISCORD_URL); without it the Discord links are
 *  left out. */
export const DISCORD_URL =
  (import.meta.env.VITE_DISCORD_URL as string | undefined) || null;

const footerColumns = (
  t: Record<string, string>,
): HomeCopy["footer"]["columns"] => [
  {
    title: t.product,
    links: [
      { label: t.features, href: "#features" },
      { label: t.desktop, href: "#desktop" },
      { label: t.whatsNew, href: `${GITHUB_URL}/releases` },
    ],
  },
  {
    title: t.project,
    links: [
      { label: "GitHub", href: GITHUB_URL },
      {
        label: t.contributing,
        href: `${GITHUB_URL}/blob/main/CONTRIBUTING.md`,
      },
      { label: t.issues, href: `${GITHUB_URL}/issues` },
    ],
  },
  {
    title: t.community,
    links: [
      ...(DISCORD_URL ? [{ label: "Discord", href: DISCORD_URL }] : []),
      { label: t.discussions, href: `${GITHUB_URL}/discussions` },
    ],
  },
  {
    title: t.legal,
    links: [{ label: t.license, href: `${GITHUB_URL}/blob/main/LICENSE` }],
  },
];

export const HOME_COPY: Record<LandingLang, HomeCopy> = {
  en: {
    nav: {
      label: "Sections",
      items: [
        { id: "features", label: "Features" },
        { id: "desktop", label: "Desktop" },
        { id: "offline", label: "Offline" },
        { id: "open-source", label: "Open source" },
      ],
      github: "GitHub",
      menu: "Menu",
      close: "Close the menu",
    },
    hero: {
      badge: "New",
      badgeText: "The desktop app is here: Windows, macOS, Linux",
      title1: "Your docs, wiki and resources,",
      title2: "all in one place",
      lead: "Folio is the open-source workspace where teams, schools and communities write, organize and share what they know. Pages, databases and chat, together, online or offline.",
      primary: "Get started free",
      download: "Download the desktop app",
      fine: "Free and open source · AGPL-3.0",
      tabs: { pages: "Pages", databases: "Databases", rooms: "Rooms" },
      hint: "This is the real editor. Type / to try it.",
    },
    audience: {
      title: "Made for people who keep knowledge together",
      items: [
        { emoji: "🎓", label: "Schools and courses" },
        { emoji: "🏫", label: "Student associations" },
        { emoji: "🧑‍💻", label: "Small teams" },
        { emoji: "🌍", label: "Communities" },
        { emoji: "📖", label: "Open-source projects" },
      ],
    },
    features: {
      eyebrow: "Features",
      title: "Everything your team needs to work together",
      lead: "One workspace instead of five apps: write, organize, discuss and share, with the people who need it.",
      items: [
        {
          shot: "collaboration",
          title: "Real-time collaboration",
          body: "Edit the same page together and see each other's cursors. Changes sync instantly.",
        },
        {
          shot: "databases",
          title: "Databases",
          body: "Tables, boards, calendars and timelines, with filters, formulas and relations.",
        },
        {
          shot: "teamspaces",
          title: "Teamspaces",
          body: "A space per team, class or project, with its own members, pages and colour.",
        },
        {
          shot: "comments",
          title: "Comments and suggestions",
          body: "Discuss any line, suggest edits, resolve threads when it's settled.",
        },
        {
          shot: "chat",
          title: "Rooms",
          body: "Chat next to your pages. Link a page, pin a message, keep decisions in context.",
        },
        {
          shot: "sharing",
          title: "Sharing and publishing",
          body: "Invite people or groups, give guests access to a single page, publish to the web.",
        },
      ],
    },
    desktop: {
      eyebrow: "Desktop app",
      title: "Folio on your desktop",
      lead: "The same workspace in a window of its own, made for long working sessions.",
      points: [
        "Tabs, split view and pages in their own windows",
        "Pages open instantly from your computer",
        "Notifications and an unread count on the app icon",
        "Windows, macOS and Linux",
      ],
      cta: "Download the desktop app",
    },
    offline: {
      eyebrow: "Offline",
      title: "Keep working without a connection",
      lead: "Pages you've opened stay with you. Edit on the train, in class or anywhere the Wi-Fi drops: your changes sync when you're back.",
      points: [
        "Keep a whole workspace available offline",
        "Unsent edits are never lost",
        "Edits made apart merge on their own",
      ],
    },
    small: {
      eyebrow: "See it in action",
      title: "The small things that make it fast",
      items: [
        {
          glyph: "/",
          title: "Slash menu",
          body: "Type / to add any block: tables, databases, embeds, equations.",
        },
        {
          glyph: "@",
          title: "Mentions",
          body: "Mention people, pages and dates; reminders land in the inbox.",
        },
        {
          glyph: "⌘P",
          title: "Search",
          body: "Find any page in every workspace, from anywhere.",
        },
        {
          glyph: "▤",
          title: "Templates",
          body: "Start from a wiki, a tracker, meeting notes or a course.",
        },
      ],
    },
    oss: {
      eyebrow: "Open source",
      title1: "Built in the open.",
      title2: "Yours to keep.",
      lead: "Folio's code is public under AGPL-3.0. Read it, run it on your own server, suggest a change, or help build what comes next.",
      github: "Star on GitHub",
      discord: "Join the Discord",
      facts: [
        {
          emoji: "⚖️",
          title: "AGPL-3.0",
          body: "Free to use, study and change",
        },
        { emoji: "🖥️", title: "Self-host", body: "Run it on your own server" },
        { emoji: "🌍", title: "Two languages", body: "English and French" },
        { emoji: "🤝", title: "Community", body: "Discord and GitHub" },
      ],
    },
    final: {
      title: "Start writing together today",
      lead: "Free, open source, on the web and on your desktop.",
    },
    footer: {
      tagline: "The open-source workspace for docs, wikis and resources.",
      columns: footerColumns({
        product: "Product",
        features: "Features",
        desktop: "Desktop app",
        whatsNew: "What's new",
        project: "Project",
        contributing: "Contributing",
        issues: "Issues",
        community: "Community",
        discussions: "GitHub Discussions",
        legal: "Legal",
        license: "License (AGPL-3.0)",
      }),
      rights: "© 2026 Folio",
    },
    shot: {
      rooms: "Screenshot: a room, its messages and a linked page",
      collaboration: "Screenshot: two cursors on one page",
      databases: "Screenshot: a database as a table or board",
      teamspaces: "Screenshot: the teamspaces list",
      comments: "Screenshot: a comment thread on a line",
      chat: "Screenshot: a room's messages",
      sharing: "Screenshot: the share menu",
      desktop: "Screenshot: the desktop app with tabs",
      offline: "Screenshot: Available offline settings",
    },
  },
  fr: {
    nav: {
      label: "Sections",
      items: [
        { id: "features", label: "Fonctionnalités" },
        { id: "desktop", label: "Application" },
        { id: "offline", label: "Hors ligne" },
        { id: "open-source", label: "Open source" },
      ],
      github: "GitHub",
      menu: "Menu",
      close: "Fermer le menu",
    },
    hero: {
      badge: "Nouveau",
      badgeText: "L'application de bureau est là : Windows, macOS, Linux",
      title1: "Vos docs, wiki et ressources,",
      title2: "au même endroit",
      lead: "Folio est l'espace de travail open source où équipes, écoles et communautés écrivent, organisent et partagent ce qu'elles savent. Pages, bases de données et discussions, ensemble, en ligne ou hors ligne.",
      primary: "Commencer gratuitement",
      download: "Télécharger l'application",
      fine: "Gratuit et open source · AGPL-3.0",
      tabs: { pages: "Pages", databases: "Bases de données", rooms: "Salons" },
      hint: "C'est le vrai éditeur. Tapez / pour essayer.",
    },
    audience: {
      title: "Pour celles et ceux qui rassemblent le savoir",
      items: [
        { emoji: "🎓", label: "Écoles et cours" },
        { emoji: "🏫", label: "Associations étudiantes" },
        { emoji: "🧑‍💻", label: "Petites équipes" },
        { emoji: "🌍", label: "Communautés" },
        { emoji: "📖", label: "Projets open source" },
      ],
    },
    features: {
      eyebrow: "Fonctionnalités",
      title: "Tout ce qu'il faut pour travailler ensemble",
      lead: "Un seul espace au lieu de cinq applications : écrire, organiser, discuter et partager, avec les bonnes personnes.",
      items: [
        {
          shot: "collaboration",
          title: "Collaboration en temps réel",
          body: "Modifiez la même page ensemble et voyez les curseurs des autres. Tout se synchronise aussitôt.",
        },
        {
          shot: "databases",
          title: "Bases de données",
          body: "Tableaux, kanbans, calendriers et frises, avec filtres, formules et relations.",
        },
        {
          shot: "teamspaces",
          title: "Espaces d'équipe",
          body: "Un espace par équipe, classe ou projet, avec ses membres, ses pages et sa couleur.",
        },
        {
          shot: "comments",
          title: "Commentaires et suggestions",
          body: "Discutez n'importe quelle ligne, suggérez des modifications, clôturez quand c'est réglé.",
        },
        {
          shot: "chat",
          title: "Salons",
          body: "Discutez à côté de vos pages. Liez une page, épinglez un message, gardez les décisions en contexte.",
        },
        {
          shot: "sharing",
          title: "Partage et publication",
          body: "Invitez des personnes ou des groupes, ouvrez une seule page à des invités, publiez sur le web.",
        },
      ],
    },
    desktop: {
      eyebrow: "Application de bureau",
      title: "Folio sur votre ordinateur",
      lead: "Le même espace de travail dans sa propre fenêtre, pensé pour les longues sessions.",
      points: [
        "Onglets, vue côte à côte et pages dans leur propre fenêtre",
        "Les pages s'ouvrent instantanément depuis votre ordinateur",
        "Notifications et nombre de non-lus sur l'icône",
        "Windows, macOS et Linux",
      ],
      cta: "Télécharger l'application",
    },
    offline: {
      eyebrow: "Hors ligne",
      title: "Continuez sans connexion",
      lead: "Les pages déjà ouvertes restent avec vous. Écrivez dans le train, en cours ou là où le Wi-Fi lâche : tout se synchronise à votre retour.",
      points: [
        "Gardez tout un espace de travail disponible hors ligne",
        "Les modifications non envoyées ne se perdent jamais",
        "Les modifications faites séparément se fusionnent seules",
      ],
    },
    small: {
      eyebrow: "En pratique",
      title: "Les petits détails qui font gagner du temps",
      items: [
        {
          glyph: "/",
          title: "Menu /",
          body: "Tapez / pour ajouter un bloc : tableaux, bases de données, intégrations, équations.",
        },
        {
          glyph: "@",
          title: "Mentions",
          body: "Mentionnez des personnes, des pages et des dates ; les rappels arrivent dans la boîte.",
        },
        {
          glyph: "⌘P",
          title: "Recherche",
          body: "Retrouvez n'importe quelle page, dans tous vos espaces, de partout.",
        },
        {
          glyph: "▤",
          title: "Modèles",
          body: "Partez d'un wiki, d'un suivi, de notes de réunion ou d'un cours.",
        },
      ],
    },
    oss: {
      eyebrow: "Open source",
      title1: "Construit en public.",
      title2: "À vous pour de bon.",
      lead: "Le code de Folio est public sous licence AGPL-3.0. Lisez-le, hébergez-le sur votre serveur, proposez une modification ou aidez à construire la suite.",
      github: "Étoile sur GitHub",
      discord: "Rejoindre le Discord",
      facts: [
        {
          emoji: "⚖️",
          title: "AGPL-3.0",
          body: "Libre d'utiliser, d'étudier et de modifier",
        },
        {
          emoji: "🖥️",
          title: "Auto-hébergement",
          body: "Sur votre propre serveur",
        },
        { emoji: "🌍", title: "Deux langues", body: "Français et anglais" },
        { emoji: "🤝", title: "Communauté", body: "Discord et GitHub" },
      ],
    },
    final: {
      title: "Commencez à écrire ensemble dès aujourd'hui",
      lead: "Gratuit, open source, sur le web et sur votre ordinateur.",
    },
    footer: {
      tagline:
        "L'espace de travail open source pour vos docs, wikis et ressources.",
      columns: footerColumns({
        product: "Produit",
        features: "Fonctionnalités",
        desktop: "Application de bureau",
        whatsNew: "Nouveautés",
        project: "Projet",
        contributing: "Contribuer",
        issues: "Signaler un problème",
        community: "Communauté",
        discussions: "Discussions GitHub",
        legal: "Mentions",
        license: "Licence (AGPL-3.0)",
      }),
      rights: "© 2026 Folio",
    },
    shot: {
      rooms: "Capture : un salon, ses messages et une page liée",
      collaboration: "Capture : deux curseurs sur une page",
      databases: "Capture : une base de données en tableau ou kanban",
      teamspaces: "Capture : la liste des espaces d'équipe",
      comments: "Capture : un fil de commentaires sur une ligne",
      chat: "Capture : les messages d'un salon",
      sharing: "Capture : le menu de partage",
      desktop: "Capture : l'application de bureau avec ses onglets",
      offline: "Capture : les réglages Disponible hors ligne",
    },
  },
};
