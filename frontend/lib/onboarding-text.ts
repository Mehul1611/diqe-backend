export type UiLanguage =
    | 'English'
    | 'Spanish'
    | 'French'
    | 'German'
    | 'Dutch'
    | 'Chinese'
    | 'Japanese'

export type ModeLine = { lead: string; term: string; tail: string }

export type OnboardingCopy = {
    welcome: { title: string; body: string }
    searchModes: { title: string; docLine: ModeLine; webLine: ModeLine }
    language: { title: string; body: string }
    responseModes: { title: string; fastLine: ModeLine; thinkingLine: ModeLine }
    tip: { title: string; body: string }
}

export type ModeLabels = { fast: string; thinking: string }

const EN: OnboardingCopy = {
    welcome: {
        title: 'Welcome',
        body: 'This is the DIQE Query Console — Just ask. We’ll find the answer.',
    },
    searchModes: {
        title: 'Search Modes',
        docLine: {
            lead: '',
            term: 'Document Search',
            tail: ' to query your indexed documents.',
        },
        webLine: {
            lead: '',
            term: 'Web Search',
            tail: ' (➕ menu) to blend in fresh info from the Internet.',
        },
    },
    language: {
        title: 'Language',
        body: 'Pick a response language anytime — We’ll reply in that language.',
    },
    responseModes: {
        title: 'Response Modes',
        fastLine: {
            lead: '',
            term: 'Fast mode',
            tail: ' for quicker replies.',
        },
        thinkingLine: {
            lead: '',
            term: 'Thinking mode',
            tail: ' for deeper reasoning (slower, richer).',
        },
    },
    tip: {
        title: 'Tip',
        body: 'Combine document search and web search when you need both your index and fresh facts.',
    },
}

const ES: OnboardingCopy = {
    welcome: {
        title: 'Bienvenida',
        body: 'Esta es la consola de consultas DIQE — solo pregunta. Encontraremos la respuesta.',
    },
    searchModes: {
        title: 'Modos de búsqueda',
        docLine: {
            lead: 'Usa ',
            term: 'Búsqueda en documentos',
            tail: ' para consultar tus documentos indexados.',
        },
        webLine: {
            lead: 'Usa ',
            term: 'Búsqueda web',
            tail: ' (menú ➕) para añadir información reciente de internet.',
        },
    },
    language: {
        title: 'Idioma',
        body: 'Elige el idioma de respuesta en el selector cuando quieras — responderemos en ese idioma.',
    },
    responseModes: {
        title: 'Modos de respuesta',
        fastLine: {
            lead: 'Usa el modo ',
            term: 'Rápido',
            tail: ' para respuestas más ágiles.',
        },
        thinkingLine: {
            lead: 'Usa el modo ',
            term: 'Razonamiento',
            tail: ' para un análisis más profundo (más lento, más detalle).',
        },
    },
    tip: {
        title: 'Consejo',
        body: 'Combina búsqueda en documentos y web cuando necesites tu índice y datos actuales.',
    },
}

const FR: OnboardingCopy = {
    welcome: {
        title: 'Bienvenue',
        body: 'Voici la console de requêtes DIQE — posez simplement votre question. Nous trouverons la réponse.',
    },
    searchModes: {
        title: 'Modes de recherche',
        docLine: {
            lead: 'Utilisez la ',
            term: 'recherche documentaire',
            tail: ' pour interroger vos documents indexés.',
        },
        webLine: {
            lead: 'Utilisez la ',
            term: 'recherche web',
            tail: ' (menu ➕) pour enrichir avec des infos récentes d’internet.',
        },
    },
    language: {
        title: 'Langue',
        body: 'Choisissez la langue des réponses dans le sélecteur — nous répondrons dans cette langue.',
    },
    responseModes: {
        title: 'Modes de réponse',
        fastLine: {
            lead: 'Utilisez le mode ',
            term: 'Rapide',
            tail: ' pour des réponses plus rapides.',
        },
        thinkingLine: {
            lead: 'Utilisez le mode ',
            term: 'Réflexion',
            tail: ' pour un raisonnement plus poussé (plus lent, plus riche).',
        },
    },
    tip: {
        title: 'Astuce',
        body: 'Combinez recherche documentaire et web quand vous avez besoin de l’index et d’infos à jour.',
    },
}

const DE: OnboardingCopy = {
    welcome: {
        title: 'Willkommen',
        body: 'Das ist die DIQE-Abfragekonsole — einfach fragen. Wir finden die Antwort.',
    },
    searchModes: {
        title: 'Suchmodi',
        docLine: {
            lead: 'Nutzen Sie die ',
            term: 'Dokumentensuche',
            tail: ', um Ihre indexierten Dokumente abzufragen.',
        },
        webLine: {
            lead: 'Nutzen Sie die ',
            term: 'Websuche',
            tail: ' (➕-Menü), um aktuelle Infos aus dem Internet einzubeziehen.',
        },
    },
    language: {
        title: 'Sprache',
        body: 'Wählen Sie jederzeit die Antwortsprache im Auswahlfeld — wir antworten in dieser Sprache.',
    },
    responseModes: {
        title: 'Antwortmodi',
        fastLine: {
            lead: 'Nutzen Sie den Modus ',
            term: 'Schnell',
            tail: ' für schnellere Antworten.',
        },
        thinkingLine: {
            lead: 'Nutzen Sie den Modus ',
            term: 'Denken',
            tail: ' für tieferes Nachdenken (langsamer, ausführlicher).',
        },
    },
    tip: {
        title: 'Tipp',
        body: 'Kombinieren Sie Dokumenten- und Websuche, wenn Sie Index und aktuelle Fakten brauchen.',
    },
}

