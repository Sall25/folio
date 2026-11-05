// All landing text, French and English. The page is a product tour: a top
// nav of pages (Editor, Organize, Teamspaces, Together, Offline), each made
// of feature sections ending with "Try it yourself" examples that open in
// the real editor.
//
// Positioning: a workspace for docs, wikis and resources. Schools and
// students are one audience among several, so the copy stays general.

import type { ShowcaseId } from "../showcase/showcases";

export type LandingLang = "fr" | "en";

export type SectionId =
  | "overview"
  | "editor"
  | "blocks"
  | "covers"
  | "templates"
  | "workspaces"
  | "teamspaces"
  | "databases"
  | "collaboration"
  | "comments"
  | "rooms"
  | "offline";

/** Pages in the top nav (the overview is the logo / "#/"). */
export type NavId =
  "editor" | "organize" | "teamspaces" | "together" | "offline";

/** Screenshot slots, filled in landing-shots.ts once the images exist. */
export type ShotId = "B" | "C" | "E" | "F" | "G" | "H";

export type SectionVisual =
  | { kind: "editor"; examples: ShowcaseId[] }
  | { kind: "collab"; example: ShowcaseId }
  | { kind: "blocks" }
  | { kind: "templates" }
  | { kind: "databases" }
  | { kind: "shot"; shot: ShotId; ratio: string }
  | { kind: "offline" };

export interface SectionCopy {
  /** Name in the sidebar and on tour cards. */
  label: string;
  /** One line for the tour card. */
  blurb: string;
  heading: string;
  lead: string;
  points?: { title: string; body: string }[];
}

/** Language-independent shape of the tour. */
export const TOUR: {
  nav: { id: NavId; sections: Exclude<SectionId, "overview">[] }[];
  visuals: Record<Exclude<SectionId, "overview">, SectionVisual>;
  tries: Partial<Record<SectionId, ShowcaseId[]>>;
} = {
  nav: [
    { id: "editor", sections: ["editor", "blocks", "covers"] },
    // Databases and templates live here until they get their own pages.
    { id: "organize", sections: ["workspaces", "databases", "templates"] },
    { id: "teamspaces", sections: ["teamspaces"] },
    { id: "together", sections: ["collaboration", "comments", "rooms"] },
    { id: "offline", sections: ["offline"] },
  ],
  visuals: {
    editor: { kind: "editor", examples: ["getting-started", "blocks"] },
    blocks: { kind: "blocks" },
    covers: { kind: "shot", shot: "B", ratio: "16 / 10" },
    templates: { kind: "templates" },
    workspaces: { kind: "shot", shot: "C", ratio: "16 / 10" },
    teamspaces: { kind: "shot", shot: "F", ratio: "16 / 9" },
    databases: { kind: "databases" },
    collaboration: { kind: "collab", example: "meeting-notes" },
    comments: { kind: "shot", shot: "G", ratio: "16 / 9" },
    rooms: { kind: "shot", shot: "H", ratio: "16 / 9" },
    offline: { kind: "offline" },
  },
  tries: {
    overview: ["meeting-notes", "course", "team-wiki"],
    editor: ["getting-started", "blocks"],
    blocks: ["blocks", "course"],
    covers: ["team-wiki", "meeting-notes"],
    templates: ["meeting-notes", "team-wiki", "project-tracker", "course"],
    teamspaces: ["team-wiki"],
    databases: ["project-tracker", "databases"],
    collaboration: ["collaborate"],
    comments: ["collaborate", "meeting-notes"],
  },
};

