export async function copyTextToClipboard(text: string): Promise<void> {
  const normalizedText = String(text ?? '')

  if (!normalizedText) {
    throw new Error('没有可复制的内容')
  }

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(normalizedText)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = normalizedText
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'

  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  try {
    const copied = document.execCommand('copy')
    if (!copied) {
      throw new Error('浏览器拒绝复制到剪切板')
    }
  } finally {
    document.body.removeChild(textarea)
  }
}
