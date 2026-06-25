// ======================== 配置 ========================
const API_URL = 'http://localhost:3000/api/chat';

// ======================== 全局状态 ========================
let isGenerating = false;
let currentImageBase64 = '';
let currentImageDataUrl = '';
let API_KEY = '';
let streamReader = null;

// ======================== DOM 元素 ========================
const container = document.querySelector('.container');
const welcomeSection = document.getElementById('welcome-section');
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const stopBtn = document.getElementById('stop-btn');
const themeToggle = document.getElementById('theme-toggle');
const clearBtn = document.getElementById('clear-btn');
const uploadBtn = document.getElementById('upload-btn');
const imagePreviewInline = document.getElementById('image-preview-inline');
const previewImg = document.getElementById('preview-img');
const cards = document.querySelectorAll('.card');

const modal = document.getElementById('image-modal');
const modalImg = document.getElementById('modal-img');
const modalClose = document.querySelector('.modal-close');
const modalRemoveBtn = document.getElementById('modal-remove-btn');

// ======================== 辅助函数 ========================
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function addMessage(role, content, isHTML = false) {
  const wrapper = document.createElement('div');
  wrapper.className = `chat-message ${role}-message`;

  if (role === 'ai') {
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    const avatarImg = document.createElement('img');
    avatarImg.src = 'assets/avatar.png';
    avatarImg.alt = 'AI头像';
    avatarImg.style.width = '100%';
    avatarImg.style.height = '100%';
    avatarImg.style.objectFit = 'cover';
    avatarImg.style.borderRadius = '50%';
    avatarImg.onerror = function () {
      this.style.display = 'none';
      avatar.textContent = 'AI';
      avatar.style.backgroundColor = '#8b5cf6';
      avatar.style.display = 'flex';
      avatar.style.alignItems = 'center';
      avatar.style.justifyContent = 'center';
      avatar.style.color = 'white';
      avatar.style.fontSize = '16px';
    };
    avatar.appendChild(avatarImg);
    wrapper.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = 'message-content';
  if (isHTML) {
    bubble.innerHTML = content;
  } else {
    bubble.textContent = content;
  }
  wrapper.appendChild(bubble);

  chatContainer.appendChild(wrapper);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return { wrapper, contentDiv: bubble };
}

function addCopyButtons() {
  document.querySelectorAll('pre code').forEach((block) => {
    const pre = block.parentElement;
    if (pre.querySelector('.copy-code-btn')) return;
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-code-btn';
    copyBtn.textContent = '复制';
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(block.textContent);
        copyBtn.textContent = '已复制!';
        setTimeout(() => {
          copyBtn.textContent = '复制';
        }, 2000);
      } catch (err) {
        copyBtn.textContent = '复制失败';
      }
    });
    pre.style.position = 'relative';
    pre.appendChild(copyBtn);
  });
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block);
  });
}

function compressImage(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(blob);
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showImagePreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    currentImageDataUrl = e.target.result;
    previewImg.src = currentImageDataUrl;
    uploadBtn.style.display = 'none';
    imagePreviewInline.style.display = 'block';
    updateSendButton();
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  currentImageBase64 = '';
  currentImageDataUrl = '';
  uploadBtn.style.display = 'flex';
  imagePreviewInline.style.display = 'none';
  previewImg.src = '';
  updateSendButton();
  modal.style.display = 'none';
}

async function handleUpload() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      currentImageBase64 = base64;
      showImagePreview(file);
    } catch (err) {
      console.error('图片处理失败:', err);
      alert('图片处理失败');
    }
  });
  input.click();
}

function autoResize() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
  userInput.style.overflowY = 'auto';
}

function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if ((userInput.value.trim() || currentImageBase64) && !isGenerating) {
      sendMessage();
    }
  }
}

function showApiKeyInput() {
  const apiKey = prompt('请输入阿里云API Key：', '');
  if (apiKey) {
    API_KEY = apiKey;
    try {
      localStorage.setItem('LINGXI_API_KEY', apiKey);
      alert('✅ API Key已保存');
    } catch (e) { }
  }
}

function updateSendButton() {
  const hasContent = userInput.value.trim() !== '' || currentImageBase64 !== '';
  if (hasContent && !isGenerating) {
    sendBtn.style.display = 'flex';
    stopBtn.style.display = 'none';
  } else if (!hasContent && !isGenerating) {
    sendBtn.style.display = 'none';
    stopBtn.style.display = 'none';
  }
}

