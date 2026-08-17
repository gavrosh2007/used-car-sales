(function() {
    console.log('[PaymentLoader] Загрузчик активен');

    function loadPaymentModule() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'payment-module.js';
            script.onload = () => {
                console.log('[PaymentLoader] Модуль успешно загружен');
                resolve();
            };
            script.onerror = () => {
                console.warn('[PaymentLoader] Модуль не найден, работаем со старой системой');
                reject();
            };
            document.head.appendChild(script);
        });
    }

    // Проверяем, существует ли файл payment-module.js
    fetch('payment-module.js', { method: 'HEAD', cache: 'no-store' })
        .then(response => {
            if (response.ok) {
                console.log('[PaymentLoader] Модуль найден, загружаем...');
                return loadPaymentModule();
            } else {
                console.log('[PaymentLoader] Модуль отсутствует, используем старую систему');
                return Promise.reject();
            }
        })
        .catch(() => {
            console.log('[PaymentLoader] Ошибка проверки, используем старую систему');
        });
})();