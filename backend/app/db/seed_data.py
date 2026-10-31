"""Demo content used to populate an empty database (disable with SEED_DEMO_DATA=false).

Everything here is fictional placeholder content: replace it from the admin dashboard.
"""

from __future__ import annotations

from typing import Any

LOCALES = ("pt-BR", "en", "es", "it", "fr", "ru", "zh", "ja")


def tr(*values: str) -> dict[str, str]:
    """Zip eight strings (in LOCALES order) into a locale -> text mapping."""
    assert len(values) == len(LOCALES)
    return dict(zip(LOCALES, values, strict=True))


HEADLINE = tr(
    "Desenvolvedor full-stack e criativo",
    "Full-stack & creative developer",
    "Desarrollador full-stack y creativo",
    "Sviluppatore full-stack e creativo",
    "Développeur full-stack et créatif",
    "Full-stack и креативный разработчик",
    "全栈与创意开发工程师",
    "フルスタック／クリエイティブ開発者",
)
BIO = tr(
    "Construo experiências web rápidas, acessíveis e cheias de movimento.",
    "I build fast, accessible web experiences full of motion.",
    "Creo experiencias web rápidas, accesibles y llenas de movimiento.",
    "Creo esperienze web veloci, accessibili e piene di movimento.",
    "Je crée des expériences web rapides, accessibles et pleines de mouvement.",
    "Создаю быстрые и доступные веб-интерфейсы, полные движения.",
    "我打造快速、无障碍且充满动感的网页体验。",
    "高速でアクセシブル、そして動きに満ちたウェブ体験をつくっています。",
)
ABOUT = tr(
    "Trabalho na interseção entre engenharia e design: de APIs seguras em Python a interfaces "
    "com movimento 3D. Gosto de produtos bem cuidados, código limpo e dos detalhes que fazem "
    "a diferença.",
    "I work where engineering meets design — from secure Python APIs to interfaces with 3D "
    "motion. I care about polished products, clean code and the details that make the "
    "difference.",
    "Trabajo donde la ingeniería se encuentra con el diseño: desde APIs seguras en Python hasta "
    "interfaces con movimiento 3D. Me importan los productos cuidados, el código limpio y los "
    "detalles que marcan la diferencia.",
    "Lavoro dove l'ingegneria incontra il design: da API Python sicure a interfacce con "
    "movimento 3D. Mi stanno a cuore i prodotti curati, il codice pulito e i dettagli che "
    "fanno la differenza.",
    "Je travaille là où l'ingénierie rencontre le design : des API Python sécurisées aux "
    "interfaces animées en 3D. J'aime les produits soignés, le code propre et les détails qui "
    "font la différence.",
    "Я работаю на стыке инженерии и дизайна: от безопасных Python-API до интерфейсов с "
    "3D-анимацией. Для меня важны продуманные продукты, чистый код и детали, которые "
    "меняют всё.",
    "我活跃在工程与设计的交汇处：从安全的 Python API 到带有 3D 动效的界面。"
    "我在意精致的产品、整洁的代码，以及那些决定成败的细节。",
    "エンジニアリングとデザインが交わる場所で働いています。安全なPython APIから3Dモーションの"
    "あるインターフェースまで。丁寧なプロダクト、クリーンなコード、そして違いを生む細部に"
    "こだわります。",
)
PRESENT = tr("atual", "present", "actualidad", "oggi", "aujourd'hui", "наст. время", "至今", "現在")
ROLE_SENIOR = tr(
    "Engenheiro Full-Stack Sênior",
    "Senior Full-Stack Engineer",
    "Ingeniero Full-Stack sénior",
    "Ingegnere Full-Stack Senior",
    "Ingénieur Full-Stack senior",
    "Старший full-stack инженер",
    "高级全栈工程师",
    "シニアフルスタックエンジニア",
)
ROLE_FRONT = tr(
    "Desenvolvedor Front-End",
    "Front-End Developer",
    "Desarrollador Front-End",
    "Sviluppatore Front-End",
    "Développeur Front-End",
    "Front-End разработчик",
    "前端开发工程师",
    "フロントエンド開発者",
)
JOB1_BULLETS = (
    tr(
        "Liderei o redesign de uma plataforma web baseada em design system, usada por 200 mil "
        "pessoas por mês.",
        "Led the redesign of a design-system-driven web platform used by 200k people a month.",
        "Lideré el rediseño de una plataforma web basada en un design system, con 200 mil "
        "usuarios al mes.",
        "Ho guidato il redesign di una piattaforma web basata su design system, usata da "
        "200 mila persone al mese.",
        "J'ai dirigé la refonte d'une plateforme web pilotée par un design system, utilisée "
        "par 200 000 personnes par mois.",
        "Возглавил редизайн веб-платформы на основе дизайн-системы с аудиторией 200 тыс. "
        "человек в месяц.",
        "主导基于设计系统的网页平台改版，月活用户达 20 万。",
        "デザインシステムを軸にしたWebプラットフォームのリニューアルを主導し、月間20万人が"
        "利用しています。",
    ),
    tr(
        "Reduzi em 40% o tempo de resposta da API com cache e otimização de consultas.",
        "Cut API response times by 40% with caching and query optimisation.",
        "Reduje un 40 % el tiempo de respuesta de la API con caché y optimización de consultas.",
        "Ridotto del 40% il tempo di risposta delle API con cache e ottimizzazione delle query.",
        "Réduit de 40 % les temps de réponse de l'API grâce au cache et à l'optimisation "
        "des requêtes.",
        "Сократил время ответа API на 40 % с помощью кэширования и оптимизации запросов.",
        "通过缓存与查询优化，将 API 响应时间缩短 40%。",
        "キャッシュとクエリ最適化によりAPIの応答時間を40%短縮しました。",
    ),
)
JOB2_BULLETS = (
    tr(
        "Criei sites de campanha interativos premiados com GSAP e WebGL.",
        "Built award-winning interactive campaign sites with GSAP and WebGL.",
        "Creé sitios de campaña interactivos premiados con GSAP y WebGL.",
        "Ho realizzato siti di campagna interattivi premiati con GSAP e WebGL.",
        "J'ai conçu des sites de campagne interactifs primés avec GSAP et WebGL.",
        "Создавал отмеченные наградами интерактивные промо-сайты на GSAP и WebGL.",
        "使用 GSAP 与 WebGL 打造获奖的互动营销网站。",
        "GSAPとWebGLで受賞歴のあるインタラクティブなキャンペーンサイトを制作しました。",
    ),
    tr(
        "Implantei testes automatizados e CI que reduziram o ciclo de entrega pela metade.",
        "Introduced automated testing and CI that halved release time.",
        "Implanté pruebas automatizadas y CI que redujeron a la mitad el tiempo de entrega.",
        "Introdotto test automatici e CI che hanno dimezzato i tempi di rilascio.",
        "Mis en place des tests automatisés et une CI qui ont divisé par deux les délais "
        "de livraison.",
        "Внедрил автотесты и CI, вдвое сократившие время релиза.",
        "引入自动化测试与持续集成，使发布周期缩短一半。",
        "自動テストとCIを導入し、リリース時間を半分にしました。",
    ),
)
DEGREE = tr(
    "Bacharelado em Ciência da Computação",
    "B.Sc. in Computer Science",
    "Grado en Ciencias de la Computación",
    "Laurea in Informatica",
    "Licence en informatique",
    "Бакалавр, информатика",
    "计算机科学学士",
    "コンピュータサイエンス学士",
)

