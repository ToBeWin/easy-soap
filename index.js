document.addEventListener('DOMContentLoaded', () => {
    // DOM元素
    const urlInput = document.getElementById('url');
    const actionInput = document.getElementById('action');
    const requestInput = document.getElementById('request');
    const sendBtn = document.getElementById('send-btn');
    const statusEl = document.getElementById('status');
    const timeEl = document.getElementById('time');
    const responseEl = document.getElementById('response');
    
    // 弹窗相关元素
    const toastContainer = document.getElementById('toast-container');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalInput = document.getElementById('modal-input');
    let modalCancelBtn = document.getElementById('modal-cancel-btn');
    let modalConfirmBtn = document.getElementById('modal-confirm-btn');

    // --- 自定义弹窗函数 ---
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        
        // 触发动画
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    function showModal(options) {
        return new Promise((resolve) => {
            modalTitle.textContent = options.title || '提示';
            modalMessage.textContent = options.message || '';
            
            if (options.type === 'prompt') {
                modalInput.style.display = 'block';
                modalInput.value = options.defaultValue || '';
                modalInput.placeholder = options.placeholder || '';
            } else {
                modalInput.style.display = 'none';
            }

            modalCancelBtn.style.display = options.type === 'alert' ? 'none' : 'block';
            modalCancelBtn.textContent = langs[currentLang].cancelBtn || '取消';
            modalConfirmBtn.textContent = langs[currentLang].confirmBtn || '确认';

            // 清理旧的事件监听
            const newCancelBtn = modalCancelBtn.cloneNode(true);
            modalCancelBtn.parentNode.replaceChild(newCancelBtn, modalCancelBtn);
            // 更新引用，以便下次调用能正确找到
            modalCancelBtn = newCancelBtn;
            
            const newConfirmBtn = modalConfirmBtn.cloneNode(true);
            modalConfirmBtn.parentNode.replaceChild(newConfirmBtn, modalConfirmBtn);
            // 更新引用
            modalConfirmBtn = newConfirmBtn;

            const closeAndResolve = (value) => {
                modalOverlay.classList.remove('show');
                resolve(value);
            };

            newCancelBtn.addEventListener('click', () => closeAndResolve(null));
            newConfirmBtn.addEventListener('click', () => {
                if (options.type === 'prompt') {
                    closeAndResolve(modalInput.value);
                } else {
                    closeAndResolve(true);
                }
            });

            // 允许回车确认
            if (options.type === 'prompt') {
                modalInput.onkeydown = (e) => {
                    if (e.key === 'Enter') newConfirmBtn.click();
                };
            }

            modalOverlay.classList.add('show');
            if (options.type === 'prompt') {
                setTimeout(() => modalInput.focus(), 100);
            }
        });
    }
    // ---------------------

    // 快捷工具按钮
    const formatReqBtn = document.getElementById('format-req-btn');
    const clearReqBtn = document.getElementById('clear-req-btn');
    const copyResBtn = document.getElementById('copy-res-btn');
    
    // 历史记录相关元素
    const historySelect = document.getElementById('history-select');
    const saveHistoryBtn = document.getElementById('save-history-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    let requestHistory = [];
    
    // 分栏拖拽相关元素
    const resizer = document.getElementById('resizer');
    const requestPanel = document.getElementById('request-panel');
    let isResizing = false;
    
    // Headers 相关元素
    const addHeaderBtn = document.getElementById('add-header-btn');
    const headersContainer = document.getElementById('headers-container');
    let customHeaders = [];

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
            chrome.storage.local.get(['soapUrl', 'soapAction', 'soapRequest', 'lang', 'theme', 'requestHistory', 'panelWidth', 'customHeaders'], (result) => {
                if (result.soapUrl) urlInput.value = result.soapUrl;
                if (result.soapAction) actionInput.value = result.soapAction;
                if (result.soapRequest) requestInput.value = result.soapRequest;
                
                // 加载自定义 Headers
                if (result.customHeaders && Array.isArray(result.customHeaders)) {
                    customHeaders = result.customHeaders;
                    renderHeaders();
                }

                // 加载面板宽度
                if (result.panelWidth) {
                    requestPanel.style.width = result.panelWidth;
                }
                
                // 加载历史记录
                if (result.requestHistory && Array.isArray(result.requestHistory)) {
                    requestHistory = result.requestHistory;
                    updateHistoryDropdown();
                }
                
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

    // 快捷工具按钮事件处理
    formatReqBtn.addEventListener('click', () => {
        const val = requestInput.value.trim();
        if (val) {
            requestInput.value = formatXml(val);
        }
    });

    clearReqBtn.addEventListener('click', () => {
        requestInput.value = '';
    });

    copyResBtn.addEventListener('click', async () => {
        const val = responseEl.textContent;
        if (val && val !== '等待请求...' && val !== 'Waiting for request...') {
            try {
                await navigator.clipboard.writeText(val);
                showToast(langs[currentLang].copySuccess || '已复制', 'success');
            } catch (err) {
                console.error('复制失败:', err);
                showToast(langs[currentLang].copyFailed || '复制失败，请手动复制', 'error');
            }
        }
    });

    // 历史记录事件处理
    function updateHistoryDropdown() {
        // 保留第一个选项
        while (historySelect.options.length > 1) {
            historySelect.remove(1);
        }
        
        requestHistory.forEach((item, index) => {
            const option = document.createElement('option');
            option.value = index;
            
            // 优先使用自定义名称，否则使用URL截取
            let displayName = item.name;
            if (!displayName) {
                const urlPath = item.url.split('/').pop() || item.url;
                displayName = urlPath.length > 30 ? urlPath.substring(0, 30) + '...' : urlPath;
            }
            
            // 如果有状态信息，附加在后面
            let statusInfo = '';
            if (item.status) {
                statusInfo = ` [${item.status}]`;
            }
            
            option.textContent = `[${new Date(item.timestamp).toLocaleString()}] ${displayName}${statusInfo}`;
            historySelect.appendChild(option);
        });
    }

    saveHistoryBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        const action = actionInput.value.trim();
        const request = requestInput.value.trim();
        
        if (!url || !request) {
            showToast(langs[currentLang].enterUrlAlert, 'warning');
            return;
        }

        const customName = await showModal({
            title: langs[currentLang].historyLabel || '历史记录',
            message: langs[currentLang].promptHistoryName || '请输入历史记录名称（留空则使用默认名称）：',
            type: 'prompt',
            placeholder: '自定义名称...'
        });
        
        if (customName === null) return; // 用户点击了取消

        const newRecord = {
            name: customName.trim(),
            url,
            action,
            request,
            customHeaders: JSON.parse(JSON.stringify(customHeaders)), // 深拷贝当前headers
            timestamp: new Date().getTime(),
            status: statusEl.textContent !== '...' ? statusEl.textContent : '' // 保存当前界面的状态（如果有）
        };

        // 添加到头部，最多保存 20 条
        requestHistory.unshift(newRecord);
        if (requestHistory.length > 20) {
            requestHistory.pop();
        }

        updateHistoryDropdown();
        saveSettings();
        
        showToast(langs[currentLang].saveSuccess || '已保存', 'success');
    });

    historySelect.addEventListener('change', () => {
        const index = historySelect.value;
        if (index !== '') {
            const record = requestHistory[index];
            if (record) {
                urlInput.value = record.url;
                actionInput.value = record.action || '';
                requestInput.value = record.request;
                
                // 恢复自定义 Headers
                if (record.customHeaders && Array.isArray(record.customHeaders)) {
                    customHeaders = JSON.parse(JSON.stringify(record.customHeaders));
                    renderHeaders();
                } else {
                    customHeaders = [];
                    renderHeaders();
                }
            }
        }
    });

    clearHistoryBtn.addEventListener('click', async () => {
        const confirmed = await showModal({
            title: '确认清空',
            message: langs[currentLang].confirmClearHistory || '确定要清空所有历史记录吗？',
            type: 'confirm'
        });
        
        if (confirmed) {
            requestHistory = [];
            updateHistoryDropdown();
            saveSettings();
            historySelect.value = '';
            showToast('历史记录已清空', 'success');
        }
    });

    // 分栏拖拽事件处理
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        // 防止拖拽时选中文本
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        // 计算新的宽度百分比
        const containerWidth = document.body.clientWidth;
        // 限制左右面板最小宽度
        const minWidth = 300;
        
        let newWidth = e.clientX;
        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > containerWidth - minWidth) newWidth = containerWidth - minWidth;
        
        const widthPercentage = (newWidth / containerWidth) * 100;
        requestPanel.style.width = `${widthPercentage}%`;
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
            // 保存宽度设置到本地存储
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ panelWidth: requestPanel.style.width });
            }
        }
    });

    // Headers 管理
    function renderHeaders() {
        headersContainer.innerHTML = '';
        customHeaders.forEach((header, index) => {
            const row = document.createElement('div');
            row.className = 'header-row';
            
            const keyInput = document.createElement('input');
            keyInput.type = 'text';
            keyInput.placeholder = 'Key (e.g. Authorization)';
            keyInput.value = header.key;
            keyInput.addEventListener('input', (e) => {
                customHeaders[index].key = e.target.value;
                saveSettings();
            });

            const valInput = document.createElement('input');
            valInput.type = 'text';
            valInput.placeholder = 'Value';
            valInput.value = header.value;
            valInput.addEventListener('input', (e) => {
                customHeaders[index].value = e.target.value;
                saveSettings();
            });

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-header-btn';
            removeBtn.innerHTML = '✖';
            removeBtn.title = '移除';
            removeBtn.addEventListener('click', () => {
                customHeaders.splice(index, 1);
                renderHeaders();
                saveSettings();
            });

            row.appendChild(keyInput);
            row.appendChild(valInput);
            row.appendChild(removeBtn);
            headersContainer.appendChild(row);
        });
    }

    addHeaderBtn.addEventListener('click', () => {
        customHeaders.push({ key: '', value: '' });
        renderHeaders();
        saveSettings();
    });

    sendBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        const action = actionInput.value.trim();
        const request = requestInput.value.trim();

        if (!url) {
            showToast(langs[currentLang].enterUrlAlert, 'warning');
            return;
        }

        if (!request) {
            showToast(langs[currentLang].enterBodyAlert, 'warning');
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
            
            // 过滤并组装有效的自定义 Headers
            const activeHeaders = {};
            customHeaders.forEach(h => {
                if (h.key.trim() && h.value.trim()) {
                    activeHeaders[h.key.trim()] = h.value.trim();
                }
            });

            // 检查是否是扩展环境
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                // 扩展环境 - 通过background脚本发送请求
                response = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({
                        action: "sendSoapRequest",
                        url: url,
                        soapAction: action,
                        xmlBody: request,
                        customHeaders: activeHeaders
                    }, (result) => {
                        resolve(result);
                    });
                });
                
                handleResponse(response, startTime);
            } else {
                // 非扩展环境 - 直接发送请求 (可能会有跨域问题)
                sendDirectRequest(url, action, request, activeHeaders, startTime);
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
        
        // 更新自定义 Headers 标签
        document.getElementById('headers-label').textContent = l.headersLabel || '自定义 Headers:';
        addHeaderBtn.textContent = l.addHeaderBtn || '➕ 添加';

        // 更新历史记录相关标签
        document.getElementById('history-label').textContent = l.historyLabel || '历史记录:';
        historySelect.options[0].textContent = l.historyPlaceholder || '-- 选择历史记录 --';
        saveHistoryBtn.textContent = l.saveHistoryBtn || '💾 保存';
        clearHistoryBtn.textContent = l.clearHistoryBtn || '🗑️ 清空历史';

        // 更新表单标签
        document.getElementById('url-label').textContent = l.urlLabel;
        document.getElementById('action-label').textContent = l.actionLabel;
        document.getElementById('request-label').textContent = l.requestLabel;
        
        // 更新快捷按钮
        formatReqBtn.textContent = l.formatBtn;
        clearReqBtn.textContent = l.clearBtn;
        copyResBtn.textContent = l.copyBtn;
        
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
                    theme: currentTheme,
                    requestHistory: requestHistory,
                    customHeaders: customHeaders
                });
            } catch (error) {
                console.warn('无法保存数据到本地存储:', error);
            }
        }
    }
    
    // 直接发送SOAP请求（在非扩展环境中使用）
    function sendDirectRequest(url, soapAction, xmlBody, customHeaders, startTime) {
        // 使用XMLHttpRequest发送SOAP请求
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'text/xml;charset=UTF-8');
        
        // 如果提供了SOAPAction，添加到头部
        if (soapAction) {
            xhr.setRequestHeader('SOAPAction', soapAction);
        }

        // 添加自定义Headers
        if (customHeaders) {
            Object.keys(customHeaders).forEach(key => {
                xhr.setRequestHeader(key, customHeaders[key]);
            });
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
                    renderFormattedXml(responseText, responseEl);
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
    
    // 格式化并显示XML响应，带有语法高亮
    function renderFormattedXml(xmlString, targetElement) {
        const formatted = formatXml(xmlString);
        targetElement.innerHTML = highlightXml(formatted);
    }

    // 简单的XML语法高亮函数
    function highlightXml(xml) {
        // 先对特殊字符进行转义
        let escaped = xml
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // 高亮注释
        escaped = escaped.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="xml-comment">$1</span>');

        // 高亮标签和属性
        escaped = escaped.replace(/(&lt;\/?)([\w:\-\.]+)(\s+[^&gt;]+)?(&gt;)/g, function(match, start, tagName, attrs, end) {
            let highlightedAttrs = '';
            if (attrs) {
                // 高亮属性名和属性值
                highlightedAttrs = attrs.replace(/([\w:\-\.]+)\s*=\s*(&quot;[^&quot;]*&quot;|&#39;[^&#39;]*&#39;)/g, 
                    '<span class="xml-attr">$1</span>=<span class="xml-val">$2</span>');
            }
            return `${start}<span class="xml-tag">${tagName}</span>${highlightedAttrs}${end}`;
        });

        // 用 span 包裹非标签内容作为普通文本（可选，主要为了方便整体控制）
        return `<span class="xml-text">${escaped}</span>`;
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
                renderFormattedXml(response.responseText, responseEl);
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