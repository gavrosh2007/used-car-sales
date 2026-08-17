(function() {
    console.log('[PaymentModule] Универсальный платёжный модуль активирован');

    // --- Конфигурация ---
    const CONFIG = {
        nowpayments: {
            apiUrl: 'https://api.nowpayments.io/v1/invoice',
            currency: 'eur',
            payCurrency: 'usdt'
        },
        stripe: {
            mode: 'test' // test или live
        }
    };

    // --- Вспомогательные функции ---
    function getTranslation(key) {
        // Пытаемся получить перевод из существующей системы, если она есть
        if (window.translations && window.currentLang) {
            return window.translations[window.currentLang]?.[key] || key;
        }
        return key;
    }

    function addHistory(service, amount, status) {
        const data = JSON.parse(localStorage.getItem('paymentHistory') || '[]');
        data.push({ service, amount, status, date: new Date().toISOString() });
        localStorage.setItem('paymentHistory', JSON.stringify(data));
        // Обновляем интерфейс истории, если он есть
        const historyList = document.getElementById('historyList');
        if (historyList) {
            const li = document.createElement('li');
            const date = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
            li.innerHTML = `<span>${service} — €${amount}</span><span class="status status-${status}">${status}</span>`;
            historyList.prepend(li);
            const historyPanel = document.getElementById('historyPanel');
            if (historyPanel) historyPanel.classList.add('visible');
        }
    }

    // --- Обработчики платежей ---
    function handleCryptoPayment(amount, service) {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch(CONFIG.nowpayments.apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        price_amount: amount,
                        price_currency: CONFIG.nowpayments.currency,
                        pay_currency: CONFIG.nowpayments.payCurrency,
                        order_id: `order_${Date.now()}`,
                        order_description: service || `Payment: ${amount} EUR`
                    })
                });
                if (!response.ok) throw new Error('API error');
                const data = await response.json();
                if (data.invoice_url) {
                    window.open(data.invoice_url, '_blank');
                    addHistory(service || 'Крипто-платёж', amount, 'pending');
                    resolve(data);
                } else {
                    reject(new Error('No invoice URL'));
                }
            } catch (error) {
                console.error('[PaymentModule] Crypto payment error:', error);
                reject(error);
            }
        });
    }

    function handleFiatPayment(amount, service) {
        // В тестовом режиме — просто alert
        if (CONFIG.stripe.mode === 'test') {
            alert(`💳 Тестовый платёж на €${amount}.\nУслуга: ${service || 'Не указана'}\n\nВ реальном режиме здесь будет открываться Stripe Checkout.`);
            addHistory(service || 'Фиат-платёж', amount, 'paid');
            return Promise.resolve({ status: 'test' });
        } else {
            // Здесь будет реальная интеграция со Stripe
            alert('Режим live пока не настроен. Используйте тестовый режим.');
            return Promise.reject(new Error('Live mode not configured'));
        }
    }

    // --- Перехват кликов по кнопкам оплаты ---
    function interceptPaymentButtons() {
        document.querySelectorAll('.pay-btn').forEach(btn => {
            // Удаляем старые обработчики, если они были (чтобы не было дублирования)
            // Но НЕ удаляем, чтобы старая система могла работать как бекап
            // Мы просто добавляем свой обработчик, который срабатывает первым
            btn.addEventListener('click', function(e) {
                const service = this.dataset.service || 'Услуга';
                const price = parseFloat(this.dataset.price) || 0;
                if (price <= 0) {
                    alert('Укажите сумму для оплаты.');
                    return;
                }
                
                // Предлагаем выбор метода оплаты
                const choice = confirm(`💳 Оплата: ${service}\nСумма: €${price}\n\nВыберите метод:\n[OK] — Криптовалюта\n[Отмена] — Карта (тестовый режим)`);
                
                if (choice) {
                    // Криптовалюта
                    handleCryptoPayment(price, service).catch(err => {
                        alert('Ошибка при создании крипто-платежа. Попробуйте другой метод.');
                    });
                } else {
                    // Фиат
                    handleFiatPayment(price, service).catch(err => {
                        alert('Ошибка при создании фиат-платежа. Попробуйте другой метод.');
                    });
                }
            }, true); // true — перехват на фазе захвата (выше старого обработчика)
        });
    }

    // --- Инициализация ---
    function init() {
        console.log('[PaymentModule] Инициализация...');
        // Перехватываем кнопки оплаты, которые уже есть на странице
        interceptPaymentButtons();
        
        // Также подписываемся на изменения DOM, если кнопки добавляются динамически
        const observer = new MutationObserver(() => {
            interceptPaymentButtons();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        console.log('[PaymentModule] Готов к работе. Старая система сохранена как бекап.');
    }

    // Запускаем, если DOM загружен
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();