STACK = [
    {"category": "Frontend", "items": ["React", "TypeScript", "Tailwind CSS", "GSAP", "Vite"]},
    {
        "category": "Backend",
        "items": ["Python", "FastAPI", "SQLAlchemy", "PostgreSQL", "REST / OpenAPI"],
    },
    {"category": "DevOps", "items": ["Docker", "GitHub Actions", "Nginx", "Linux"]},
    {"category": "Testing", "items": ["Pytest", "Vitest", "Playwright", "ESLint / Ruff"]},
]


def profile_translations() -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for loc in LOCALES:
        result[loc] = {
            "headline": HEADLINE[loc],
            "bio": BIO[loc],
            "about": [ABOUT[loc]],
            "stack": STACK,
            "experience": [
                {
                    "company": "Studio Nova",
                    "role": ROLE_SENIOR[loc],
                    "period": f"2022 – {PRESENT[loc]}",
                    "location": "Remote",
                    "bullets": [JOB1_BULLETS[0][loc], JOB1_BULLETS[1][loc]],
                },
                {
                    "company": "Pixel & Co.",
                    "role": ROLE_FRONT[loc],
                    "period": "2019 – 2022",
                    "location": "São Paulo",
                    "bullets": [JOB2_BULLETS[0][loc], JOB2_BULLETS[1][loc]],
                },
            ],
            "education": [
                {
                    "institution": "Example University",
                    "degree": DEGREE[loc],
                    "period": "2015 – 2019",
                }
            ],
        }
    return result