export interface LandingCopy {
  header: {
    signIn: string;
    cta: string;
    menu: string;
    themeLight: string;
    themeDark: string;
    language: string;
    tour: string;
  };
  nav: Record<NavId, string>;
  sections: Record<SectionId, SectionCopy>;
  hero: { title: string; lead: string; primary: string; secondary: string };
  /** The overview page (design C): split hero, bento, FAQ. */
  overview: {
    eyebrow: string;
    title1: string;
    title2: string;
    titleAccent: string;
    lead: string;
    hint: string;
    bentoTitle: string;
    faqTitle: string;
    faq: { q: string; a: string }[];
  };
  editor: {
    badge: string;
    hint: string;
    reset: string;
    /** Opens the current example on its own page, nothing around it. */
    fullScreen: string;
    examples: string;
    addIcon: string;
    addCover: string;
    changeCover: string;
    removeCover: string;
  };
  collab: { hint: string; window: (name: string) => string };
  tour: string;
  tryTitle: string;
  /** What each example shows, under its title on a "Try it" card. */
  tryMeta: Record<ShowcaseId, string>;
  example: {
    badge: string;
    banner: string;
    useTemplate: string;
    back: string;
    reset: string;
  };
  shot: Record<ShotId, string>;
  blockGroups: { title: string; items: { name: string; body: string }[] }[];
  views: string[];
  templatesUse: string;
  offlineSteps: {
    pill: string;
    text: string;
    tone: "online" | "offline" | "synced";
  }[];
  roles: { title: string; items: { title: string; body: string }[] };
  final: { title: string; sub: string; primary: string; secondary: string };
  footer: { tagline: string; legal: string };
  notFound: string;
}