async function sendMessage() {
  const userMessage = userInput.value.trim();
  if ((!userMessage && !currentImageBase64) || isGenerating) return;
  if (!API_KEY) {
    showApiKeyInput();
    return;
  }

  // 切换到聊天模式：显示聊天容器，隐藏欢迎区，容器改为顶部对齐
  welcomeSection.style.display = 'none';
  chatContainer.style.display = 'flex';
  container.classList.add('chat-mode');

  const imageToSend = currentImageBase64;

  if (imageToSend) {
    const imgUrl = `data:image/jpeg;base64,${imageToSend}`;
    const imgHtml = `<img src="${imgUrl}" style="max-width: 200px; max-height: 200px; border-radius: 8px; display: block;">`;
    addMessage('user', imgHtml, true);
  }

  if (userMessage) {
    addMessage('user', escapeHtml(userMessage), false);
  }

  userInput.value = '';
  autoResize();
  removeImage();

  isGenerating = true;
  sendBtn.style.display = 'none';
  stopBtn.style.display = 'flex';

  const { contentDiv: loadingDiv } = addMessage('ai', '思考中...', false);
  let fullText = '';
  let lastRenderedText = '';
  let firstContentReceived = false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      body: JSON.stringify({
        message: userMessage,
        apiKey: API_KEY,
        imageBase64: imageToSend || ''
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`请求失败: ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    streamReader = reader;

    while (isGenerating) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (!trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.substring(5).trim();
        if (dataStr === '[DONE]') continue;

        try {
          const data = JSON.parse(dataStr);
          if (data.error) {
            loadingDiv.innerHTML = `<div class="error-message">❌ 错误: ${escapeHtml(data.error)}</div>`;
            isGenerating = false;
            return;
          }

          if (data.content) {
            if (!firstContentReceived) {
              firstContentReceived = true;
              loadingDiv.innerHTML = '';
              fullText = '';
            }
            fullText += data.content;
            if (fullText !== lastRenderedText) {
              loadingDiv.innerHTML = marked.parse(fullText);
              addCopyButtons();
              lastRenderedText = fullText;
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          }
        } catch (e) {
          console.warn('解析流式数据失败:', e);
        }
      }
    }
  } catch (error) {
    console.error('请求失败:', error);
    if (error.name === 'AbortError') {
      loadingDiv.innerHTML = '<div class="error-message">⏱️ 请求超时，请重试</div>';
    } else {
      loadingDiv.innerHTML = `<div class="error-message">❌ 错误: ${escapeHtml(error.message)}</div>`;
    }
  } finally {
    isGenerating = false;
    updateSendButton();
    streamReader = null;
    if (!firstContentReceived && loadingDiv.innerHTML === '思考中...') {
      loadingDiv.innerHTML = '<div class="error-message">未收到有效响应，请检查网络或API Key</div>';
    }
  }
}

function stopGeneration() {
  if (!isGenerating) return;
  isGenerating = false;
  if (streamReader) {
    streamReader.cancel().catch(e => console.warn(e));
    streamReader = null;
  }
  updateSendButton();
}

function toggleTheme() {
  const currentTheme = document.body.className;
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.body.className = newTheme;
  themeToggle.textContent = newTheme === 'light' ? '🌙' : '☀️';
  try { localStorage.setItem('theme', newTheme); } catch (e) { }
}

// ======================== 修复后的 clearChat ========================
function clearChat() {
  // 清空聊天容器内容
  chatContainer.innerHTML = '';
  // 恢复欢迎区域显示（恢复为默认块级布局），隐藏聊天区域
  welcomeSection.style.display = '';      // 恢复默认 block，而非 flex
  chatContainer.style.display = 'none';
  // 移除图片预览
  removeImage();
  // 停止任何生成
  stopGeneration();
  // 移除聊天模式样式，恢复容器居中
  container.classList.remove('chat-mode');
  // 清除可能残留的内联样式，确保容器垂直居中
  container.style.justifyContent = '';
  container.style.alignItems = '';
  // 重置滚动位置到顶部
  window.scrollTo(0, 0);
  // 强制浏览器重新计算布局
  requestAnimationFrame(() => {
    // 空操作，触发样式重计算
    const _ = container.offsetHeight;
  });
}
// ======================== 结束修复 ========================

function openModal() {
  if (currentImageDataUrl) {
    modalImg.src = currentImageDataUrl;
    modal.style.display = 'flex';
  }
}

function closeModal() {
  modal.style.display = 'none';
}

function init() {
  try {
    API_KEY = localStorage.getItem('LINGXI_API_KEY') || '';
    if (!API_KEY) showApiKeyInput();
  } catch (e) { showApiKeyInput(); }

  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.className = savedTheme;
  themeToggle.textContent = savedTheme === 'light' ? '🌙' : '☀️';

  userInput.addEventListener('input', () => {
    autoResize();
    updateSendButton();
  });
  userInput.addEventListener('keydown', handleKeyDown);

  sendBtn.addEventListener('click', sendMessage);
  stopBtn.addEventListener('click', stopGeneration);
  themeToggle.addEventListener('click', toggleTheme);
  clearBtn.addEventListener('click', clearChat);
  uploadBtn.addEventListener('click', handleUpload);

  imagePreviewInline.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal();
  });

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  modalRemoveBtn.addEventListener('click', () => {
    removeImage();
    closeModal();
  });

  cards.forEach(card => {
    card.addEventListener('click', () => {
      userInput.value = card.dataset.query;
      autoResize();
      updateSendButton();
      sendMessage();
    });
  });

  marked.setOptions({
    highlight: (code, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
  });

  updateSendButton();
}

document.addEventListener('DOMContentLoaded', init);