const NL: OnboardingCopy = {
    welcome: {
        title: 'Welkom',
        body: 'Dit is de DIQE-queryconsole — vraag het gewoon. We vinden het antwoord.',
    },
    searchModes: {
        title: 'Zoekmodi',
        docLine: {
            lead: 'Gebruik ',
            term: 'documentzoeken',
            tail: ' om je geïndexeerde documenten te bevragen.',
        },
        webLine: {
            lead: 'Gebruik ',
            term: 'webzoeken',
            tail: ' (➕-menu) om actuele info van internet toe te voegen.',
        },
    },
    language: {
        title: 'Taal',
        body: 'Kies wanneer je wilt de antwoordtaal in het menu — we antwoorden in die taal.',
    },
    responseModes: {
        title: 'Antwoordmodi',
        fastLine: {
            lead: 'Gebruik de modus ',
            term: 'Snel',
            tail: ' voor snellere antwoorden.',
        },
        thinkingLine: {
            lead: 'Gebruik de modus ',
            term: 'Denken',
            tail: ' voor diepere redenering (langzamer, rijker).',
        },
    },
    tip: {
        title: 'Tip',
        body: 'Combineer document- en webzoeken als je zowel je index als verse feiten nodig hebt.',
    },
}

const ZH: OnboardingCopy = {
    welcome: {
        title: '欢迎',
        body: '这是 DIQE 查询控制台 — 直接提问，我们会尽力找到答案。',
    },
    searchModes: {
        title: '搜索模式',
        docLine: {
            lead: '使用',
            term: '文档搜索',
            tail: '查询已索引的文档内容。',
        },
        webLine: {
            lead: '使用',
            term: '网页搜索',
            tail: '（➕ 菜单）从互联网补充最新信息。',
        },
    },
    language: {
        title: '语言',
        body: '随时在语言选择器中切换回复语言 — 我们会用所选语言回答。',
    },
    responseModes: {
        title: '回复模式',
        fastLine: {
            lead: '使用',
            term: '快速模式',
            tail: '可获得更快回复。',
        },
        thinkingLine: {
            lead: '使用',
            term: '思考模式',
            tail: '可进行更深推理（更慢、更详）。',
        },
    },
    tip: {
        title: '提示',
        body: '需要索引与最新事实时，可同时结合文档搜索与网页搜索。',
    },
}

const JA: OnboardingCopy = {
    welcome: {
        title: 'ようこそ',
        body: 'DIQE のクエリコンソールです — 聞きたいことを入力するだけ。答えを見つけます。',
    },
    searchModes: {
        title: '検索モード',
        docLine: {
            lead: '',
            term: 'ドキュメント検索',
            tail: 'でインデックス済みの資料を検索できます。',
        },
        webLine: {
            lead: '',
            term: 'ウェブ検索',
            tail: '（➕ メニュー）でインターネットの最新情報を取り込めます。',
        },
    },
    language: {
        title: '言語',
        body: 'セレクターで応答言語をいつでも選べます — その言語で返答します。',
    },
    responseModes: {
        title: '応答モード',
        fastLine: {
            lead: '',
            term: '高速モード',
            tail: 'は素早い返答向けです。',
        },
        thinkingLine: {
            lead: '',
            term: '思考モード',
            tail: 'は深い推論向けです（遅め・内容は豊か）。',
        },
    },
    tip: {
        title: 'ヒント',
        body: 'インデックスと最新情報の両方が必要なときは、ドキュメント検索とウェブ検索を組み合わせてください。',
    },
}

const MODE_EN: ModeLabels = { fast: 'Fast', thinking: 'Thinking' }
const MODE_ES: ModeLabels = { fast: 'Rápido', thinking: 'Razonar' }
const MODE_FR: ModeLabels = { fast: 'Rapide', thinking: 'Réflexion' }
const MODE_DE: ModeLabels = { fast: 'Schnell', thinking: 'Denken' }
const MODE_NL: ModeLabels = { fast: 'Snel', thinking: 'Denken' }
const MODE_ZH: ModeLabels = { fast: '快速', thinking: '思考' }
const MODE_JA: ModeLabels = { fast: '高速', thinking: '思考' }

export const ONBOARDING_COPY: Record<UiLanguage, OnboardingCopy> = {
    English: EN,
    Spanish: ES,
    French: FR,
    German: DE,
    Dutch: NL,
    Chinese: ZH,
    Japanese: JA,
}

export const MODE_LABELS: Record<UiLanguage, ModeLabels> = {
    English: MODE_EN,
    Spanish: MODE_ES,
    French: MODE_FR,
    German: MODE_DE,
    Dutch: MODE_NL,
    Chinese: MODE_ZH,
    Japanese: MODE_JA,
}

export const QUERY_PLACEHOLDER: Record<UiLanguage, string> = {
    English: 'Ask anything…',
    Spanish: 'Pregunta lo que quieras…',
    French: 'Posez votre question…',
    German: 'Stellen Sie Ihre Frage…',
    Dutch: 'Stel je vraag…',
    Chinese: '请输入问题…',
    Japanese: '何でも聞いてください…',
}