export const LANDING_COPY: Record<LandingLang, LandingCopy> = {
  en: {
    header: {
      signIn: "Log in",
      cta: "Try Folio free",
      menu: "Menu",
      themeLight: "Light mode",
      themeDark: "Dark mode",
      language: "Language",
      tour: "Product tour",
    },
    nav: {
      editor: "Editor",
      organize: "Organize",
      teamspaces: "Teamspaces",
      together: "Together",
      offline: "Offline",
    },
    sections: {
      overview: {
        label: "Overview",
        blurb: "",
        heading: "Your docs, wiki and resources, all in one place",
        lead: "Folio is a workspace where teams, schools and communities write, organize and share what they know. Try the editor right here, then take the tour.",
      },
      editor: {
        label: "The editor",
        blurb: "Write with blocks. Type / for anything.",
        heading: "An editor you already know how to use",
        lead: "Every paragraph, list, table or equation is a block. Type / to add one, drag blocks to move them, use Markdown shortcuts if you prefer the keyboard. This is the real editor: try it.",
        points: [
          {
            title: "The / menu",
            body: "Every block is one keystroke away, with search.",
          },
          {
            title: "Markdown shortcuts",
            body: "# for a heading, - for a list, [] for a to-do, > for a quote.",
          },
          {
            title: "Drag and turn into",
            body: "Grab a block by its handle to move it or turn it into another one.",
          },
        ],
      },
      blocks: {
        label: "Every block",
        blurb: "Equations, code, video, bookmarks, databases…",
        heading: "A block for everything you write",
        lead: "Text and lists, but also equations, code in several languages, videos, web bookmarks, file previews and databases.",
      },
      covers: {
        label: "Covers and icons",
        blurb: "Make every page recognizable.",
        heading: "Make every page yours",
        lead: "Give each page a cover and an icon, so a wiki full of pages is easy to find your way around.",
        points: [
          {
            title: "Covers",
            body: "Colors, gradients, a photo library, your own image or a link. Reposition it to frame it right.",
          },
          {
            title: "Icons",
            body: "An emoji, an icon from a full library in the color you pick, or your own image.",
          },
          {
            title: "Everywhere",
            body: "A page’s icon follows it into the sidebar, page links and search.",
          },
        ],
      },
      templates: {
        label: "Templates",
        blurb: "Start from a page that already works.",
        heading: "Start from a template",
        lead: "Meeting notes, a team wiki, a project tracker, a course page: open one, see how it’s built, and make it yours. Each teamspace keeps the templates its members use most.",
      },
      workspaces: {
        label: "Workspaces",
        blurb: "One per company, school or club.",
        heading: "A space for every group you’re part of",
        lead: "One workspace per organization, with its own members, guests and settings. Switch between them in one click.",
        points: [
          {
            title: "Workspaces",
            body: "One per company, school or association.",
          },
          {
            title: "Members and guests",
            body: "Invite your team, and guests who only see what you share with them.",
          },
          {
            title: "Private pages",
            body: "Your own pages stay private until you share them.",
          },
        ],
      },
      teamspaces: {
        label: "Teamspaces",
        blurb: "A space per team, class or project.",
        heading: "A space for each team, class or project",
        lead: "Inside a workspace, teamspaces keep each group’s pages, rooms and templates together. Open ones anyone can join; closed ones by invitation.",
        points: [
          {
            title: "Members and groups",
            body: "Add people one by one, or attach a whole group at once.",
          },
          {
            title: "Open or closed",
            body: "Open to the whole workspace, or joined by invitation only.",
          },
          {
            title: "Pinned pages and templates",
            body: "Pin what matters and keep the team’s own templates close.",
          },
        ],
      },
      databases: {
        label: "Databases",
        blurb: "Six views, and templates to start from.",
        heading: "Turn any list into a tool",
        lead: "A database is a list of records, each one a page, shown the way the work needs it. Type /database in any page, or start from an example.",
        points: [
          {
            title: "Six views",
            body: "Table, board, list, gallery, calendar and timeline, on the same records.",
          },
          {
            title: "Properties",
            body: "Text, numbers, select, status, dates, people, relations and more.",
          },
          {
            title: "Filter, sort, group",
            body: "Each view keeps its own, so every person can have theirs.",
          },
        ],
      },
      collaboration: {
        label: "Live collaboration",
        blurb: "Write together and see who’s there.",
        heading: "Write together, on the same page",
        lead: "Everyone edits at once and sees each other’s cursors. Share each page with exactly the people who need it.",
        points: [
          {
            title: "Live cursors",
            body: "See who’s on the page and what they’re writing, as it happens.",
          },
          {
            title: "Sharing",
            body: "Choose who can view, comment, edit or has full access, page by page.",
          },
          {
            title: "Version history",
            body: "Look back at earlier versions of a page and restore one.",
          },
        ],
      },
      comments: {
        label: "Comments and suggestions",
        blurb: "Discuss a passage, suggest a change.",
        heading: "Discuss the work where it is",
        lead: "Comment on a precise passage, suggest new wording instead of overwriting someone’s text, and bring people in with @.",
        points: [
          {
            title: "Comments",
            body: "Select any passage and comment. Resolve the thread once it’s settled.",
          },
          {
            title: "Suggestions",
            body: "Propose new wording; the author accepts or rejects it in one click.",
          },
          {
            title: "Mentions and inbox",
            body: "Type @ to bring someone in. They get a notification in their inbox.",
          },
        ],
      },
      rooms: {
        label: "Rooms",
        blurb: "Chat per team or project, linked to pages.",
        heading: "Talk next to the work",
        lead: "Rooms are chats for a team or a project. Share a block from any page into a room to discuss it; the room keeps the link back.",
        points: [
          {
            title: "Rooms and messages",
            body: "Per team or project, plus direct messages.",
          },
          {
            title: "Replies, reactions, files",
            body: "Everything a team chat needs, next to your pages.",
          },
          {
            title: "Share a block",
            body: "Send any block of a page into a room to talk about it.",
          },
        ],
      },
      offline: {
        label: "Offline",
        blurb: "Keep writing without a connection.",
        heading: "Connection dropped? Keep writing.",
        lead: "Pages you’ve already opened stay available without internet. Your edits are kept on your device and sent as soon as you’re back online.",
      },
    },
    hero: {
      title: "Your docs, wiki and resources, all in one place",
      lead: "Folio is a workspace where teams, schools and communities write, organize and share what they know. Try the editor right here, then take the tour.",
      primary: "Get started free",
      secondary: "Take the tour",
    },
    overview: {
      eyebrow: "Docs · Wiki · Resources",
      title1: "Write it once.",
      title2: "Find it ",
      titleAccent: "forever",
      lead: "Folio is where teams, schools and communities keep what they know: pages, wikis, databases and the conversations around them.",
      hint: "This is the real editor. Type / to try it.",
      bentoTitle: "One workspace, every way of working",
      faqTitle: "Questions",
      faq: [
        {
          q: "Who is Folio for?",
          a: "Teams, schools and communities that write, organize and share what they know: docs, wikis, courses and resources.",
        },
        {
          q: "Can I try it before signing up?",
          a: "Yes. The editor on this page is the real one: type / to add a block or open an example. Nothing is saved.",
        },
        {
          q: "Does it work offline?",
          a: "Yes. Keep writing without a connection; your changes sync as soon as you’re back online.",
        },
        {
          q: "Can I share a page with people outside my workspace?",
          a: "Yes. Invite guests who only see the pages you share with them.",
        },
      ],
    },
    editor: {
      badge: "Live editor",
      hint: "Type /, select text, drag a block, add a cover. Nothing is saved.",
      reset: "Reset",
      fullScreen: "Full screen",
      examples: "Examples",
      addIcon: "Add icon",
      addCover: "Add cover",
      changeCover: "Change cover",
      removeCover: "Remove",
    },
    collab: {
      hint: "Two windows, one page. Type in either one and watch the other.",
      window: (name) => `${name}’s window`,
    },
    tour: "Take the tour",
    tryTitle: "Try it yourself",
    tryMeta: {
      "getting-started": "Page · callouts, columns, a checklist",
      blocks: "Page · every kind of block",
      databases: "Page · how databases work",
      collaborate: "Page · sharing, comments, suggestions",
      "team-wiki": "Page · columns, tables, toggles",
      "project-tracker": "Page · a board and a task table",
      "meeting-notes": "Page · agenda, decisions, to-dos",
      course: "Page · equations, code, exercises",
      buttons: "Page · buttons and what they're for",
      containers: "Page · containers and cards",
    },
    example: {
      badge: "Example",
      banner: "Change anything: it’s the real editor. Nothing is saved.",
      useTemplate: "Start with this in Folio",
      back: "Back to",
      reset: "Reset",
    },
    shot: {
      B: "Screenshot — a page with a cover, the icon picker open",
      C: "Screenshot — the sidebar with the workspace switcher open",
      E: "Screenshot — two people editing a page, live cursors",
      F: "Screenshot — the teamspaces list with members and access",
      G: "Screenshot — a comment thread and a suggestion on a page",
      H: "Screenshot — a room with messages and a shared block",
    },
    blockGroups: [
      {
        title: "Write",
        items: [
          { name: "Text and headings", body: "Three heading levels" },
          { name: "Lists and to-dos", body: "Bullets, numbers, checkboxes" },
          { name: "Toggle", body: "Hide details until opened" },
          { name: "Callout", body: "Tips, warnings, key facts" },
          { name: "Quote", body: "Pull out what matters" },
          { name: "Mentions and emoji", body: "@people, @pages, :emoji:" },
        ],
      },
      {
        title: "Organize",
        items: [
          { name: "Columns", body: "Two, three or four" },
          { name: "Tabs", body: "Several panels in one place" },
          { name: "Table", body: "Rows and columns of text" },
          { name: "Table of contents", body: "Follows your headings" },
          { name: "Page links", body: "Build a wiki" },
          { name: "Database", body: "Six views of the same records" },
        ],
      },
      {
        title: "Media",
        items: [
          { name: "Image", body: "Resize, caption, align" },
          { name: "Files and PDF preview", body: "Read documents in the page" },
          { name: "Video and YouTube", body: "Upload or embed" },
          { name: "Audio", body: "Recordings and podcasts" },
          { name: "Web bookmark", body: "A link with its preview" },
        ],
      },
      {
        title: "Technical",
        items: [
          { name: "Code", body: "Highlighted, one-click copy" },
          { name: "Code group", body: "One tab per language" },
          { name: "Equations", body: "LaTeX, inline or as a block" },
          { name: "Buttons", body: "Link to a page or a site" },
          { name: "Containers", body: "Group blocks in a frame" },
        ],
      },
    ],
    views: ["Table", "Board", "List", "Gallery", "Calendar", "Timeline"],
    templatesUse: "Open it",
    offlineSteps: [
      {
        pill: "Online",
        text: "You write with your team, live.",
        tone: "online",
      },
      {
        pill: "Offline",
        text: "You keep going. Nothing is lost.",
        tone: "offline",
      },
      {
        pill: "Synced",
        text: "Everything goes out when you reconnect.",
        tone: "synced",
      },
    ],
    roles: {
      title: "For teams, schools and communities",
      items: [
        {
          title: "Teams",
          body: "Wiki, documentation, meetings and projects in one shared space.",
        },
        {
          title: "Schools and students",
          body: "Courses, assignments and group work, organized for a whole class.",
        },
        {
          title: "Communities and clubs",
          body: "Resources, decisions and showcases of your work, all together.",
        },
      ],
    },
    final: {
      title: "Bring together everything your team knows",
      sub: "Try it first. Invite your team later.",
      primary: "Get started free",
      secondary: "Log in",
    },
    footer: {
      tagline: "The workspace for your docs, wiki and resources.",
      legal: "Privacy · Terms",
    },
    notFound: "This page doesn’t exist.",
  },

  fr: {
    header: {
      signIn: "Se connecter",
      cta: "Essayer Folio",
      menu: "Menu",
      themeLight: "Mode clair",
      themeDark: "Mode sombre",
      language: "Langue",
      tour: "Visite du produit",
    },
    nav: {
      editor: "Éditeur",
      organize: "Organiser",
      teamspaces: "Espaces d’équipe",
      together: "Ensemble",
      offline: "Hors ligne",
    },
    sections: {
      overview: {
        label: "Vue d’ensemble",
        blurb: "",
        heading: "Vos docs, votre wiki et vos ressources, au même endroit",
        lead: "Folio est l’espace de travail où équipes, écoles et communautés écrivent, organisent et partagent ce qu’elles savent. Essayez l’éditeur ici même, puis faites la visite.",
      },
      editor: {
        label: "L’éditeur",
        blurb: "Écrivez avec des blocs. Tapez / pour tout.",
        heading: "Un éditeur que vous savez déjà utiliser",
        lead: "Chaque paragraphe, liste, tableau ou équation est un bloc. Tapez / pour en ajouter un, glissez les blocs pour les déplacer, utilisez les raccourcis Markdown si vous préférez le clavier. C’est le vrai éditeur : essayez-le.",
        points: [
          {
            title: "Le menu /",
            body: "Chaque bloc est à une touche, avec la recherche.",
          },
          {
            title: "Raccourcis Markdown",
            body: "# pour un titre, - pour une liste, [] pour une case à cocher, > pour une citation.",
          },
          {
            title: "Glisser et transformer",
            body: "Attrapez un bloc par sa poignée pour le déplacer ou le changer en un autre.",
          },
        ],
      },
      blocks: {
        label: "Tous les blocs",
        blurb: "Équations, code, vidéo, signets, bases…",
        heading: "Un bloc pour tout ce que vous écrivez",
        lead: "Du texte et des listes, mais aussi des équations, du code en plusieurs langages, des vidéos, des signets web, des aperçus de fichiers et des bases de données.",
      },
      covers: {
        label: "Couvertures et icônes",
        blurb: "Chaque page se reconnaît au premier coup d’œil.",
        heading: "Des pages à votre image",
        lead: "Donnez à chaque page une couverture et une icône : un wiki plein de pages devient facile à parcourir.",
        points: [
          {
            title: "Couvertures",
            body: "Couleurs, dégradés, une photothèque, votre image ou un lien. Repositionnez-la pour bien la cadrer.",
          },
          {
            title: "Icônes",
            body: "Un emoji, une icône d’une bibliothèque complète dans la couleur de votre choix, ou votre image.",
          },
          {
            title: "Partout",
            body: "L’icône d’une page la suit dans la barre latérale, les liens et la recherche.",
          },
        ],
      },
      templates: {
        label: "Modèles",
        blurb: "Partez d’une page qui fonctionne déjà.",
        heading: "Partez d’un modèle",
        lead: "Comptes rendus, wiki d’équipe, suivi de projet, page de cours : ouvrez-en un, voyez comment il est fait, et adaptez-le. Chaque espace d’équipe garde les modèles que ses membres utilisent le plus.",
      },
      workspaces: {
        label: "Espaces de travail",
        blurb: "Un par entreprise, école ou association.",
        heading: "Un espace pour chaque groupe dont vous faites partie",
        lead: "Un espace de travail par organisation, avec ses membres, ses invités et ses réglages. Passez de l’un à l’autre en un clic.",
        points: [
          {
            title: "Espaces de travail",
            body: "Un par entreprise, école ou association.",
          },
          {
            title: "Membres et invités",
            body: "Invitez votre équipe, et des invités qui ne voient que ce que vous partagez.",
          },
          {
            title: "Pages privées",
            body: "Vos pages restent privées jusqu’à ce que vous les partagiez.",
          },
        ],
      },
      teamspaces: {
        label: "Espaces d’équipe",
        blurb: "Un espace par équipe, classe ou projet.",
        heading: "Un espace pour chaque équipe, classe ou projet",
        lead: "Dans un espace de travail, les espaces d’équipe rassemblent les pages, salons et modèles de chaque groupe. Ouverts à tous, ou fermés et sur invitation.",
        points: [
          {
            title: "Membres et groupes",
            body: "Ajoutez des personnes une à une, ou tout un groupe d’un coup.",
          },
          {
            title: "Ouvert ou fermé",
            body: "Ouvert à tout l’espace de travail, ou sur invitation seulement.",
          },
          {
            title: "Pages épinglées et modèles",
            body: "Épinglez l’essentiel et gardez les modèles de l’équipe à portée.",
          },
        ],
      },
      databases: {
        label: "Bases de données",
        blurb: "Six vues, et des modèles pour démarrer.",
        heading: "Une liste qui devient un outil",
        lead: "Une base de données est une liste de fiches, chacune une page, affichée comme le travail l’exige. Tapez /base dans n’importe quelle page, ou partez d’un exemple.",
        points: [
          {
            title: "Six vues",
            body: "Tableau, kanban, liste, galerie, calendrier et chronologie, sur les mêmes fiches.",
          },
          {
            title: "Propriétés",
            body: "Texte, nombres, sélection, statut, dates, personnes, relations et plus.",
          },
          {
            title: "Filtrer, trier, grouper",
            body: "Chaque vue garde les siens : à chacun sa vue.",
          },
        ],
      },
      collaboration: {
        label: "Collaboration en direct",
        blurb: "Écrivez ensemble et voyez qui est là.",
        heading: "Écrivez ensemble, sur la même page",
        lead: "Tout le monde modifie en même temps et voit les curseurs des autres. Partagez chaque page avec exactement les bonnes personnes.",
        points: [
          {
            title: "Curseurs en direct",
            body: "Voyez qui est sur la page et ce qu’il écrit, au moment où il l’écrit.",
          },
          {
            title: "Partage",
            body: "Lecture, commentaire, modification ou accès complet, page par page.",
          },
          {
            title: "Historique des versions",
            body: "Revenez aux versions précédentes d’une page et restaurez-en une.",
          },
        ],
      },
      comments: {
        label: "Commentaires et suggestions",
        blurb: "Discutez d’un passage, proposez une modification.",
        heading: "Discutez du travail là où il est",
        lead: "Commentez un passage précis, proposez une formulation au lieu d’écraser le texte d’un autre, et faites venir les bonnes personnes avec @.",
        points: [
          {
            title: "Commentaires",
            body: "Sélectionnez un passage et commentez. Résolvez la discussion une fois tranchée.",
          },
          {
            title: "Suggestions",
            body: "Proposez une formulation ; l’auteur l’accepte ou la refuse en un clic.",
          },
          {
            title: "Mentions et boîte de réception",
            body: "Tapez @ pour faire venir quelqu’un. Il reçoit une notification.",
          },
        ],
      },
      rooms: {
        label: "Salons",
        blurb: "Des discussions par équipe, reliées aux pages.",
        heading: "Discutez à côté du travail",
        lead: "Les salons sont des discussions d’équipe ou de projet. Partagez un bloc de n’importe quelle page dans un salon pour en parler ; le salon garde le lien.",
        points: [
          {
            title: "Salons et messages",
            body: "Par équipe ou par projet, plus les messages privés.",
          },
          {
            title: "Réponses, réactions, fichiers",
            body: "Tout ce qu’il faut à une équipe, à côté de vos pages.",
          },
          {
            title: "Partager un bloc",
            body: "Envoyez n’importe quel bloc d’une page dans un salon pour en discuter.",
          },
        ],
      },
      offline: {
        label: "Hors connexion",
        blurb: "Continuez d’écrire sans réseau.",
        heading: "La connexion coupe ? Continuez d’écrire.",
        lead: "Les pages déjà ouvertes restent disponibles sans internet. Vos modifications sont gardées sur votre appareil et envoyées dès que le réseau revient.",
      },
    },
    hero: {
      title: "Vos docs, votre wiki et vos ressources, au même endroit",
      lead: "Folio est l’espace de travail où équipes, écoles et communautés écrivent, organisent et partagent ce qu’elles savent. Essayez l’éditeur ici même, puis faites la visite.",
      primary: "Commencer gratuitement",
      secondary: "Faire la visite",
    },
    overview: {
      eyebrow: "Docs · Wiki · Ressources",
      title1: "Écrivez-le une fois.",
      title2: "Retrouvez-le ",
      titleAccent: "toujours",
      lead: "Folio est l’endroit où équipes, écoles et communautés gardent ce qu’elles savent : pages, wikis, bases de données et les conversations autour.",
      hint: "C’est le vrai éditeur. Tapez / pour essayer.",
      bentoTitle: "Un seul espace, toutes les façons de travailler",
      faqTitle: "Questions",
      faq: [
        {
          q: "À qui s’adresse Folio ?",
          a: "Aux équipes, écoles et communautés qui écrivent, organisent et partagent ce qu’elles savent : docs, wikis, cours et ressources.",
        },
        {
          q: "Puis-je l’essayer avant de m’inscrire ?",
          a: "Oui. L’éditeur de cette page est le vrai : tapez / pour ajouter un bloc ou ouvrez un exemple. Rien n’est enregistré.",
        },
        {
          q: "Est-ce que ça marche hors ligne ?",
          a: "Oui. Continuez d’écrire sans connexion ; vos modifications se synchronisent dès que vous êtes de retour en ligne.",
        },
        {
          q: "Puis-je partager une page avec des personnes hors de mon espace ?",
          a: "Oui. Invitez des invités qui ne voient que les pages que vous partagez avec eux.",
        },
      ],
    },
    editor: {
      badge: "Éditeur en direct",
      hint: "Tapez /, sélectionnez du texte, déplacez un bloc, ajoutez une couverture. Rien n’est enregistré.",
      reset: "Réinitialiser",
      fullScreen: "Plein écran",
      examples: "Exemples",
      addIcon: "Ajouter une icône",
      addCover: "Ajouter une couverture",
      changeCover: "Changer la couverture",
      removeCover: "Retirer",
    },
    collab: {
      hint: "Deux fenêtres, une seule page. Écrivez dans l’une et regardez l’autre.",
      window: (name) => `Fenêtre de ${name}`,
    },
    tour: "Faire la visite",
    tryTitle: "Essayez vous-même",
    tryMeta: {
      "getting-started": "Page · encadrés, colonnes, une liste",
      blocks: "Page · tous les types de blocs",
      databases: "Page · le fonctionnement des bases",
      collaborate: "Page · partage, commentaires, suggestions",
      "team-wiki": "Page · colonnes, tableaux, blocs repliables",
      "project-tracker": "Page · un kanban et un tableau de tâches",
      "meeting-notes": "Page · ordre du jour, décisions, actions",
      course: "Page · équations, code, exercices",
      buttons: "Page · les boutons et leur usage",
      containers: "Page · conteneurs et cartes",
    },
    example: {
      badge: "Exemple",
      banner: "Modifiez tout : c’est le vrai éditeur. Rien n’est enregistré.",
      useTemplate: "Commencer avec dans Folio",
      back: "Retour à",
      reset: "Réinitialiser",
    },
    shot: {
      B: "Capture — une page avec une couverture, le sélecteur d’icônes ouvert",
      C: "Capture — la barre latérale avec le sélecteur d’espace de travail ouvert",
      E: "Capture — deux personnes modifiant une page, curseurs en direct",
      F: "Capture — la liste des espaces d’équipe, membres et accès",
      G: "Capture — une discussion et une suggestion sur une page",
      H: "Capture — un salon avec des messages et un bloc partagé",
    },
    blockGroups: [
      {
        title: "Écrire",
        items: [
          { name: "Texte et titres", body: "Trois niveaux de titre" },
          { name: "Listes et cases à cocher", body: "Puces, numéros, cases" },
          { name: "Bloc repliable", body: "Cacher les détails" },
          { name: "Encadré", body: "Astuces, alertes, points clés" },
          { name: "Citation", body: "Mettre en avant l’essentiel" },
          { name: "Mentions et emoji", body: "@personnes, @pages, :emoji:" },
        ],
      },
      {
        title: "Organiser",
        items: [
          { name: "Colonnes", body: "Deux, trois ou quatre" },
          { name: "Onglets", body: "Plusieurs panneaux au même endroit" },
          { name: "Tableau", body: "Lignes et colonnes de texte" },
          { name: "Table des matières", body: "Suit vos titres" },
          { name: "Liens de page", body: "Construire un wiki" },
          { name: "Base de données", body: "Six vues des mêmes fiches" },
        ],
      },
      {
        title: "Médias",
        items: [
          { name: "Image", body: "Redimensionner, légender, aligner" },
          {
            name: "Fichiers et aperçu PDF",
            body: "Lire les documents dans la page",
          },
          { name: "Vidéo et YouTube", body: "Importer ou intégrer" },
          { name: "Audio", body: "Enregistrements et podcasts" },
          { name: "Signet web", body: "Un lien avec son aperçu" },
        ],
      },
      {
        title: "Technique",
        items: [
          { name: "Code", body: "Coloré, copie en un clic" },
          { name: "Groupe de code", body: "Un onglet par langage" },
          { name: "Équations", body: "LaTeX, en ligne ou en bloc" },
          { name: "Boutons", body: "Vers une page ou un site" },
          { name: "Conteneurs", body: "Regrouper des blocs" },
        ],
      },
    ],
    views: [
      "Tableau",
      "Kanban",
      "Liste",
      "Galerie",
      "Calendrier",
      "Chronologie",
    ],
    templatesUse: "L’ouvrir",
    offlineSteps: [
      {
        pill: "En ligne",
        text: "Vous écrivez avec votre équipe, en direct.",
        tone: "online",
      },
      {
        pill: "Hors ligne",
        text: "Vous continuez. Rien n’est perdu.",
        tone: "offline",
      },
      {
        pill: "Synchronisé",
        text: "Tout part dès le retour du réseau.",
        tone: "synced",
      },
    ],
    roles: {
      title: "Pour les équipes, les écoles et les communautés",
      items: [
        {
          title: "Équipes",
          body: "Wiki, documentation, réunions et projets dans un seul espace partagé.",
        },
        {
          title: "Écoles et étudiants",
          body: "Cours, devoirs et travaux de groupe, organisés pour toute une promo.",
        },
        {
          title: "Communautés et associations",
          body: "Ressources, décisions et vitrines de vos réalisations, au même endroit.",
        },
      ],
    },
    final: {
      title: "Rassemblez tout ce que votre équipe sait",
      sub: "Essayez d’abord. Invitez votre équipe ensuite.",
      primary: "Commencer gratuitement",
      secondary: "Se connecter",
    },
    footer: {
      tagline:
        "L’espace de travail pour vos docs, votre wiki et vos ressources.",
      legal: "Confidentialité · Conditions",
    },
    notFound: "Cette page n’existe pas.",
  },
};
