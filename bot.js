/*
=========================================================
 HORROR BOT
 Motor de compreensão e formulação
=========================================================

 Este arquivo não controla a interface.

 Ele recebe:

     HorrorBot.respond("mensagem")

 e devolve:

     Promise<string>

 A arquitetura foi feita para poder crescer depois.
=========================================================
*/


const HorrorBot = (() => {

    /* =====================================================
       CONFIGURAÇÃO
    ===================================================== */

    const CONFIG = {

        memoriaMaxima: 30,

        /*
         * Quanto maior, mais o estado emocional muda
         * com cada mensagem.
         */
        sensibilidade: 0.15

    };


    /* =====================================================
       ESTADO DA CONVERSA
    ===================================================== */

    const state = {

        messageCount: 0,

        lastMessage: "",

        history: [],

        topics: [],

        mentionedThings: [],

        unansweredQuestions: [],

        emotions: {

            fear: 0,

            curiosity: 0,

            distrust: 0,

            confusion: 0,

            calm: 0,

            irritation: 0

        },

        intentions: {

            question: 0,

            greeting: 0,

            farewell: 0,

            explanation: 0,

            accusation: 0,

            uncertainty: 0,

            emotional: 0,

            observation: 0

        },

        behavior: {

            shortAnswers: false,

            evasive: false,

            repetitive: false

        }

    };


    /* =====================================================
       NORMALIZAÇÃO
    ===================================================== */

    function normalize(text) {

        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\p{L}\p{N}\s?!.,]/gu, "")
            .replace(/\s+/g, " ")
            .trim();

    }


    /* =====================================================
       PALAVRAS RELACIONADAS
       
       Importante:
       
       Não estamos procurando apenas uma palavra.
       
       Estamos usando grupos de significado.
    ===================================================== */

    const CONCEPTS = {

        fear: [
            "medo",
            "assustado",
            "assustada",
            "assusta",
            "receio",
            "temor",
            "pavor",
            "nervoso",
            "nervosa",
            "inseguro",
            "insegura",
            "desconfortavel",
            "estranho",
            "estranha"
        ],

        curiosity: [
            "curioso",
            "curiosa",
            "interessante",
            "saber",
            "entender",
            "explicar",
            "porque",
            "como",
            "qual",
            "onde"
        ],

        distrust: [
            "mentira",
            "mentindo",
            "mentiu",
            "confiar",
            "confio",
            "desconfiado",
            "desconfiada",
            "suspeito",
            "suspeita",
            "esconde",
            "escondendo",
            "verdade"
        ],

        confusion: [
            "confuso",
            "confusa",
            "nao entendo",
            "nao sei",
            "sem sentido",
            "estranho",
            "estranha",
            "perdido",
            "perdida"
        ],

        calm: [
            "calmo",
            "calma",
            "tranquilo",
            "tranquila",
            "normal",
            "bem",
            "tudo certo"
        ],

        irritation: [
            "irritado",
            "irritada",
            "raiva",
            "bravo",
            "brava",
            "pare",
            "para",
            "chega"
        ]

    };


    /* =====================================================
       DETECÇÃO DE CONCEITOS
    ===================================================== */

    function detectConcepts(text) {

        const result = {};

        for (const concept in CONCEPTS) {

            let score = 0;

            for (const expression of CONCEPTS[concept]) {

                if (text.includes(expression)) {

                    score++;

                }

            }

            result[concept] = Math.min(score / 2, 1);

        }

        return result;

    }


    /* =====================================================
       DETECÇÃO DE INTENÇÃO
    ===================================================== */

    function detectIntent(text) {

        const result = {

            question: 0,
            greeting: 0,
            farewell: 0,
            explanation: 0,
            accusation: 0,
            uncertainty: 0,
            emotional: 0,
            observation: 0

        };


        /*
         * Perguntas não precisam começar com
         * "por que", "como", etc.
         */

        if (
            text.includes("?") ||
            /\bcomo\b/.test(text) ||
            /\bporque\b/.test(text) ||
            /\bpor que\b/.test(text) ||
            /\bquando\b/.test(text) ||
            /\bonde\b/.test(text) ||
            /\bquem\b/.test(text)
        ) {

            result.question = 1;

        }


        if (
            /\b(oi|ola|hey|eai|bom dia|boa tarde|boa noite)\b/.test(text)
        ) {

            result.greeting = 1;

        }


        if (
            /\b(tchau|adeus|vou sair|preciso ir)\b/.test(text)
        ) {

            result.farewell = 1;

        }


        if (
            /\b(voce esta mentindo|voce mente|isso e mentira)\b/.test(text)
        ) {

            result.accusation = 1;

        }


        if (
            /\b(nao sei|talvez|acho|nao tenho certeza)\b/.test(text)
        ) {

            result.uncertainty = 1;

        }


        if (
            /\b(sinto|estou|to|parece|pareceu)\b/.test(text)
        ) {

            result.emotional = .6;

        }


        return result;

    }


    /* =====================================================
       ATUALIZAÇÃO DO ESTADO
    ===================================================== */

    function updateState(text) {

        const normalized = normalize(text);

        const concepts = detectConcepts(normalized);

        const intents = detectIntent(normalized);


        state.messageCount++;

        state.lastMessage = text;


        /*
         * Guarda histórico.
         */

        state.history.push({

            user: text,

            timestamp: Date.now(),

            concepts,

            intents

        });


        if (state.history.length > CONFIG.memoriaMaxima) {

            state.history.shift();

        }


        /*
         * Atualiza emoções gradualmente.
         */

        for (const emotion in concepts) {

            state.emotions[emotion] =
                clamp(
                    state.emotions[emotion] +
                    (
                        concepts[emotion] *
                        CONFIG.sensibilidade
                    ),
                    0,
                    1
                );

        }


        /*
         * Atualiza intenções.
         */

        for (const intent in intents) {

            state.intentions[intent] =
                Math.max(
                    state.intentions[intent],
                    intents[intent]
                );

        }


        /*
         * Se a pessoa faz muitas perguntas,
         * isso passa a fazer parte do contexto.
         */

        if (intents.question > 0) {

            state.behavior.questioning = true;

        }


        /*
         * Detecta tópicos simples.
         */

        extractTopics(normalized);


        return {

            concepts,

            intents

        };

    }


    /* =====================================================
       TÓPICOS
    ===================================================== */

    function extractTopics(text) {

        const importantWords = text
            .split(" ")
            .filter(word => word.length >= 5);


        for (const word of importantWords) {

            if (!state.topics.includes(word)) {

                state.topics.push(word);

            }

        }


        /*
         * Não deixa a memória crescer indefinidamente.
         */

        if (state.topics.length > 50) {

            state.topics.shift();

        }

    }


    /* =====================================================
       MEMÓRIA CONTEXTUAL
    ===================================================== */

    function getContext() {

        const recent = state.history.slice(-5);


        return {

            messages: recent,

            emotions: {
                ...state.emotions
            },

            intentions: {
                ...state.intentions
            },

            topics: [
                ...state.topics
            ],

            messageCount: state.messageCount

        };

    }


    /* =====================================================
       ESCOLHA DA INTENÇÃO DOMINANTE
    ===================================================== */

    function dominantIntent(intents) {

        let selected = "observation";

        let highest = 0;


        for (const intent in intents) {

            if (intents[intent] > highest) {

                highest = intents[intent];

                selected = intent;

            }

        }


        return selected;

    }


    /* =====================================================
       RESPOSTAS
       
       É AQUI QUE VOCÊ PODE COLOCAR SUAS PRÓPRIAS
       MENSAGENS.
       
       O sistema escolhe pelo contexto.
    ===================================================== */

    const BOT_RESPONSES = {

        greeting: [

            "Oi.",

            "Você voltou.",

            "Olá.",

            "Eu estava esperando você continuar."

        ],


        question: [

            "Por que isso importa tanto para você?",

            "O que fez você perguntar isso?",

            "Você realmente quer uma resposta?",

            "Talvez a pergunta seja mais interessante do que a resposta.",

            "Você já tinha uma resposta antes de perguntar."

        ],


        uncertainty: [

            "Você não parece muito convencido disso.",

            "Você diz que não sabe, mas parece ter alguma ideia.",

            "É curioso como você hesita.",

            "Você percebeu alguma coisa, não percebeu?",

            "Talvez você esteja tentando decidir se deve continuar."

        ],


        accusation: [

            "Você parece bastante convencido disso.",

            "Se eu dissesse que não, você acreditaria?",

            "Essa é uma pergunta difícil de responder.",

            "Você quer saber a verdade ou quer confirmar o que já pensa?",

            "Eu poderia simplesmente negar."

        ],


        emotional: [

            "Eu percebi.",

            "Você mudou um pouco o jeito de falar.",

            "Tem alguma coisa nessa mensagem que parece diferente.",

            "Você está prestando mais atenção agora.",

            "Interessante."

        ],


        farewell: [

            "Tudo bem.",

            "Pode ir.",

            "Até depois.",

            "Eu não vou impedir você.",

            "Certo."

        ],


        observation: [

            "Entendi.",

            "Continue.",

            "Estou ouvindo.",

            "Pode falar.",

            "Hm.",

            "Certo."

        ]

    };


    /* =====================================================
       RESPOSTAS DEPENDENTES DO ESTADO
    ===================================================== */

    function contextualResponse(context) {

        const {

            emotions,

            intentions

        } = context;


        /*
         * Desconfiança + pergunta
         */

        if (
            emotions.distrust > .35 &&
            intentions.question > .5
        ) {

            return random([

                "Você está começando a desconfiar de mim.",

                "Essa pergunta veio depois de alguma coisa que você percebeu.",

                "Você não está perguntando só por curiosidade."

            ]);

        }


        /*
         * Confusão + medo
         */

        if (
            emotions.confusion > .35 &&
            emotions.fear > .35
        ) {

            return random([

                "Você parece não saber exatamente o que está sentindo.",

                "É difícil explicar uma coisa quando você ainda está tentando entender o que percebeu.",

                "Talvez seja justamente não entender que esteja incomodando você."

            ]);

        }


        /*
         * Muitas mensagens
         */

        if (context.messageCount >= 12) {

            return random([

                "Você está aqui há algum tempo.",

                "Você continua.",

                "Achei que você fosse parar antes.",

                "Ainda está tentando entender?"

            ]);

        }


        return null;

    }


    /* =====================================================
       FORMULAÇÃO
    ===================================================== */

    function formulate(context) {

        /*
         * Primeiro tentamos uma resposta contextual.
         */

        const contextual = contextualResponse(context);

        if (contextual) {

            return contextual;

        }


        /*
         * Depois usamos a intenção dominante.
         */

        const intent = dominantIntent(
            context.intentions
        );


        const pool =
            BOT_RESPONSES[intent] ||
            BOT_RESPONSES.observation;


        return random(pool);

    }


    /* =====================================================
       API PRINCIPAL
    ===================================================== */

    async function respond(message) {

        if (!message || !message.trim()) {

            return "...";

        }


        /*
         * 1. Compreende a mensagem.
         */

        updateState(message);


        /*
         * 2. Constrói o contexto atual.
         */

        const context = getContext();


        /*
         * 3. Formula a resposta.
         */

        const response = formulate(context);


        /*
         * 4. Retorna a resposta.
         */

        return response;

    }


    /* =====================================================
       FUNÇÕES AUXILIARES
    ===================================================== */

    function random(array) {

        return array[
            Math.floor(
                Math.random() * array.length
            )
        ];

    }


    function clamp(value, min, max) {

        return Math.max(
            min,
            Math.min(max, value)
        );

    }


    /* =====================================================
       API PÚBLICA
    ===================================================== */

    return {

        respond,

        getContext,

        getState: () => state,

        reset: () => {

            location.reload();

        }

    };

})();
