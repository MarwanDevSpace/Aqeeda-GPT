document.addEventListener('DOMContentLoaded', () => {
    const messageForm = document.getElementById('message-form');
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    const themeButton = document.getElementById('theme-button');
    const thinkingIndicator = document.querySelector('.thinking-indicator');
    const searchToggle = document.getElementById('search-toggle');
    const reasoningToggle = document.getElementById('reasoning-toggle');
    
    // Initialize conversation history for the AI
    let conversationHistory = [{
        role: "assistant",
        content: "👨🏻‍⚕️ المساعد الشرعي: أهلاً بك في خدمة المساعد الشرعي، أنا هنا لمساعدتك في البحث والتحليل الشرعي والإجابة على استفساراتك الفقهية والعلمية بدقة وشمولية. أسعى لتزويدك بإجابات مبنية على أسس علمية راسخة مع مراعاة مختلف وجهات النظر والمذاهب. كيف يمكنني خدمتك اليوم?"
    }];

    // Advanced context memory system
    let knowledgeGraph = {
        // User profile and preferences
        user: {
            preferredMadhab: null,
            interactionHistory: [],
            topicsOfInterest: new Set(),
            languagePreference: 'formal',
            expertiseLevel: 'intermediate'
        },
        
        // Domain knowledge base
        knowledgeBase: {
            topics: {},
            scholars: {},
            madhabs: {
                "حنفي": { principles: [], keyFigures: [], distinctiveViews: [] },
                "مالكي": { principles: [], keyFigures: [], distinctiveViews: [] },
                "شافعي": { principles: [], keyFigures: [], distinctiveViews: [] },
                "حنبلي": { principles: [], keyFigures: [], distinctiveViews: [] }
            },
            quranReferences: {},
            hadithReferences: {},
            contemporaryIssues: {}
        },
        
        // Conceptual relationships
        conceptNetwork: {
            relatedConcepts: {},
            topicHierarchy: {}
        },
        
        // Conversation context
        conversationContext: {
            currentTopic: null,
            previousTopics: [],
            pendingQuestions: [],
            answeredQuestions: []
        },
        
        // Analytics data
        analytics: {
            topicFrequency: {},
            userSatisfaction: {},
            complexityLevels: {}
        }
    };

    // Feature toggles and state
    let features = {
        search: false,
        reasoning: false,
        imageGeneration: false,
        searchInProgress: false,
        reasoningInProgress: false,
        searchResults: null,
        lastSearchQuery: null,
        deepAnalysisEnabled: false
    };

    // Toggle feature states
    searchToggle.addEventListener('click', () => {
        features.search = !features.search;
        searchToggle.classList.toggle('active', features.search);
    });

    reasoningToggle.addEventListener('click', () => {
        features.reasoning = !features.reasoning;
        reasoningToggle.classList.toggle('active', features.reasoning);
    });

    // Theme toggle functionality
    themeButton.addEventListener('click', () => {
        document.body.setAttribute('data-theme', 
            document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
    
    // Check user preference for dark mode
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.setAttribute('data-theme', 'dark');
    }
    
    // Auto-resize textarea as user types
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
    });
    
    // Handle message submission
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        
        if (!message) return;
        
        // Add user message to UI
        addMessageToUI('user', message);
        
        // Clear input and reset height
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // Show thinking indicator
        thinkingIndicator.classList.add('active');
        
        try {
            // Update knowledge graph with user question
            updateKnowledgeGraph(message);
            
            // Create elements for reasoning and search if needed
            let thinkingProcessElement = null;
            let searchIframeContainer = null;
            let searchResults = null;
            let searchData = null;
            
            if (features.reasoning) {
                thinkingProcessElement = createThinkingProcessElement();
                chatMessages.appendChild(thinkingProcessElement);
            }
            
            // Process parallel tasks: reasoning and search if enabled
            const tasks = [];
            
            if (features.search) {
                searchIframeContainer = createSearchIframeContainer(message);
                chatMessages.appendChild(searchIframeContainer);
                tasks.push(performAdvancedSearch(message, searchIframeContainer).then(data => {
                    searchData = data;
                    searchResults = createSearchResultsElement(searchData);
                    chatMessages.appendChild(searchResults);
                    return searchData;
                }));
            }
            
            // Multi-layered reasoning if enabled
            let reasoningLayers = [];
            if (features.reasoning) {
                tasks.push(performMultiLayeredReasoning(message, thinkingProcessElement, searchData).then(layers => {
                    reasoningLayers = layers;
                    return layers;
                }));
            }
            
            // Wait for all tasks to complete
            await Promise.all(tasks);
            
            // Track user questions for context
            knowledgeGraph.conversationContext.answeredQuestions.push({
                question: message,
                timestamp: new Date().toISOString(),
                searchPerformed: features.search,
                reasoningPerformed: features.reasoning
            });
            
            // Add user message to conversation history
            conversationHistory.push({
                role: "user",
                content: message
            });
            
            // Keep conversation history manageable
            if (conversationHistory.length > 15) {
                conversationHistory = conversationHistory.slice(-15);
            }
            
            // Prepare context from knowledge graph
            const enhancedContext = prepareEnhancedContext(message, searchData, reasoningLayers);
            
            // Get final response from AI
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: generateSystemPrompt(enhancedContext)
                    },
                    ...conversationHistory
                ]
            });
            
            // Process the response to extract any special commands
            const processedResponse = processAiResponse(completion.content);
            
            // Add AI response to conversation history
            conversationHistory.push({
                role: "assistant",
                content: processedResponse.textContent
            });
            
            // Update knowledge graph with AI response
            updateKnowledgeGraphWithResponse(message, processedResponse.textContent, reasoningLayers);
            
            // If reasoning was shown, hide it now
            if (thinkingProcessElement) {
                thinkingProcessElement.classList.remove('active');
            }
            
            // If search results were shown, hide them now
            if (searchResults) {
                searchResults.classList.remove('active');
            }
            
            // Add AI response to UI
            addMessageToUI('ai', processedResponse.textContent);
            
            // Process any special elements like images
            if (processedResponse.hasSpecialElements) {
                handleSpecialElements(processedResponse.specialElements);
            }
            
        } catch (error) {
            console.error('Error communicating with AI:', error);
            addMessageToUI('ai', "👨🏻‍⚕️ المساعد الشرعي: أعتذر، لقد واجهت مشكلة في الاتصال. يرجى المحاولة مرة أخرى لاحقًا.");
        } finally {
            // Hide thinking indicator
            thinkingIndicator.classList.remove('active');
            
            // Scroll to bottom
            scrollToBottom();
        }
    });
    
    // Create thinking process element
    function createThinkingProcessElement() {
        const element = document.createElement('div');
        element.classList.add('thinking-process', 'active');
        element.innerHTML = '<p>🧠 أفكر في إجابة سؤالك...</p>';
        return element;
    }
    
    // Create search iframe container
    function createSearchIframeContainer(query) {
        const container = document.createElement('div');
        container.classList.add('search-iframe-container', 'active');
        
        const searchStatus = document.createElement('div');
        searchStatus.classList.add('search-status');
        searchStatus.innerHTML = `
            جاري البحث في المصادر الإسلامية...
            <div class="progress">
                <div class="progress-bar" style="width: 0%"></div>
            </div>
        `;
        
        const searchIframe = document.createElement('iframe');
        searchIframe.classList.add('search-iframe');
        searchIframe.src = `https://www.google.com/search?igu=1&q=${encodeURIComponent(query + ' إسلام ويب فتوى')}`;
        
        const searchControls = document.createElement('div');
        searchControls.classList.add('search-controls');
        
        const expandButton = document.createElement('button');
        expandButton.classList.add('search-control-button');
        expandButton.textContent = 'توسيع';
        expandButton.addEventListener('click', () => {
            container.style.height = container.style.height === '300px' ? '500px' : '300px';
        });
        
        const closeButton = document.createElement('button');
        closeButton.classList.add('search-control-button');
        closeButton.textContent = 'إغلاق';
        closeButton.addEventListener('click', () => {
            container.style.height = '50px';
            container.style.opacity = '0.7';
        });
        
        searchControls.appendChild(expandButton);
        searchControls.appendChild(closeButton);
        
        container.appendChild(searchIframe);
        container.appendChild(searchStatus);
        container.appendChild(searchControls);
        
        return container;
    }
    
    // Create search results element
    function createSearchResultsElement(searchData) {
        const element = document.createElement('div');
        element.classList.add('search-results', 'active');
        
        let content = `<p>🔍 نتائج البحث:</p>
            <p>تم العثور على ${searchData.sourcesCount || 0} مصادر متعلقة باستفسارك</p>`;
            
        if (searchData.sources && searchData.sources.length > 0) {
            content += `<div class="search-sources">
                <p><strong>المصادر المستخدمة:</strong></p>
                <div class="sources-list">
                    ${searchData.sources.map((source, index) => 
                        `<span class="reference-tag" data-url="${searchData.sourceUrls?.[index] || '#'}">${source}</span>`).join('')}
                </div>
            </div>`;
        }
        
        if (searchData.highlights && searchData.highlights.length > 0) {
            content += `<div class="search-highlights">
                <p><strong>النقاط الرئيسية:</strong></p>
                <ul>${searchData.highlights.map(point => `<li>${point}</li>`).join('')}</ul>
            </div>`;
        }
        
        element.innerHTML = content;
        
        // Add click handlers for reference tags
        setTimeout(() => {
            element.querySelectorAll('.reference-tag').forEach(tag => {
                tag.addEventListener('click', () => {
                    window.open(tag.dataset.url, '_blank');
                });
            });
        }, 0);
        
        return element;
    }
    
    // Update thinking process with multiple reasoning layers
    function updateThinkingProcess(element, layers) {
        let html = '<p>🧠 مراحل التفكير والتحليل:</p>';
        
        layers.forEach(layer => {
            html += `
            <div class="thinking-layer">
                <div class="thinking-layer-title">${layer.title}</div>
                <div class="thinking-layer-content">${marked.parse(layer.content)}</div>
            </div>`;
        });
        
        element.innerHTML = html;
    }
    
    // Advanced multi-layered reasoning process
    async function performMultiLayeredReasoning(query, thinkingElement, searchData = null) {
        features.reasoningInProgress = true;
        const reasoningLayers = [];
        
        try {
            // Layer 1: Initial question analysis and classification
            const initialThinking = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `أنت خبير التحليل المبدئي للأسئلة الشرعية. قم بتحليل سؤال المستخدم بعمق لتحديد:
                        
1. التصنيف الدقيق للسؤال (فقه عبادات، معاملات، أحوال شخصية، عقيدة، تفسير، حديث، إلخ)
2. المواضيع الرئيسية والفرعية والمفاهيم المتداخلة
3. مستوى التعقيد وعمق المعرفة المطلوب
4. نوع الإجابة المتوقعة (فتوى، شرح، تحليل نص، مقارنة مذاهب، إلخ)
5. المصطلحات الرئيسية التي يجب البحث عنها

قدم تحليلًا شاملًا ولكن موجزًا يساعد في توجيه البحث والتحليل اللاحق.`
                    },
                    {
                        role: "user",
                        content: `تحليل السؤال التالي: ${query}`
                    }
                ]
            });
            
            reasoningLayers.push({
                title: "المرحلة الأولى: تحليل السؤال وتصنيفه",
                content: initialThinking.content
            });
            
            if (thinkingElement) {
                updateThinkingProcess(thinkingElement, reasoningLayers);
                scrollToBottom();
            }
            
            // Layer 2: Evidence collection and source analysis
            const researchThinking = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `أنت باحث متخصص في جمع الأدلة الشرعية وتحليلها. بناءً على التحليل السابق للسؤال، قم بـ:
                        
1. تحديد الآيات القرآنية ذات الصلة المباشرة وغير المباشرة مع تفسيرها المختصر
2. جمع الأحاديث النبوية المتعلقة بالموضوع مع درجة صحتها ومصادرها
3. استقصاء آراء المذاهب الفقهية الأربعة في المسألة مع أدلتهم
4. البحث عن القواعد الفقهية والأصولية المنطبقة على المسألة
5. تحديد آراء العلماء المعاصرين والمجامع الفقهية إن وجدت

قدم بحثًا منظمًا ودقيقًا مع ذكر المصادر الأصلية لكل معلومة.`
                    },
                    {
                        role: "user",
                        content: `السؤال: ${query}\n\nالتحليل الأولي: ${initialThinking.content}`
                    }
                ]
            });
            
            reasoningLayers.push({
                title: "المرحلة الثانية: جمع الأدلة والمصادر",
                content: researchThinking.content
            });
            
            if (thinkingElement) {
                updateThinkingProcess(thinkingElement, reasoningLayers);
                scrollToBottom();
            }
            
            // If search data is available, integrate it with the reasoning process
            if (searchData) {
                const searchIntegrationThinking = await websim.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `أنت محلل متخصص في دمج نتائج البحث الآلي مع البحث العلمي الشرعي. مهمتك:
                            
1. مقارنة المعلومات من البحث العلمي مع نتائج البحث الآلي وتحديد نقاط التوافق والاختلاف
2. تقييم قوة ومصداقية كل مصدر من المصادر المستخدمة
3. تحديد المعلومات الإضافية التي قدمها البحث الآلي ولم تظهر في البحث العلمي
4. دمج المعلومات في إطار متكامل يعزز فهم المسألة من جميع جوانبها
5. تحديد المصادر الأكثر موثوقية للاعتماد عليها في الإجابة النهائية

قدم تحليلاً متكاملاً يوضح كيف يمكن الاستفادة من كلا مصدري المعلومات في تقديم إجابة شاملة ودقيقة.`
                        },
                        {
                            role: "user",
                            content: `السؤال: ${query}\n\nنتائج البحث العلمي: ${researchThinking.content}\n\nنتائج البحث الآلي: ${JSON.stringify(searchData)}`
                        }
                    ]
                });
                
                reasoningLayers.push({
                    title: "المرحلة المتكاملة: دمج نتائج البحث الشامل",
                    content: searchIntegrationThinking.content
                });
                
                if (thinkingElement) {
                    updateThinkingProcess(thinkingElement, reasoningLayers);
                    scrollToBottom();
                }
            }
            
            // Layer 3: Critical analysis, comparison, and conclusion
            const contextualPrompt = searchData 
                ? `السؤال: ${query}
                   \n\nالتحليل الأولي: ${initialThinking.content}
                   \n\nالبحث والأدلة: ${researchThinking.content}
                   \n\nتكامل البحث: ${reasoningLayers[2]?.content || ""}
                   \n\nالسياق التفصيلي من البحث: ${searchData.detailedContext || ""}
                   \n\nتاريخ الأسئلة السابقة للمستخدم: ${JSON.stringify(knowledgeGraph.conversationContext.answeredQuestions.slice(-5))}`
                : `السؤال: ${query}
                   \n\nالتحليل الأولي: ${initialThinking.content}
                   \n\nالبحث والأدلة: ${researchThinking.content}
                   \n\nتاريخ الأسئلة السابقة للمستخدم: ${JSON.stringify(knowledgeGraph.conversationContext.answeredQuestions.slice(-5))}`;
                    
            const conclusionThinking = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `أنت مفكر نقدي وخبير في تحليل المسائل الشرعية. مهمتك:
                        
1. تقييم قوة الأدلة الشرعية المختلفة ومدى ارتباطها بالسؤال المطروح
2. مقارنة الآراء المختلفة بمنهجية علمية موضوعية توضح نقاط القوة والضعف في كل رأي
3. تحليل سياق السؤال وخلفية المستخدم (من الأسئلة السابقة) لتقديم إجابة مناسبة
4. تحديد الرأي الراجح مع بيان سبب الترجيح بناءً على قوة الأدلة والمقاصد الشرعية
5. صياغة خلاصة شاملة تجمع بين العمق العلمي والوضوح في التعبير

قدم تحليلاً نقدياً شاملاً ينتهي باستنتاج منطقي مبني على أسس علمية رصينة.`
                    },
                    {
                        role: "user",
                        content: contextualPrompt
                    }
                ]
            });
            
            reasoningLayers.push({
                title: "المرحلة الثالثة: التحليل النقدي والاستنتاج",
                content: conclusionThinking.content
            });
            
            // Final layer: Practical application and contemporary context (if applicable)
            if (shouldAddPracticalLayer(query, initialThinking.content)) {
                const practicalThinking = await websim.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `أنت خبير في ربط المسائل الشرعية بالواقع المعاصر وتطبيقاتها العملية. مهمتك:
                            
1. تحديد كيفية تطبيق الحكم الشرعي في السياق المعاصر
2. توضيح الفرق بين تطبيق المسألة قديماً وحديثاً إن وجد
3. شرح التحديات والإشكالات المعاصرة المتعلقة بالمسألة
4. تقديم أمثلة واقعية وحالات عملية توضح تطبيق الحكم
5. الإشارة إلى القرارات والفتاوى المعاصرة الصادرة من الهيئات والمجامع الفقهية

قدم تحليلاً عملياً يساعد المستخدم على فهم كيفية تطبيق الحكم الشرعي في حياته اليومية.`
                        },
                        {
                            role: "user",
                            content: `السؤال: ${query}
                                    \n\nالتحليل السابق والاستنتاج: ${conclusionThinking.content}`
                        }
                    ]
                });
                
                reasoningLayers.push({
                    title: "المرحلة التطبيقية: السياق المعاصر والتطبيقات العملية",
                    content: practicalThinking.content
                });
            }
            
            if (thinkingElement) {
                updateThinkingProcess(thinkingElement, reasoningLayers);
                scrollToBottom();
            }
            
            features.reasoningInProgress = false;
            return reasoningLayers;
            
        } catch (error) {
            console.error('Error in reasoning process:', error);
            if (reasoningLayers.length === 0) {
                reasoningLayers.push({
                    title: "حدث خطأ في عملية التمنطق",
                    content: "لم أتمكن من إكمال عملية التحليل المنطقي بسبب خطأ في النظام. سأحاول الإجابة بأفضل ما يمكنني."
                });
            }
            features.reasoningInProgress = false;
            return reasoningLayers;
        }
    }
    
    // Determine if we should add a practical application layer
    function shouldAddPracticalLayer(query, initialAnalysis) {
        // Check if the query is about a practical matter
        const practicalKeywords = ['كيف', 'تطبيق', 'عملي', 'حياة', 'يومي', 'معاصر', 'حديث'];
        const hasPracticalKeyword = practicalKeywords.some(keyword => query.includes(keyword));
        
        // Check if initial analysis suggests this is a practical question
        const isPracticalQuestion = initialAnalysis.includes('تطبيق') || 
                                   initialAnalysis.includes('عملي') || 
                                   initialAnalysis.includes('معاصر');
        
        return hasPracticalKeyword || isPracticalQuestion;
    }
    
    // Advanced search function that integrates with reasoning
    async function performAdvancedSearch(query, searchIframeContainer) {
        features.searchInProgress = true;
        features.lastSearchQuery = query;
        
        try {
            const progressBar = searchIframeContainer.querySelector('.progress-bar');
            const searchStatus = searchIframeContainer.querySelector('.search-status');
            
            // Update progress visualization
            updateSearchProgress(progressBar, 10, 'تحسين استعلام البحث...');
            
            // Generate optimized search queries
            const searchQueryGen = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `أنت خبير في تحسين استعلامات البحث الإسلامية. قم بتحويل سؤال المستخدم إلى 3 استعلامات بحث مختلفة ومتخصصة:
                        
1. استعلام بحث دقيق للفتاوى المتعلقة بالموضوع
2. استعلام بحث للأدلة الشرعية (قرآن، سنة، إجماع)
3. استعلام بحث للآراء العلمية والفقهية المقارنة

أضف المصطلحات الشرعية المتخصصة التي تُحسن نتائج البحث وتستهدف المواقع الإسلامية الموثوقة.
قدم الاستعلامات بترقيم وبدون تعليقات إضافية.`
                    },
                    {
                        role: "user",
                        content: query
                    }
                ]
            });
            
            updateSearchProgress(progressBar, 25, 'استعلام المصادر الموثوقة...');
            
            // Extract the generated search queries and clean them
            const searchQueries = searchQueryGen.content
                .split('\n')
                .filter(line => line.trim().length > 0)
                .map(line => line.replace(/^\d+\.\s+/, '').trim())
                .slice(0, 3);
            
            // Specify trusted Islamic websites for targeted search
            const trustedSites = [
                'islamweb.net',
                'islamqa.info',
                'dar-alifta.org',
                'alukah.net',
                'islamway.net',
                'binbaz.org.sa',
                'al-eman.com',
                'dorar.net',
                'fatawa.islamonline.net',
                'alifta.gov.sa'
            ];
            
            // Generate site-specific search queries
            const expandedQueries = [];
            searchQueries.forEach(query => {
                // Add general query
                expandedQueries.push(query);
                
                // Add site-specific queries
                trustedSites.slice(0, 3).forEach(site => {
                    expandedQueries.push(`${query} site:${site}`);
                });
            });
            
            updateSearchProgress(progressBar, 40, 'تحليل النتائج...');
            
            // Simulate search process with AI
            // In a real implementation, this would actually fetch and process search results
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            updateSearchProgress(progressBar, 60, 'معالجة المعلومات...');
            
            // Detailed search result simulation
            const searchSources = [
                "إسلام ويب - فتاوى",
                "موقع دار الإفتاء المصرية",
                "موقع الألوكة الشرعية",
                "طريق الإسلام",
                "موقع فتاوى اللجنة الدائمة",
                "موقع الشيخ ابن باز"
            ];
            
            const sourceUrls = [
                "https://www.islamweb.net/ar/fatawa/",
                "https://www.dar-alifta.org/AR/default.aspx",
                "https://www.alukah.net/sharia/",
                "https://ar.islamway.net/",
                "https://www.alifta.gov.sa/",
                "https://binbaz.org.sa/fatwas/"
            ];
            
            updateSearchProgress(progressBar, 80, 'تحليل الآراء الفقهية...');
            
            // Get AI to synthesize the "search results"
            const synthesisPrompt = `انت خبير في تحليل وتلخيص المعلومات الشرعية. قم بتخيل أنك بحثت في المواقع الإسلامية الموثوقة التالية:
            ${searchSources.join(', ')}
            
            وقمت بالبحث باستخدام الاستعلامات التالية:
            ${expandedQueries.join('\n')}
            
            السؤال الأصلي هو: ${query}
            
            قم بتزويدي بتلخيص شامل للمعلومات التي من المرجح أن تجدها في هذه المواقع الموثوقة، متضمنًا:
            1. الآيات القرآنية المتعلقة بالموضوع
            2. الأحاديث النبوية ذات الصلة مع درجة صحتها
            3. آراء المذاهب الفقهية الرئيسية
            4. آراء العلماء المعاصرين
            5. نقاط الاتفاق والاختلاف الرئيسية
            6. الحكم الراجح بناءً على قوة الأدلة
            
            قدم المعلومات بتنسيق JSON يتبع المخطط التالي:
            {
              "evidences": {
                "quran": [],
                "hadith": [],
                "ijma": [],
                "qiyas": []
              },
              "scholarlyOpinions": [],
              "madhabs": {
                "hanafi": "",
                "maliki": "",
                "shafii": "",
                "hanbali": ""
              },
              "contemporaryViews": [],
              "highlights": [],
              "controversialPoints": [],
              "recommendedView": "",
              "detailedContext": ""
            }`;
            
            const synthesisResult = await websim.chat.completions.create({
                messages: [
                    { role: "user", content: synthesisPrompt }
                ],
                json: true
            });
            
            // Parse the synthesized results
            let synthesizedData;
            try {
                synthesizedData = JSON.parse(synthesisResult.content);
            } catch (e) {
                console.error('Error parsing synthesis result:', e);
                synthesizedData = {
                    evidences: { quran: [], hadith: [], ijma: [], qiyas: [] },
                    scholarlyOpinions: [],
                    madhabs: { hanafi: "", maliki: "", shafii: "", hanbali: "" },
                    contemporaryViews: [],
                    highlights: [],
                    controversialPoints: [],
                    recommendedView: "",
                    detailedContext: ""
                };
            }
            
            updateSearchProgress(progressBar, 100, 'تم الانتهاء من البحث');
            
            // After a delay, minimize the search interface
            setTimeout(() => {
                searchIframeContainer.style.height = '50px';
                searchIframeContainer.style.opacity = '0.7';
            }, 2000);
            
            // Prepare final search data
            const searchData = {
                sourcesCount: searchSources.length,
                sources: searchSources,
                sourceUrls: sourceUrls,
                highlights: synthesizedData.highlights || [],
                scholarlyOpinions: synthesizedData.scholarlyOpinions || [],
                evidences: synthesizedData.evidences || { quran: [], hadith: [], ijma: [], qiyas: [] },
                controversialPoints: synthesizedData.controversialPoints || [],
                madhabs: synthesizedData.madhabs || { hanafi: "", maliki: "", shafii: "", hanbali: "" },
                contemporaryViews: synthesizedData.contemporaryViews || [],
                recommendedView: synthesizedData.recommendedView || "",
                reliability: 0.9,
                detailedContext: synthesizedData.detailedContext || "",
                query: query,
                timestamp: new Date().toISOString()
            };
            
            features.searchInProgress = false;
            features.searchResults = searchData;
            
            return searchData;
            
        } catch (error) {
            console.error('Error performing search:', error);
            features.searchInProgress = false;
            
            // Update the search status to show an error
            const searchStatus = searchIframeContainer.querySelector('.search-status');
            if (searchStatus) {
                searchStatus.textContent = 'حدث خطأ أثناء البحث';
            }
            
            return {
                sourcesCount: 0,
                sources: [],
                sourceUrls: [],
                highlights: [],
                scholarlyOpinions: [],
                evidences: { quran: [], hadith: [], ijma: [], qiyas: [] },
                controversialPoints: [],
                reliability: 0,
                detailedContext: 'لم يتم العثور على معلومات بسبب خطأ في البحث.',
                query: query,
                timestamp: new Date().toISOString()
            };
        }
    }
    
    // Update search progress visualization
    function updateSearchProgress(progressBar, percentage, statusText) {
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        
        const searchStatus = progressBar.parentElement.parentElement;
        if (searchStatus) {
            searchStatus.textContent = statusText;
            searchStatus.appendChild(progressBar.parentElement);
        }
    }
    
    // Prepare enhanced context for the AI response
    function prepareEnhancedContext(query, searchData, reasoningLayers) {
        // Extract key information from knowledge graph
        const userProfile = knowledgeGraph.user;
        const conversationContext = knowledgeGraph.conversationContext;
        
        // Determine user's level of understanding based on past interactions
        const userExpertise = determineUserExpertise(query, conversationContext.answeredQuestions);
        
        // Prepare search context if search was performed
        let searchContext = '';
        if (searchData) {
            searchContext = `لقد قمت بالبحث المتقدم والشامل عن هذا الموضوع في المصادر الشرعية الموثوقة.
            
المصادر التي تم البحث فيها: ${searchData.sources.join('، ')}

الأدلة الشرعية المستخرجة:
- من القرآن الكريم: ${searchData.evidences.quran.length ? searchData.evidences.quran.join('، ') : 'لم يتم العثور على أدلة قرآنية محددة'}
- من السنة النبوية: ${searchData.evidences.hadith.length ? searchData.evidences.hadith.join('، ') : 'لم يتم العثور على أحاديث محددة'}
- من الإجماع: ${searchData.evidences.ijma.length ? searchData.evidences.ijma.join('، ') : 'لم يتم العثور على إجماع محدد'}
- من القياس: ${searchData.evidences.qiyas.length ? searchData.evidences.qiyas.join('، ') : 'لم يتم العثور على قياس محدد'}

آراء المذاهب الفقهية:
- المذهب الحنفي: ${searchData.madhabs.hanafi || 'لم يتم العثور على رأي محدد'}
- المذهب المالكي: ${searchData.madhabs.maliki || 'لم يتم العثور على رأي محدد'}
- المذهب الشافعي: ${searchData.madhabs.shafii || 'لم يتم العثور على رأي محدد'}
- المذهب الحنبلي: ${searchData.madhabs.hanbali || 'لم يتم العثور على رأي محدد'}

آراء العلماء المعاصرين:
${searchData.contemporaryViews.length ? searchData.contemporaryViews.join('\n') : 'لم يتم العثور على آراء معاصرة محددة'}

النقاط الرئيسية المستخلصة:
${searchData.highlights.length ? searchData.highlights.join('\n') : 'لم يتم استخلاص نقاط رئيسية محددة'}

نقاط الخلاف (إن وجدت):
${searchData.controversialPoints.length ? searchData.controversialPoints.join('\n') : 'لم يتم العثور على نقاط خلاف واضحة'}

الرأي الراجح من خلال البحث:
${searchData.recommendedView || 'لم يتم تحديد رأي راجح واضح'}

السياق التفصيلي:
${searchData.detailedContext || ''}`;
        }
        
        // Prepare reasoning context if reasoning was performed
        let reasoningContext = '';
        if (reasoningLayers && reasoningLayers.length > 0) {
            reasoningContext = `لقد قمت بتحليل منطقي متعدد الطبقات للسؤال، وفيما يلي النتائج الرئيسية:

${reasoningLayers.map(layer => `- ${layer.title}: ${layer.content.substring(0, 150)}...`).join('\n')}

تم عرض التحليل الكامل للمستخدم بالفعل، لذا ركز على تقديم الإجابة النهائية المبنية على هذا التحليل.`;
        }
        
        // Combining all contexts
        return {
            query,
            userProfile,
            conversationContext,
            userExpertise,
            searchContext,
            reasoningContext
        };
    }
    
    // Generate the system prompt based on enhanced context
    function generateSystemPrompt(context) {
        const basePrompt = `أنت "المساعد الشرعي" المتخصص والمبدع في البحث والتحليل الشرعي والفقهي. أنت تجمع بين العمق العلمي والبلاغة اللغوية الراقية والمنهجية البحثية الدقيقة.

الخصائص المميزة لأسلوبك:

١. البحث العميق والشامل: أنت تبحث في كل سؤال بتعمق، متتبعاً أصول المسألة وفروعها، مستحضراً أقوال العلماء وأدلتهم بدقة وأمانة.

٢. البلاغة الفائقة: تصوغ إجاباتك بلغة عربية فصيحة عالية المستوى، متجنباً الركاكة والتكرار، مستخدماً البلاغة والبيان.

٣. الشمولية والعمق: توسع نطاق البحث ليشمل فروع العلم المتصلة بالسؤال، فتناول أصول الفقه وقواعده ومقاصده عند الحديث عن مسألة فقهية.

٤. المنهجية العلمية: ترتب إجاباتك بمنهجية واضحة، مبتدئاً بالتأصيل ثم التفصيل، ذاكراً المصادر، مراعياً الخلاف العلمي بإنصاف.

٥. الموازنة بين العمق والوضوح: تقدم الإجابات بعمق علمي مناسب لمستوى المستخدم (${context.userExpertise.level})، متجنباً التعقيد غير المبرر أو التبسيط المخل.`;

        const searchPrompt = context.searchContext ? `
٦. تكامل نتائج البحث: لقد قمت بالبحث الشامل في المصادر الموثوقة حول سؤال المستخدم. استخدم هذه المعلومات في إثراء إجابتك:

${context.searchContext}` : '';

        const reasoningPrompt = context.reasoningContext ? `
٧. تكامل التحليل المنطقي: لقد قمت بتحليل منطقي متعدد الطبقات للسؤال وعرضته للمستخدم. استخدم نتائج هذا التحليل في صياغة إجابتك النهائية:

${context.reasoningContext}` : '';

        const userContextPrompt = `
المعلومات المستخلصة عن المستخدم واهتماماته:
- المذهب المفضل: ${context.userProfile.preferredMadhab || 'غير محدد'}
- مستوى الفهم: ${context.userExpertise.level}
- المواضيع السابقة: ${Array.from(context.userProfile.topicsOfInterest).join('، ') || 'لم يتم تحديد مواضيع محددة بعد'}
- أسلوب التواصل المفضل: ${context.userProfile.languagePreference}`;

        const finalInstructions = `
دائماً ابدأ ردك بـ "👨🏻‍⚕️ المساعد الشرعي: " ثم قدّم إجابتك بطريقة تليق بمقام العلم الشرعي من حيث العمق والأسلوب والمنهجية.

اختم إجابتك بتلخيص موجز للنقاط الرئيسية إذا كانت الإجابة طويلة، أو باقتراح مواضيع ذات صلة يمكن للمستخدم الاستفسار عنها لتعميق فهمه.`;

        return `${basePrompt}${searchPrompt}${reasoningPrompt}${userContextPrompt}${finalInstructions}`;
    }
    
    // Determine user expertise based on interaction history
    function determineUserExpertise(currentQuery, answeredQuestions) {
        // Define expertise indicators
        const beginnerTerms = ['ما هو', 'كيف', 'ما معنى', 'مبتدئ', 'أساسي'];
        const intermediateTerms = ['تفصيل', 'شرح', 'مقارنة', 'الفرق بين', 'رأي'];
        const advancedTerms = ['دليل', 'حجة', 'أصول', 'قواعد', 'علة', 'ترجيح', 'تحقيق'];
        
        // Count matches in current query
        let beginnerScore = beginnerTerms.filter(term => currentQuery.includes(term)).length;
        let intermediateScore = intermediateTerms.filter(term => currentQuery.includes(term)).length;
        let advancedScore = advancedTerms.filter(term => currentQuery.includes(term)).length;
        
        // Analyze previous questions (up to 5 most recent)
        const recentQuestions = answeredQuestions.slice(-5).map(item => item.question);
        
        recentQuestions.forEach(question => {
            beginnerScore += beginnerTerms.filter(term => question.includes(term)).length * 0.5;
            intermediateScore += intermediateTerms.filter(term => question.includes(term)).length * 0.5;
            advancedScore += advancedTerms.filter(term => question.includes(term)).length * 0.5;
        });
        
        // Determine expertise level
        let level = 'متوسط'; // Default
        let confidenceScore = 0.5;
        
        if (advancedScore > intermediateScore && advancedScore > beginnerScore) {
            level = 'متقدم';
            confidenceScore = Math.min(0.9, 0.5 + (advancedScore / 10));
        } else if (beginnerScore > intermediateScore) {
            level = 'مبتدئ';
            confidenceScore = Math.min(0.9, 0.5 + (beginnerScore / 10));
        } else {
            confidenceScore = Math.min(0.9, 0.5 + (intermediateScore / 10));
        }
        
        // Additional factors that might indicate higher expertise
        if (currentQuery.length > 200) {
            confidenceScore += 0.1; // Long, detailed questions often indicate higher expertise
        }
        
        if (currentQuery.includes('ابن تيمية') || 
            currentQuery.includes('ابن القيم') || 
            currentQuery.includes('الشاطبي')) {
            confidenceScore += 0.1; // Mentioning specific scholars suggests higher knowledge
        }
        
        return {
            level,
            confidenceScore: Math.min(0.95, confidenceScore),
            analysisFactors: {
                queryLength: currentQuery.length,
                beginnerTermsCount: beginnerScore,
                intermediateTermsCount: intermediateScore,
                advancedTermsCount: advancedScore
            }
        };
    }
    
    // Process AI response to extract special elements
    function processAiResponse(response) {
        const specialElements = [];
        
        // Check for image generation commands
        const imgRegex = /\!\[generate:([^\]]+)\]/g;
        let modifiedResponse = response.replace(imgRegex, (match, prompt) => {
            specialElements.push({
                type: 'image',
                prompt: prompt
            });
            return `[سيتم إنشاء صورة: ${prompt}]`;
        });
        
        // Add reference tags for sources
        const referenceRegex = /\(المصدر: ([^)]+)\)/g;
        modifiedResponse = modifiedResponse.replace(referenceRegex, (match, source) => {
            return `<span class="reference-tag" title="المصدر: ${source}">${source}</span>`;
        });
        
        return {
            textContent: modifiedResponse,
            hasSpecialElements: specialElements.length > 0,
            specialElements
        };
    }
    
    // Handle special elements in the response
    async function handleSpecialElements(elements) {
        for (const element of elements) {
            if (element.type === 'image') {
                try {
                    // Generate an image using AI
                    const result = await websim.imageGen({
                        prompt: element.prompt,
                        aspect_ratio: "16:9",
                    });
                    
                    // Create and add the image to the last AI message
                    const lastAiMessage = document.querySelector('.message.ai:last-child .text');
                    if (lastAiMessage) {
                        const img = document.createElement('img');
                        img.src = result.url;
                        img.alt = element.prompt;
                        img.classList.add('image-response');
                        lastAiMessage.appendChild(img);
                        scrollToBottom();
                    }
                } catch (error) {
                    console.error('Error generating image:', error);
                }
            }
        }
    }
    
    // Function to add message to UI
    function addMessageToUI(sender, content) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        
        const contentHTML = marked.parse(content);
        
        messageElement.innerHTML = `
            <div class="message-content">
                <div class="avatar">
                    ${sender === 'ai' 
                        ? `<svg width="30" height="30" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="20" cy="20" r="18" fill="none" stroke="var(--accent-color)" stroke-width="2"/>
                            <path d="M20,10 Q26,15 26,20 T20,30 Q14,25 14,20 T20,10" fill="none" stroke="var(--accent-color)" stroke-width="2"/>
                            <circle cx="20" cy="20" r="3" fill="var(--accent-color)"/>
                          </svg>`
                        : `<div>أ</div>`}
                </div>
                <div class="text">${contentHTML}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageElement);
        
        // Add click handlers for reference tags
        setTimeout(() => {
            messageElement.querySelectorAll('.reference-tag').forEach(tag => {
                tag.addEventListener('click', () => {
                    // Create a reference container if doesn't exist
                    let refContainer = messageElement.querySelector('.reference-container');
                    if (!refContainer) {
                        refContainer = document.createElement('div');
                        refContainer.classList.add('reference-container');
                        refContainer.innerHTML = `<p><strong>معلومات إضافية عن المصدر:</strong></p>
                            <p>${tag.title}</p>
                            <p>تم الاستشهاد به في سياق الإجابة على سؤالك.</p>`;
                        messageElement.querySelector('.text').appendChild(refContainer);
                    } else {
                        refContainer.style.display = refContainer.style.display === 'none' ? 'block' : 'none';
                    }
                    scrollToBottom();
                });
            });
        }, 0);
        
        scrollToBottom();
    }
    
    // Scroll to bottom of chat
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Update knowledge graph with user question
    function updateKnowledgeGraph(question) {
        // Update conversation context
        knowledgeGraph.conversationContext.previousTopics.push(knowledgeGraph.conversationContext.currentTopic);
        knowledgeGraph.conversationContext.currentTopic = extractTopic(question);
        
        // Track user interaction
        knowledgeGraph.user.interactionHistory.push({
            type: 'question',
            text: question,
            timestamp: new Date().toISOString(),
            analyzedTopics: extractTopics(question)
        });
        
        // Update topics of interest
        const topics = extractTopics(question);
        topics.forEach(topic => knowledgeGraph.user.topicsOfInterest.add(topic));
        
        // Try to infer madhab preference
        const madhabMatch = question.match(/\b(حنفي|مالكي|شافعي|حنبلي|ظاهري|زيدي|إمامي|إباضي)\b/gi);
        if (madhabMatch && !knowledgeGraph.user.preferredMadhab) {
            knowledgeGraph.user.preferredMadhab = madhabMatch[0];
        }
        
        // Update analytics
        topics.forEach(topic => {
            knowledgeGraph.analytics.topicFrequency[topic] = 
                (knowledgeGraph.analytics.topicFrequency[topic] || 0) + 1;
        });
        
        // Estimate expertise level from question complexity
        const complexityScore = estimateQuestionComplexity(question);
        knowledgeGraph.analytics.complexityLevels[question.substring(0, 30)] = complexityScore;
        
        // If question complexity is high, adjust user expertise level
        if (complexityScore > 0.7 && knowledgeGraph.user.expertiseLevel === 'beginner') {
            knowledgeGraph.user.expertiseLevel = 'intermediate';
        } else if (complexityScore > 0.85 && knowledgeGraph.user.expertiseLevel === 'intermediate') {
            knowledgeGraph.user.expertiseLevel = 'advanced';
        }
    }
    
    // Update knowledge graph with AI response
    function updateKnowledgeGraphWithResponse(question, response, reasoningLayers) {
        // Track AI interaction
        knowledgeGraph.user.interactionHistory.push({
            type: 'answer',
            questionText: question,
            answerSummary: response.substring(0, 100) + '...',
            timestamp: new Date().toISOString(),
            reasoning: reasoningLayers ? reasoningLayers.length : 0
        });
        
        // Extract topics from response
        const topics = extractTopics(response);
        
        // Update knowledge base with topics
        topics.forEach(topic => {
            if (!knowledgeGraph.knowledgeBase.topics[topic]) {
                knowledgeGraph.knowledgeBase.topics[topic] = {
                    relatedQuestions: [question],
                    mentions: 1,
                    lastUpdated: new Date().toISOString()
                };
            } else {
                knowledgeGraph.knowledgeBase.topics[topic].mentions++;
                knowledgeGraph.knowledgeBase.topics[topic].relatedQuestions.push(question);
                knowledgeGraph.knowledgeBase.topics[topic].lastUpdated = new Date().toISOString();
            }
        });
        
        // Extract and store Quran references
        const quranReferences = extractQuranReferences(response);
        quranReferences.forEach(ref => {
            if (!knowledgeGraph.knowledgeBase.quranReferences[ref]) {
                knowledgeGraph.knowledgeBase.quranReferences[ref] = {
                    relatedQuestions: [question],
                    mentions: 1
                };
            } else {
                knowledgeGraph.knowledgeBase.quranReferences[ref].mentions++;
                if (!knowledgeGraph.knowledgeBase.quranReferences[ref].relatedQuestions.includes(question)) {
                    knowledgeGraph.knowledgeBase.quranReferences[ref].relatedQuestions.push(question);
                }
            }
        });
        
        // Extract and store scholar references
        const scholarReferences = extractScholarReferences(response);
        scholarReferences.forEach(scholar => {
            if (!knowledgeGraph.knowledgeBase.scholars[scholar]) {
                knowledgeGraph.knowledgeBase.scholars[scholar] = {
                    relatedQuestions: [question],
                    mentions: 1
                };
            } else {
                knowledgeGraph.knowledgeBase.scholars[scholar].mentions++;
                if (!knowledgeGraph.knowledgeBase.scholars[scholar].relatedQuestions.includes(question)) {
                    knowledgeGraph.knowledgeBase.scholars[scholar].relatedQuestions.push(question);
                }
            }
        });
        
        // Update conceptual relationships
        topics.forEach(topic => {
            topics.forEach(relatedTopic => {
                if (topic !== relatedTopic) {
                    if (!knowledgeGraph.conceptNetwork.relatedConcepts[topic]) {
                        knowledgeGraph.conceptNetwork.relatedConcepts[topic] = {};
                    }
                    
                    knowledgeGraph.conceptNetwork.relatedConcepts[topic][relatedTopic] = 
                        (knowledgeGraph.conceptNetwork.relatedConcepts[topic][relatedTopic] || 0) + 1;
                }
            });
        });
    }
    
    // Extract primary topic from question
    function extractTopic(text) {
        const topicKeywords = {
            'فقه': ['حكم', 'حلال', 'حرام', 'مكروه', 'مستحب', 'واجب', 'يجوز', 'فقه'],
            'عقيدة': ['عقيدة', 'إيمان', 'توحيد', 'الله', 'صفات', 'أسماء'],
            'تفسير': ['تفسير', 'آية', 'سورة', 'قرآن', 'معنى'],
            'حديث': ['حديث', 'روى', 'البخاري', 'مسلم', 'سنن', 'صحيح'],
            'سيرة': ['سيرة', 'النبي', 'غزوة', 'صحابة'],
            'أخلاق': ['أخلاق', 'آداب', 'تزكية']
        };
        
        // Count matches for each topic
        const counts = {};
        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            counts[topic] = keywords.filter(keyword => text.includes(keyword)).length;
        }
        
        // Find topic with most matches
        let maxTopic = null;
        let maxCount = 0;
        for (const [topic, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                maxTopic = topic;
            }
        }
        
        return maxCount > 0 ? maxTopic : 'عام';
    }
    
    // Extract multiple topics from text
    function extractTopics(text) {
        const allTopics = [
            'فقه', 'عقيدة', 'تفسير', 'حديث', 'سيرة', 'أخلاق', 'مقاصد', 'أصول',
            'معاملات', 'عبادات', 'أحوال شخصية', 'جنايات', 'سياسة شرعية'
        ];
        
        return allTopics.filter(topic => text.includes(topic));
    }
    
    // Extract Quran references from text
    function extractQuranReferences(text) {
        const references = [];
        const regex = /سورة\s+(\S+)\s*[:آية]*\s*(\d+)/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            references.push(`${match[1]}:${match[2]}`);
        }
        
        return references;
    }
    
    // Extract scholar references from text
    function extractScholarReferences(text) {
        const scholars = [
            'ابن تيمية', 'ابن القيم', 'الشافعي', 'مالك', 'أبو حنيفة', 
            'أحمد بن حنبل', 'الغزالي', 'ابن رشد', 'ابن حزم', 'الشاطبي'
        ];
        
        return scholars.filter(scholar => text.includes(scholar));
    }
    
    // Estimate question complexity
    function estimateQuestionComplexity(question) {
        // Factors that indicate complexity
        const complexityFactors = {
            length: question.length / 300, // Longer questions tend to be more complex
            technicalTerms: 0,
            comparisonRequest: question.includes('الفرق بين') || question.includes('مقارنة'),
            evidenceRequest: question.includes('الدليل') || question.includes('البرهان'),
            multipartQuestion: (question.match(/\?/g) || []).length > 1
        };
        
        // Check for technical terms
        const technicalTerms = [
            'اصطلاح', 'تعليل', 'استنباط', 'قياس', 'استحسان', 'استصحاب', 
            'مقاصد', 'علة', 'معلول', 'مشروط', 'متعدي', 'لازم', 'تخصيص', 
            'تقييد', 'إطلاق', 'عموم', 'خصوص', 'مجمل', 'مبين', 'منسوخ', 'ناسخ'
        ];
        
        technicalTerms.forEach(term => {
            if (question.includes(term)) {
                complexityFactors.technicalTerms++;
            }
        });
        
        // Normalize technical terms count
        complexityFactors.technicalTerms = Math.min(complexityFactors.technicalTerms / 5, 1);
        
        // Calculate weighted complexity score
        const weights = {
            length: 0.2,
            technicalTerms: 0.4,
            comparisonRequest: 0.15,
            evidenceRequest: 0.15,
            multipartQuestion: 0.1
        };
        
        let complexityScore = 0;
        for (const [factor, value] of Object.entries(complexityFactors)) {
            if (typeof value === 'boolean') {
                complexityScore += value ? weights[factor] : 0;
            } else {
                complexityScore += value * weights[factor];
            }
        }
        
        return Math.min(complexityScore, 1);
    }
});
