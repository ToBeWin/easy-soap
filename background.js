// 安装扩展时输出调试信息
console.log('SOAP接口测试工具: 后台脚本已加载');

// 当用户点击扩展图标时，在新标签页中打开SOAP测试工具
chrome.action.onClicked.addListener(() => {
  console.log('用户点击了扩展图标，正在打开新标签页...');
  try {
    chrome.tabs.create({ url: 'index.html' }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('创建标签页时出错:', chrome.runtime.lastError);
      } else {
        console.log('成功创建新标签页，ID:', tab.id);
      }
    });
  } catch (error) {
    console.error('打开标签页时出现异常:', error);
  }
});

// 监听来自popup或index页面的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);
  
  if (request.action === "sendSoapRequest") {
    console.log('准备发送SOAP请求到:', request.url);
    const { url, soapAction, xmlBody } = request;
    
    // 使用fetch API发送SOAP请求
    try {
      console.log('正在使用fetch API发送SOAP请求...');
      
      const headers = {
        'Content-Type': 'text/xml;charset=UTF-8'
      };
      
      // 如果提供了SOAPAction，添加到头部
      if (soapAction) {
        headers['SOAPAction'] = soapAction;
        console.log('添加SOAPAction:', soapAction);
      }
      
      // 发送请求
      fetch(url, {
        method: 'POST',
        headers: headers,
        body: xmlBody
      })
      .then(response => {
        console.log('收到响应, 状态码:', response.status);
        
        // 获取响应文本
        return response.text().then(text => {
          return {
            response: response,
            text: text
          };
        });
      })
      .then(({ response, text }) => {
        // 构建返回对象
        const result = {
          status: response.status,
          statusText: response.statusText || (response.ok ? 'OK' : 'Error'),
          responseText: text,
          success: response.ok
        };
        
        // 发送结果回请求页面
        try {
          sendResponse(result);
          console.log('响应已发送回请求页面');
        } catch (error) {
          console.error('发送响应时出错:', error);
        }
      })
      .catch(error => {
        console.error('fetch请求失败:', error);
        
        // 发送错误回请求页面
        try {
          sendResponse({
            status: 0,
            statusText: 'Connection Error',
            responseText: `请求失败，可能是网络问题或URL无效: ${error.message}`,
            success: false,
            errorDetails: error.toString()
          });
          console.log('错误响应已发送回请求页面');
        } catch (sendError) {
          console.error('发送错误响应时出错:', sendError);
        }
      });
      
    } catch (error) {
      console.error('创建或发送请求时出错:', error);
      try {
        sendResponse({
          status: 0,
          statusText: 'Error',
          responseText: `发送请求时出错: ${error.message}`,
          success: false
        });
      } catch (sendError) {
        console.error('发送错误响应时出错:', sendError);
      }
    }
    
    // 返回true，表示我们将异步发送响应
    return true;
  }
}); 