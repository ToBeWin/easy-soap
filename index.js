document.addEventListener('DOMContentLoaded', () => {
    // DOM元素
    const urlInput = document.getElementById('url');
    const actionInput = document.getElementById('action');
    const requestInput = document.getElementById('request');
    const sendBtn = document.getElementById('send-btn');
    const statusEl = document.getElementById('status');
    const timeEl = document.getElementById('time');
    const responseEl = document.getElementById('response');
    
    // 语言和主题设置元素
    const langSelect = document.getElementById('lang-select');
    const themeSelect = document.getElementById('theme-select');
    
    // 当前语言和主题
    let currentLang = 'zh';
    let currentTheme = 'light';
    
    // 添加一些SOAP请求的示例模板
    const soapTemplate = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <NumberToWords xmlns="http://www.dataaccess.com/webservicesserver/">
      <ubiNum>123</ubiNum>
    </NumberToWords>
  </soap:Body>
</soap:Envelope>`;

    requestInput.value = soapTemplate;
    urlInput.value = 'https://www.dataaccess.com/webservicesserver/NumberConversion.wso';

    
    // 从本地存储加载设置
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
            chrome.storage.local.get(['soapUrl', 'soapAction', 'soapRequest', 'lang', 'theme'], (result) => {
                if (result.soapUrl) urlInput.value = result.soapUrl;
                if (result.soapAction) actionInput.value = result.soapAction;
                if (result.soapRequest) requestInput.value = result.soapRequest;
                
                // 加载语言和主题设置
                if (result.lang) {
                    currentLang = result.lang;
                    langSelect.value = currentLang;
                }
                
                if (result.theme) {
                    currentTheme = result.theme;
                    themeSelect.value = currentTheme;
                }
                
                // 应用语言和主题设置
                applyLanguage(currentLang);
                applyTheme(currentTheme);
            });
        } catch (error) {
            console.warn('无法从本地存储加载数据:', error);
            
            // 应用默认设置
            applyLanguage(currentLang);
            applyTheme(currentTheme);
        }
    } else {
        console.warn('chrome.storage API 不可用，无法保存设置。');
        
        // 应用默认设置
        applyLanguage(currentLang);
        applyTheme(currentTheme);
    }
    
    // 语言切换事件处理
    langSelect.addEventListener('change', () => {
        currentLang = langSelect.value;
        applyLanguage(currentLang);
        saveSettings();
    });
    
    // 主题切换事件处理
    themeSelect.addEventListener('change', () => {
        currentTheme = themeSelect.value;
        applyTheme(currentTheme);
        saveSettings();
    });

    sendBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        const action = actionInput.value.trim();
        const request = requestInput.value.trim();

        if (!url) {
            alert(langs[currentLang].enterUrlAlert);
            return;
        }

        if (!request) {
            alert(langs[currentLang].enterBodyAlert);
            return;
        }

        // 保存当前值到本地存储（如果可用）
        saveSettings();

        // 清空之前的响应
        statusEl.textContent = '...';
        timeEl.textContent = '';
        responseEl.textContent = langs[currentLang].sendingMessage;
        
        // 禁用发送按钮
        sendBtn.disabled = true;
        
        const startTime = new Date().getTime();
        
        try {
            let response;
            // 检查是否是扩展环境
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                // 扩展环境 - 通过background脚本发送请求
                response = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        action: "sendSoapRequest",
                        url: url,
                        soapAction: action,
                        xmlBody: request
                    }, (result) => {
                        resolve(result);
                    });
                });
                
                handleResponse(response, startTime);
            } else {
                // 非扩展环境 - 直接发送请求 (可能会有跨域问题)
                sendDirectRequest(url, action, request, startTime);
            }
        } catch (error) {
            const endTime = new Date().getTime();
            const duration = endTime - startTime;
            
            statusEl.textContent = langs[currentLang].requestFailed;
            statusEl.style.color = 'red';
            timeEl.textContent = `${duration} ms`;
            responseEl.textContent = `${langs[currentLang].requestFailed}: ${error.message}`;
            
            // 重新启用发送按钮
            sendBtn.disabled = false;
        }
    });
    
    // 应用语言设置
    function applyLanguage(lang) {
        if (!langs[lang]) {
            console.error(`语言 ${lang} 不存在`);
            return;
        }
        
        const l = langs[lang];
        
        // 更新标题和副标题
        document.getElementById('title').textContent = l.title;
        document.getElementById('subtitle').textContent = l.subtitle;
        document.title = l.title;
        
        // 更新语言选择标签
        document.getElementById('lang-label').textContent = l.langSwitchLabel;
        
        // 更新主题选择标签
        document.getElementById('theme-label').textContent = l.themeSwitchLabel;
        document.getElementById('light-option').textContent = l.lightTheme;
        document.getElementById('dark-option').textContent = l.darkTheme;
        document.getElementById('pro-option').textContent = l.proTheme;
        
        // 更新表单标签
        document.getElementById('url-label').textContent = l.urlLabel;
        document.getElementById('action-label').textContent = l.actionLabel;
        document.getElementById('request-label').textContent = l.requestLabel;
        
        // 更新占位符
        urlInput.placeholder = l.urlPlaceholder;
        actionInput.placeholder = l.actionPlaceholder;
        requestInput.placeholder = l.requestPlaceholder;
        
        // 更新按钮
        sendBtn.textContent = l.sendButton;
        
        // 更新响应区域
        document.getElementById('response-title').textContent = l.responseTitle;
        document.getElementById('status-label').textContent = l.statusLabel;
        document.getElementById('time-label').textContent = l.timeLabel;
        
        // 只有在未开始请求时才更新响应内容
        if (responseEl.textContent === '等待请求...' || responseEl.textContent === 'Waiting for request...') {
            responseEl.textContent = l.waitingMessage;
        }
        
        // 更新页脚
        document.getElementById('footer-text').textContent = l.footer;
    }
    
    // 应用主题设置
    function applyTheme(theme) {
        document.documentElement.className = `theme-${theme}`;
    }
    
    // 保存设置到本地存储
    function saveSettings() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            try {
                chrome.storage.local.set({
                    soapUrl: urlInput.value.trim(),
                    soapAction: actionInput.value.trim(),
                    soapRequest: requestInput.value.trim(),
                    lang: currentLang,
                    theme: currentTheme
                });
            } catch (error) {
                console.warn('无法保存数据到本地存储:', error);
            }
        }
    }
    
    // 直接发送SOAP请求（在非扩展环境中使用）
    function sendDirectRequest(url, soapAction, xmlBody, startTime) {
        // 使用XMLHttpRequest发送SOAP请求
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'text/xml;charset=UTF-8');
        
        // 如果提供了SOAPAction，添加到头部
        if (soapAction) {
            xhr.setRequestHeader('SOAPAction', soapAction);
        }
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) { // 请求完成
                const endTime = new Date().getTime();
                const duration = endTime - startTime;
                
                // 显示响应时间
                timeEl.textContent = `${duration} ms`;
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    // 请求成功
                    statusEl.textContent = `${xhr.status} ${xhr.statusText || 'OK'}`;
                    statusEl.style.color = 'green';
                    
                    // 格式化并显示XML响应
                    const responseText = xhr.responseText;
                    const formattedXml = formatXml(responseText);
                    responseEl.textContent = formattedXml;
                } else {
                    // 请求失败
                    statusEl.textContent = `${xhr.status} ${xhr.statusText || 'Error'}`;
                    statusEl.style.color = 'red';
                    
                    if (xhr.responseText) {
                        responseEl.textContent = xhr.responseText;
                    } else {
                        responseEl.textContent = langs[currentLang].corsError;
                    }
                }
                
                // 重新启用发送按钮
                sendBtn.disabled = false;
            }
        };
        
        // 处理请求错误（如跨域错误等）
        xhr.onerror = function() {
            const endTime = new Date().getTime();
            const duration = endTime - startTime;
            
            statusEl.textContent = langs[currentLang].requestFailed;
            statusEl.style.color = 'red';
            timeEl.textContent = `${duration} ms`;
            responseEl.textContent = langs[currentLang].corsError;
            
            // 重新启用发送按钮
            sendBtn.disabled = false;
        };
        
        // 发送请求
        xhr.send(xmlBody);
    }
    
    // 处理响应的通用函数
    function handleResponse(response, startTime) {
        const endTime = new Date().getTime();
        const duration = endTime - startTime;
        
        // 显示响应时间
        timeEl.textContent = `${duration} ms`;
        
        if (response) {
            // 显示响应状态
            statusEl.textContent = `${response.status} ${response.statusText}`;
            statusEl.style.color = response.success ? 'green' : 'red';
            
            // 格式化并显示响应内容
            if (response.responseText) {
                const formattedXml = formatXml(response.responseText);
                responseEl.textContent = formattedXml;
            } else {
                responseEl.textContent = langs[currentLang].noResponseData;
            }
        } else {
            // 处理没有收到响应的情况
            statusEl.textContent = langs[currentLang].requestFailed;
            statusEl.style.color = 'red';
            responseEl.textContent = langs[currentLang].backendError;
        }
        
        // 重新启用发送按钮
        sendBtn.disabled = false;
    }

    // 格式化XML
    function formatXml(xml) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, 'text/xml');
            
            // 检查解析错误
            const parseError = xmlDoc.getElementsByTagName('parsererror');
            if (parseError.length > 0) {
                return xml; // 如果解析错误，返回原始文本
            }
            
            const serializer = new XMLSerializer();
            const xmlString = serializer.serializeToString(xmlDoc);
            
            // 简单格式化XML（通过添加缩进）
            let formatted = '';
            let indent = '';
            const tab = '  ';
            
            xmlString.split(/>\s*</).forEach(node => {
                if (node.match(/^\/\w/)) {
                    // 结束标签
                    indent = indent.substring(tab.length);
                }
                
                formatted += indent + '<' + node + '>\r\n';
                
                if (node.match(/^<?\w[^>]*[^\/]$/) && !node.startsWith('?')) {
                    // 开始标签且非自闭合
                    indent += tab;
                }
            });
            
            return formatted.substring(1, formatted.length - 3);
        } catch (e) {
            console.error('XML格式化失败:', e);
            return xml; // 出错则返回原始文本
        }
    }
}); 