PROFILE: dict[str, Any] = {
    "name": "Alex Morgan",
    "email": "hello@example.com",
    "phone": "",
    "location": "São Paulo, BR",
    "links": [
        {"label": "GitHub", "url": "https://github.com/"},
        {"label": "LinkedIn", "url": "https://www.linkedin.com/"},
        {"label": "Read.cv", "url": "https://read.cv/"},
    ],
}

ROLE_DD = tr(
    "Design e Desenvolvimento",
    "Design & Development",
    "Diseño y desarrollo",
    "Design e sviluppo",
    "Design et développement",
    "Дизайн и разработка",
    "设计与开发",
    "デザイン＆開発",
)
ROLE_DEV = tr(
    "Desenvolvimento",
    "Development",
    "Desarrollo",
    "Sviluppo",
    "Développement",
    "Разработка",
    "开发",
    "開発",
)

# (slug, title, year, client, tags, role, summary, description)
_PROJECTS: list[
    tuple[str, str, int, str, list[str], dict[str, str], dict[str, str], dict[str, str]]
] = [
    (
        "aurora",
        "Aurora",
        2025,
        "Nova Records",
        ["WebGL", "Audio", "GSAP"],
        ROLE_DD,
        tr(
            "Uma experiência web imersiva e reativa ao áudio.",
            "An immersive, audio-reactive web experience.",
            "Una experiencia web inmersiva que reacciona al audio.",
            "Un'esperienza web immersiva e reattiva all'audio.",
            "Une expérience web immersive et réactive à l'audio.",
            "Иммерсивный веб-опыт, реагирующий на звук.",
            "沉浸式、随音频律动的网页体验。",
            "音に反応する没入型のウェブ体験。",
        ),
        tr(
            "Experiência generativa com WebGL e GSAP, cenas guiadas pelo scroll e orçamento de "
            "performance abaixo de 2 segundos em celulares intermediários.",
            "A generative experience built with WebGL and GSAP, with scroll-driven scenes and a "
            "performance budget under 2 seconds on mid-range phones.",
            "Experiencia generativa con WebGL y GSAP, escenas guiadas por el scroll y un "
            "presupuesto de rendimiento inferior a 2 segundos en móviles de gama media.",
            "Esperienza generativa con WebGL e GSAP, scene guidate dallo scroll e un budget di "
            "performance inferiore a 2 secondi sugli smartphone di fascia media.",
            "Expérience générative avec WebGL et GSAP, scènes pilotées par le scroll et budget "
            "de performance sous les 2 secondes sur mobile milieu de gamme.",
            "Генеративный проект на WebGL и GSAP со сценами, управляемыми скроллом, и бюджетом "
            "производительности менее 2 секунд на смартфонах среднего класса.",
            "基于 WebGL 与 GSAP 的生成式体验，场景由滚动驱动，在中端手机上加载时间低于 2 秒。",
            "WebGLとGSAPによるジェネレーティブな体験。スクロール連動のシーンで、ミドルレンジの"
            "スマホでも2秒未満で表示します。",
        ),
    ),
    (
        "atlas",
        "Atlas",
        2024,
        "Atlas Architects",
        ["Headless CMS", "Design system"],
        ROLE_DD,
        tr(
            "Site de portfólio e CMS para um estúdio de arquitetura.",
            "Portfolio site and CMS for an architecture studio.",
            "Sitio de portafolio y CMS para un estudio de arquitectura.",
            "Sito portfolio e CMS per uno studio di architettura.",
            "Site portfolio et CMS pour un cabinet d'architecture.",
            "Сайт-портфолио и CMS для архитектурного бюро.",
            "建筑事务所的作品集网站与内容管理系统。",
            "建築設計事務所のためのポートフォリオサイトとCMS。",
        ),
        tr(
            "Portfólio bilíngue com CMS headless, layouts centrados em imagens, transições de "
            "página suaves e um painel simples para a equipe editorial.",
            "A bilingual portfolio with a headless CMS, image-first layouts, smooth page "
            "transitions and an editor-friendly admin.",
            "Portafolio bilingüe con CMS headless, diseños centrados en la imagen, transiciones "
            "de página fluidas y un panel sencillo para el equipo editorial.",
            "Portfolio bilingue con CMS headless, layout incentrati sulle immagini, transizioni "
            "di pagina fluide e un pannello semplice per la redazione.",
            "Portfolio bilingue avec CMS headless, mises en page centrées sur l'image, "
            "transitions de page fluides et une interface simple pour l'équipe éditoriale.",
            "Двуязычное портфолио с headless CMS, макетами на основе изображений, плавными "
            "переходами между страницами и удобной админкой для редакторов.",
            "双语作品集网站，配备无头 CMS、以图像为先的版式、流畅的页面转场和易用的编辑后台。",
            "ヘッドレスCMS、画像中心のレイアウト、滑らかなページ遷移、編集者に優しい管理画面を備えた"
            "バイリンガルのポートフォリオ。",
        ),
    ),
    (
        "nimbus",
        "Nimbus",
        2024,
        "Nimbus Labs",
        ["Dashboard", "Maps", "FastAPI"],
        ROLE_DEV,
        tr(
            "Painel de análise meteorológica em tempo real.",
            "Real-time weather analytics dashboard.",
            "Panel de análisis meteorológico en tiempo real.",
            "Dashboard di analisi meteo in tempo reale.",
            "Tableau de bord d'analyse météo en temps réel.",
            "Дашборд метеоаналитики в реальном времени.",
            "实时气象分析仪表盘。",
            "リアルタイムの気象分析ダッシュボード。",
        ),
        tr(
            "Painel que recebe dados de estações meteorológicas, exibe mapas e gráficos "
            "interativos e avisa a equipe quando limites são ultrapassados.",
            "A dashboard that ingests weather-station data, renders interactive maps and charts, "
            "and alerts teams when thresholds are crossed.",
            "Panel que recibe datos de estaciones meteorológicas, muestra mapas y gráficos "
            "interactivos y avisa al equipo cuando se superan los umbrales.",
            "Dashboard che raccoglie i dati delle stazioni meteo, mostra mappe e grafici "
            "interattivi e avvisa il team al superamento delle soglie.",
            "Tableau de bord qui ingère les données de stations météo, affiche cartes et "
            "graphiques interactifs et alerte les équipes en cas de dépassement de seuil.",
            "Дашборд принимает данные метеостанций, строит интерактивные карты и графики и "
            "уведомляет команду о превышении порогов.",
            "该仪表盘接入气象站数据，呈现交互式地图与图表，并在超过阈值时向团队发出警报。",
            "気象観測所のデータを取り込み、インタラクティブな地図とグラフを表示し、しきい値を"
            "超えるとチームに通知します。",
        ),
    ),
    (
        "pulse",
        "Pulse",
        2023,
        "Pulse Fitness",
        ["PWA", "Offline-first", "A11y"],
        ROLE_DD,
        tr(
            "Aplicativo web progressivo para treino e recuperação.",
            "Progressive web app for training and recovery.",
            "Aplicación web progresiva para entrenamiento y recuperación.",
            "App web progressiva per allenamento e recupero.",
            "Application web progressive pour l'entraînement et la récupération.",
            "Прогрессивное веб-приложение для тренировок и восстановления.",
            "用于训练与恢复的渐进式网页应用。",
            "トレーニングとリカバリーのためのプログレッシブWebアプリ。",
        ),
        tr(
            "App offline-first para planejar treinos e acompanhar a recuperação, com gráficos "
            "acessíveis e lembretes por notificação push.",
            "An offline-first progressive web app for workout planning and recovery tracking, "
            "with accessible charts and push reminders.",
            "App web progresiva offline-first para planificar entrenamientos y seguir la "
            "recuperación, con gráficos accesibles y recordatorios push.",
            "Web app offline-first per pianificare gli allenamenti e monitorare il recupero, con "
            "grafici accessibili e promemoria push.",
            "Application web offline-first pour planifier les séances et suivre la récupération, "
            "avec des graphiques accessibles et des rappels push.",
            "Offline-first приложение для планирования тренировок и контроля восстановления, с "
            "доступными графиками и push-напоминаниями.",
            "离线优先的渐进式应用，用于规划训练和跟踪恢复，配有无障碍图表与推送提醒。",
            "ワークアウト計画と回復の記録のためのオフラインファーストなアプリ。アクセシブルな"
            "グラフとプッシュ通知付き。",
        ),
    ),
    (
        "lumen",
        "Lumen",
        2023,
        "Lumen Home",
        ["E-commerce", "3D", "Search"],
        ROLE_DD,
        tr(
            "Loja virtual de uma marca de iluminação contemporânea.",
            "Storefront for a contemporary lighting brand.",
            "Tienda online de una marca de iluminación contemporánea.",
            "Negozio online di un brand di illuminazione contemporanea.",
            "Boutique en ligne d'une marque d'éclairage contemporaine.",
            "Интернет-магазин современного бренда освещения.",
            "一家现代灯具品牌的线上商店。",
            "モダン照明ブランドのオンラインストア。",
        ),
        tr(
            "Loja headless com pré-visualização 3D dos produtos, busca instantânea e um "
            "checkout que aumentou a conversão em 18%.",
            "A headless storefront with 3D product previews, instant search and a checkout that "
            "lifted conversion by 18%.",
            "Tienda headless con vistas previas 3D de los productos, búsqueda instantánea y un "
            "checkout que aumentó la conversión un 18 %.",
            "Negozio headless con anteprime 3D dei prodotti, ricerca istantanea e un checkout che "
            "ha aumentato le conversioni del 18%.",
            "Boutique headless avec aperçus 3D des produits, recherche instantanée et un "
            "tunnel de commande qui a augmenté la conversion de 18 %.",
            "Headless-магазин с 3D-превью товаров, мгновенным поиском и чекаутом, повысившим "
            "конверсию на 18 %.",
            "无头电商站点，提供 3D 产品预览、即时搜索，并将结账转化率提升了 18%。",
            "3D商品プレビュー、即時検索、コンバージョンを18%向上させたチェックアウトを備えた"
            "ヘッドレスストア。",
        ),
    ),
]


def projects() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for slug, title, year, client, tags, role, summary, description in _PROJECTS:
        items.append(
            {
                "slug": slug,
                "year": year,
                "client": client,
                "client_url": "https://example.com/",
                "live_url": "https://example.com/",
                "cover_image": f"/projects/{slug}-cover.svg",
                "images": [f"/projects/{slug}-{n}.svg" for n in (1, 2, 3)],
                "tags": tags,
                "credits": [
                    {"role": "Design", "name": "Studio Nova"},
                    {"role": "Development", "name": "Alex Morgan"},
                    {"role": "Motion", "name": "Pixel & Co."},
                ],
                "translations": {
                    loc: {
                        "title": title,
                        "summary": summary[loc],
                        "description": description[loc],
                        "role": role[loc],
                    }
                    for loc in LOCALES
                },
                "published": True,
            }
        )
    return items
